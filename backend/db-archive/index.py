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


def s3_client():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )


def item(r):
    return {
        'id': r[0], 'file_name': r[1], 'size_bytes': int(r[2]), 'tables_count': r[3],
        'rows_count': r[4], 'created_by': r[5], 'created_at': r[6].strftime('%Y-%m-%d %H:%M:%S'),
    }


COLS = 'id, file_name, size_bytes, tables_count, rows_count, created_by, created_at'


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
            cur.execute("SELECT file_key, file_name FROM db_archives WHERE id = %s", (int(params['download']),))
            row = cur.fetchone()
            if not row:
                return authz.resp(404, {'error': 'Архив не найден'})
            data = s3_client().get_object(Bucket='files', Key=row[0])['Body'].read()
            return authz.resp(200, {'file_name': row[1], 'content_base64': base64.b64encode(data).decode()})

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
            buf = io.BytesIO()
            total = 0
            with pyzipper.AESZipFile(buf, 'w', compression=pyzipper.ZIP_DEFLATED, encryption=pyzipper.WZ_AES) as zf:
                zf.setpassword(zip_password.encode('utf-8'))
                zf.setencryption(pyzipper.WZ_AES, nbits=256)
                for name in names:
                    cur.execute('SELECT * FROM "%s"."%s"' % (SCHEMA, name))
                    cols = [d[0] for d in cur.description]
                    out = io.StringIO()
                    writer = csv.writer(out, delimiter=';', quoting=csv.QUOTE_MINIMAL)
                    writer.writerow(cols)
                    for r in cur.fetchall():
                        writer.writerow(['' if v is None else v for v in r])
                        total += 1
                    zf.writestr('%s.csv' % name, ('\ufeff' + out.getvalue()).encode('utf-8'))
            packed = buf.getvalue()
            file_name = 'azs_db_%s.zip' % stamp
            file_key = 'db-archives/%s_%s' % (os.urandom(8).hex(), file_name)
            s3_client().put_object(Bucket='files', Key=file_key, Body=packed, ContentType='application/zip')
            cur.execute(
                "INSERT INTO db_archives (file_key, file_name, size_bytes, tables_count, rows_count, created_by) VALUES (%s, %s, %s, %s, %s, %s) RETURNING " + COLS,
                (file_key, file_name, len(packed), len(names), total, user['login']),
            )
            created = item(cur.fetchone())
            conn.commit()
            return authz.resp(201, {'archive': created})

        if method == 'DELETE':
            if params.get('older_than_days'):
                days = max(0, int(params['older_than_days']))
                cur.execute(
                    "SELECT id, file_key FROM db_archives WHERE created_at < NOW() - (%s * INTERVAL '1 day')",
                    (days,),
                )
            elif params.get('id'):
                cur.execute("SELECT id, file_key FROM db_archives WHERE id = %s", (int(params['id']),))
            else:
                return authz.resp(400, {'error': 'Не указано, что удалять'})
            rows = cur.fetchall()
            if rows:
                s3 = s3_client()
                for _, key in rows:
                    s3.delete_object(Bucket='files', Key=key)
                cur.execute("DELETE FROM db_archives WHERE id = ANY(%s)", ([r[0] for r in rows],))
                conn.commit()
            return authz.resp(200, {'success': True, 'deleted': len(rows)})

        return authz.resp(405, {'error': 'Метод не поддерживается'})
    finally:
        conn.close()
