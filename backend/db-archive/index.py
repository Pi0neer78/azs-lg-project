import base64
import csv
import io
import json
import os
from datetime import datetime, timezone, timedelta

import boto3
import psycopg2
import pyzipper

import authz

MSK = timezone(timedelta(hours=3))
SCHEMA = 't_p39946729_azs_lg_project'
SKIP_TABLES = ('auth_attempts', 'db_archives')
MAX_PART_BYTES = 8 * 1024 * 1024
PAGE_ROWS = 2000


def s3_client():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )


def parse_parts(raw, fallback_key, fallback_name):
    if raw:
        return json.loads(raw)
    return [{'key': fallback_key, 'name': fallback_name}]


def item(r):
    parts = parse_parts(r[7], r[8], r[1])
    return {
        'id': r[0], 'file_name': r[1], 'size_bytes': int(r[2]), 'tables_count': r[3],
        'rows_count': r[4], 'created_by': r[5], 'created_at': r[6].strftime('%Y-%m-%d %H:%M:%S'),
        'parts': [p['name'] for p in parts],
    }


COLS = 'id, file_name, size_bytes, tables_count, rows_count, created_by, created_at, parts, file_key'


class PartWriter:
    def __init__(self, password, stamp):
        self.password = password.encode('utf-8')
        self.stamp = stamp
        self.parts = []
        self.buf = None
        self.zf = None
        self.raw_size = 0

    def _open(self):
        self.buf = io.BytesIO()
        self.zf = pyzipper.AESZipFile(self.buf, 'w', compression=pyzipper.ZIP_DEFLATED, encryption=pyzipper.WZ_AES)
        self.zf.setpassword(self.password)
        self.zf.setencryption(pyzipper.WZ_AES, nbits=256)
        self.raw_size = 0

    def _close(self):
        if self.zf is None:
            return
        self.zf.close()
        self.parts.append(self.buf.getvalue())
        self.zf = None
        self.buf = None

    def add(self, filename, text):
        data = ('\ufeff' + text).encode('utf-8')
        if self.zf is not None and self.raw_size + len(data) > MAX_PART_BYTES:
            self._close()
        if self.zf is None:
            self._open()
        self.zf.writestr(filename, data)
        self.raw_size += len(data)

    def finish(self):
        self._close()
        return self.parts


