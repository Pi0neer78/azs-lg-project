import json
import authz
import os
import base64
import uuid
import re
import psycopg2
import boto3
from typing import Dict, Any

H = {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}
MAX_FILE = 4 * 1024 * 1024


def resp(code: int, data: Any) -> Dict[str, Any]:
    return {'statusCode': code, 'headers': H, 'body': json.dumps(data, ensure_ascii=False, default=str)}


def msg_row(r) -> Dict[str, Any]:
    return {
        'id': r[0], 'channel': r[1], 'sender_id': r[2], 'sender_name': r[3], 'sender_role': r[4],
        'recipient_id': r[5], 'recipient_name': r[6], 'text': r[7], 'file_url': r[8],
        'file_name': r[9], 'file_size': r[10], 'created_at': r[11].strftime('%Y-%m-%d %H:%M:%S')
    }


COLS = 'id, channel, sender_id, sender_name, sender_role, recipient_id, recipient_name, text, file_url, file_name, file_size, created_at'


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Чат операторов и администраторов.
    GET ?action=users — список собеседников
    GET ?action=messages&after_id=N — новые сообщения (общий чат + личные)
    POST {text, channel: general|private, recipient_id, file:{name, content}} — отправить сообщение
    Авторизация: заголовки X-User-Id (логин) и X-Auth-Token (пароль)
    '''
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': authz.ALLOW_HEADERS,
            'Access-Control-Max-Age': '86400'}, 'body': ''}

    headers = {k.lower(): v for k, v in (event.get('headers') or {}).items()}
    login = (headers.get('x-user-id') or '').strip()
    password = (headers.get('x-auth-token') or '').strip()
    if not login or not password:
        return resp(401, {'error': 'Требуется авторизация'})

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        cur = conn.cursor()
        ip = str(((event.get('requestContext') or {}).get('identity') or {}).get('sourceIp') or '')[:64]
        user, auth_err = authz.verify(conn, login, password, ip)
        if auth_err:
            return auth_err
        if not user['admin']:
            return resp(403, {'error': 'Нет доступа к чату'})
        my_id, my_name, is_operator = user['id'], user['name'], user['operator']
        my_role = 'operator' if is_operator else 'admin'

        params = event.get('queryStringParameters') or {}

        if method == 'GET' and params.get('action') == 'users':
            if my_role == 'operator':
                cur.execute("SELECT id, name, operator FROM clients WHERE admin = TRUE AND (operator IS NOT TRUE) ORDER BY name")
            else:
                cur.execute("SELECT id, name, operator FROM clients WHERE admin = TRUE AND id <> %s ORDER BY operator, name", (my_id,))
            users = [{'id': r[0], 'name': r[1], 'role': 'operator' if r[2] else 'admin'} for r in cur.fetchall()]
            return resp(200, {'me': {'id': my_id, 'name': my_name, 'role': my_role}, 'users': users})

        if method == 'GET':
            after_id = int(params.get('after_id') or 0)
            cur.execute(f"""
                SELECT {COLS} FROM chat_messages
                WHERE archived = FALSE AND id > %s
                AND (channel = 'general' OR sender_id = %s OR recipient_id = %s)
                ORDER BY id DESC LIMIT 300
            """, (after_id, my_id, my_id))
            rows = [msg_row(r) for r in cur.fetchall()]
            rows.reverse()
            return resp(200, {'messages': rows, 'me': {'id': my_id, 'name': my_name, 'role': my_role}})

        if method == 'POST':
            body = json.loads(event.get('body') or '{}')
            text = (body.get('text') or '').strip()[:4000]
            channel = body.get('channel') or 'general'
            file = body.get('file')
            if not text and not file:
                return resp(400, {'error': 'Пустое сообщение'})

            recipient_id = None
            recipient_name = None
            if channel == 'private':
                recipient_id = int(body.get('recipient_id') or 0)
                cur.execute("SELECT id, name, admin, operator FROM clients WHERE id = %s", (recipient_id,))
                rec = cur.fetchone()
                if not rec or not rec[2]:
                    return resp(400, {'error': 'Получатель не найден'})
                if my_role == 'operator' and rec[3]:
                    return resp(403, {'error': 'Операторы могут писать лично только администраторам'})
                recipient_name = rec[1]
            else:
                channel = 'general'

            file_url = file_name = file_key = None
            file_size = None
            if file:
                raw = base64.b64decode(file.get('content') or '')
                if len(raw) > MAX_FILE:
                    return resp(400, {'error': 'Файл больше 4 МБ'})
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
            return resp(200, {'message': msg_row(row)})

        return resp(405, {'error': 'Method not allowed'})
    finally:
        conn.close()
