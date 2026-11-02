import json
import os
import base64
import uuid
import re
import psycopg2
import boto3
import authz
from typing import Dict, Any

MAX_FILE = 4 * 1024 * 1024
COLS = 'id, channel, sender_id, sender_name, sender_role, recipient_id, recipient_name, text, file_url, file_name, file_size, created_at'
VISIBLE = "archived = FALSE AND (channel = 'general' OR sender_id = %s OR recipient_id = %s)"


def msg_row(r, my_id) -> Dict[str, Any]:
    return {
        'id': r[0], 'channel': r[1], 'sender_id': r[2], 'sender_name': r[3], 'sender_role': r[4],
        'recipient_id': r[5], 'recipient_name': r[6], 'text': r[7],
        'file_url': r[8], 'file_name': r[9], 'file_size': r[10],
        'created_at': r[11].strftime('%Y-%m-%d %H:%M:%S'), 'is_mine': r[2] == my_id
    }


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    API чата для десктопного приложения. Авторизация: заголовки X-User-Id (логин) и X-Auth-Token (пароль).
    GET ?action=check&after_id=N — лёгкая проверка новых сообщений (количество, последний id, отправители)
    GET ?action=messages&after_id=N&limit=100 — получить сообщения новее N (с вложениями)
    GET ?action=history&before_id=N&limit=50 — более старые сообщения
    GET ?action=users — список собеседников и данные о себе
    POST {action: send, text, channel: general|private, recipient_id, file: {name, content(base64), type}} — отправить
    '''
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return authz.preflight('GET, POST, OPTIONS')
    if method not in ('GET', 'POST'):
        return authz.resp(405, {'error': 'Method not allowed'})

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        cur = conn.cursor()
        user, err = authz.authenticate(conn, event)
        if err:
            return err
        if not user['admin']:
            return authz.resp(403, {'error': 'Нет доступа к чату'})
        my_id, my_name = user['id'], user['name']
        my_role = 'operator' if user['operator'] else 'admin'
        me = {'id': my_id, 'name': my_name, 'role': my_role}
        params = event.get('queryStringParameters') or {}
        action = params.get('action') or ''

        if method == 'GET' and action == 'users':
            if my_role == 'operator':
                cur.execute("SELECT id, name, operator FROM clients WHERE admin = TRUE AND (operator IS NOT TRUE) ORDER BY name")
            else:
                cur.execute("SELECT id, name, operator FROM clients WHERE admin = TRUE AND id <> %s ORDER BY operator, name", (my_id,))
            users = [{'id': r[0], 'name': r[1], 'role': 'operator' if r[2] else 'admin'} for r in cur.fetchall()]
            return authz.resp(200, {'me': me, 'users': users})

        if method == 'GET' and action == 'check':
            after_id = int(params.get('after_id') or 0)
            cur.execute(f"""
                SELECT COUNT(*), COALESCE(MAX(id), %s) FROM chat_messages
                WHERE {VISIBLE} AND id > %s AND sender_id <> %s
            """, (after_id, my_id, my_id, after_id, my_id))
            cnt, last_id = cur.fetchone()
            cur.execute(f"""
                SELECT sender_name, channel, COUNT(*) FROM chat_messages
                WHERE {VISIBLE} AND id > %s AND sender_id <> %s
                GROUP BY sender_name, channel ORDER BY MAX(id) DESC LIMIT 10
            """, (my_id, my_id, after_id, my_id))
            senders = [{'sender_name': r[0], 'channel': r[1], 'count': r[2]} for r in cur.fetchall()]
            cur.execute(f"""
                SELECT COUNT(*) FROM chat_messages
                WHERE {VISIBLE} AND id > %s AND sender_id <> %s AND channel = 'private'
            """, (my_id, my_id, after_id, my_id))
            private_cnt = cur.fetchone()[0]
            return authz.resp(200, {'new_count': cnt, 'private_count': private_cnt, 'last_id': last_id, 'senders': senders, 'me': me})

        if method == 'GET' and action == 'messages':
            after_id = int(params.get('after_id') or 0)
            limit = max(1, min(int(params.get('limit') or 100), 300))
            cur.execute(f"""
                SELECT {COLS} FROM chat_messages WHERE {VISIBLE} AND id > %s
                ORDER BY id ASC LIMIT %s
            """, (my_id, my_id, after_id, limit))
            rows = [msg_row(r, my_id) for r in cur.fetchall()]
            return authz.resp(200, {'messages': rows, 'last_id': rows[-1]['id'] if rows else after_id, 'me': me})

        if method == 'GET' and action == 'history':
            before_id = int(params.get('before_id') or 0)
            limit = max(1, min(int(params.get('limit') or 50), 200))
            cond = "AND id < %s" if before_id else ""
            args = [my_id, my_id] + ([before_id] if before_id else []) + [limit]
            cur.execute(f"""
                SELECT {COLS} FROM chat_messages WHERE {VISIBLE} {cond}
                ORDER BY id DESC LIMIT %s
            """, args)
            rows = [msg_row(r, my_id) for r in cur.fetchall()]
            rows.reverse()
            return authz.resp(200, {'messages': rows, 'has_more': len(rows) == limit, 'me': me})

        if method == 'POST':
            body = json.loads(event.get('body') or '{}')
            if (body.get('action') or 'send') != 'send':
                return authz.resp(400, {'error': 'Неизвестное действие'})
            text = (body.get('text') or '').strip()[:4000]
            channel = body.get('channel') or 'general'
            file = body.get('file')
            if not text and not file:
                return authz.resp(400, {'error': 'Пустое сообщение'})

            recipient_id = None
            recipient_name = None
            if channel == 'private':
                recipient_id = int(body.get('recipient_id') or 0)
                cur.execute("SELECT id, name, admin, operator FROM clients WHERE id = %s", (recipient_id,))
                rec = cur.fetchone()
                if not rec or not rec[2]:
                    return authz.resp(400, {'error': 'Получатель не найден'})
                if my_role == 'operator' and rec[3]:
                    return authz.resp(403, {'error': 'Операторы могут писать лично только администраторам'})
                recipient_name = rec[1]
            else:
                channel = 'general'

            file_url = file_name = file_key = None
            file_size = None
            if file:
                raw = base64.b64decode(file.get('content') or '')
                if not raw:
                    return authz.resp(400, {'error': 'Пустой файл'})
                if len(raw) > MAX_FILE:
                    return authz.resp(400, {'error': 'Файл больше 4 МБ'})
                file_name = re.sub(r'[^\w.\- ()а-яА-ЯёЁ]', '_', (file.get('name') or 'file'))[:150]
                ext = file_name.rsplit('.', 1)[-1][:10] if '.' in file_name else 'bin'
                file_key = f"chat/{uuid.uuid4().hex}.{re.sub(r'[^A-Za-z0-9]', '', ext) or 'bin'}"
                s3 = boto3.client('s3', endpoint_url='https://bucket.poehali.dev',
                                  aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                                  aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'])
                s3.put_object(Bucket='files', Key=file_key, Body=raw,
                              ContentType=file.get('type') or 'application/octet-stream')
                file_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{file_key}"
                file_size = len(raw)

            cur.execute(f"""
                INSERT INTO chat_messages
                (channel, sender_id, sender_name, sender_role, recipient_id, recipient_name, text, file_url, file_name, file_key, file_size)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING {COLS}
            """, (channel, my_id, my_name, my_role, recipient_id, recipient_name, text, file_url, file_name, file_key, file_size))
            row = cur.fetchone()
            conn.commit()
            return authz.resp(200, {'message': msg_row(row, my_id)})

        return authz.resp(400, {'error': 'Неизвестное действие'})
    finally:
        conn.close()