def handler(event: dict, context) -> dict:
    """Архивы базы данных: создать, список, скачать, удалить, удалить старые. Только для администратора."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return authz.preflight('GET, POST, DELETE, OPTIONS')

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        user, err = authz.authenticate(conn, event)
        if err:
            return err
        if not user['admin'] or user['operator']:
            return authz.forbidden()
        cur = conn.cursor()
        params = event.get('queryStringParameters') or {}
        zip_password = os.environ.get('ARCHIVE_PASSWORD') or ''

        if method == 'GET' and params.get('download'):
            cur.execute("SELECT file_key, file_name, parts FROM db_archives WHERE id = %s", (int(params['download']),))
            row = cur.fetchone()
            if not row:
                return authz.resp(404, {'error': 'Архив не найден'})
            parts = parse_parts(row[2], row[0], row[1])
            idx = int(params.get('part') or 0)
            if idx < 0 or idx >= len(parts):
                return authz.resp(404, {'error': 'Часть архива не найдена'})
            data = s3_client().get_object(Bucket='files', Key=parts[idx]['key'])['Body'].read()
            return authz.resp(200, {'file_name': parts[idx]['name'], 'content_base64': base64.b64encode(data).decode()})

        if method == 'GET':
            cur.execute("SELECT %s FROM db_archives ORDER BY id DESC" % COLS)
            archives = [item(r) for r in cur.fetchall()]
            cur.execute(
                "SELECT relname, n_live_tup FROM pg_stat_user_tables WHERE schemaname = %s ORDER BY relname",
                (SCHEMA,),
            )
            tables = [{'name': r[0], 'rows': int(r[1])} for r in cur.fetchall() if r[0] not in SKIP_TABLES]
            return authz.resp(200, {'archives': archives, 'tables': tables})

        if method == 'POST':
            if not zip_password:
                return authz.resp(500, {'error': 'Не задан пароль для архивов (секрет ARCHIVE_PASSWORD)'})
            cur.execute(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = %s AND table_type = 'BASE TABLE' ORDER BY table_name",
                (SCHEMA,),
            )
            names = [r[0] for r in cur.fetchall() if r[0] not in SKIP_TABLES]
            stamp = datetime.now(MSK).strftime('%Y-%m-%d_%H-%M-%S')
            writer = PartWriter(zip_password, stamp)
            total = 0
            for name in names:
                cols = None
                chunk_no = 1
                offset = 0
                out = io.StringIO()
                writer_csv = None
                while True:
                    cur.execute('SELECT * FROM "%s"."%s" ORDER BY 1 LIMIT %d OFFSET %d' % (SCHEMA, name, PAGE_ROWS, offset))
                    if cols is None:
                        cols = [d[0] for d in cur.description]
                        writer_csv = csv.writer(out, delimiter=';', quoting=csv.QUOTE_MINIMAL)
                        writer_csv.writerow(cols)
                    rows = cur.fetchall()
                    for r in rows:
                        writer_csv.writerow(['' if v is None else v for v in r])
                    total += len(rows)
                    offset += PAGE_ROWS
                    last = len(rows) < PAGE_ROWS
                    if out.tell() > MAX_PART_BYTES // 2 or last:
                        fname = '%s.csv' % name if chunk_no == 1 and last else '%s_%d.csv' % (name, chunk_no)
                        writer.add(fname, out.getvalue())
                        chunk_no += 1
                        out = io.StringIO()
                        writer_csv = csv.writer(out, delimiter=';', quoting=csv.QUOTE_MINIMAL)
                        writer_csv.writerow(cols)
                    if last:
                        break
            blobs = writer.finish()
            base = 'azs_db_%s' % stamp
            prefix = 'db-archives/%s' % os.urandom(8).hex()
            s3 = s3_client()
            parts = []
            for i, blob in enumerate(blobs, 1):
                pname = '%s.zip' % base if len(blobs) == 1 else '%s_часть%d_из_%d.zip' % (base, i, len(blobs))
                pkey = '%s/%s' % (prefix, 'part%d.zip' % i)
                s3.put_object(Bucket='files', Key=pkey, Body=blob, ContentType='application/zip')
                parts.append({'key': pkey, 'name': pname})
            cur.execute(
                "INSERT INTO db_archives (file_key, file_name, size_bytes, tables_count, rows_count, created_by, parts) VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING " + COLS,
                (parts[0]['key'], base, sum(len(b) for b in blobs), len(names), total, user['login'], json.dumps(parts, ensure_ascii=False)),
            )
            created = item(cur.fetchone())
            conn.commit()
            return authz.resp(201, {'archive': created})

        if method == 'DELETE':
            if params.get('older_than_days'):
                days = max(0, int(params['older_than_days']))
                cur.execute(
                    "SELECT id, file_key, parts, file_name FROM db_archives WHERE created_at < NOW() - (%s * INTERVAL '1 day')",
                    (days,),
                )
            elif params.get('id'):
                cur.execute("SELECT id, file_key, parts, file_name FROM db_archives WHERE id = %s", (int(params['id']),))
            else:
                return authz.resp(400, {'error': 'Не указано, что удалять'})
            rows = cur.fetchall()
            if rows:
                s3 = s3_client()
                for r in rows:
                    for p in parse_parts(r[2], r[1], r[3]):
                        s3.delete_object(Bucket='files', Key=p['key'])
                cur.execute("DELETE FROM db_archives WHERE id = ANY(%s)", ([r[0] for r in rows],))
                conn.commit()
            return authz.resp(200, {'success': True, 'deleted': len(rows)})

        return authz.resp(405, {'error': 'Метод не поддерживается'})
    finally:
        conn.close()
