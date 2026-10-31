import json
import os
import hmac
import psycopg2
import boto3
from typing import Dict, Any

H = {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}


def resp(code: int, data: Any) -> Dict[str, Any]:
    return {'statusCode': code, 'headers': H, 'body': json.dumps(data, ensure_ascii=False, default=str)}


def s3_client():
    return boto3.client('s3', endpoint_url='https://bucket.poehali.dev',
                        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'])


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Управление чатами: просмотр, архивирование, очистка сообщений и вложений.
    Авторизация: X-User-Id (логин) и X-Auth-Token (пароль) из секретов CHAT_ADMIN_LOGIN / CHAT_ADMIN_PASSWORD.
    GET ?view=active|archive&channel=all|general|private — список сообщений
    POST {action: login|archive|unarchive|delete|clear_files, ids?: [..], scope?: active|archive|general|private|all}
    '''
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id',
            'Access-Control-Max-Age': '86400'}, 'body': ''}

    headers = {k.lower(): v for k, v in (event.get('headers') or {}).items()}
    login = headers.get('x-user-id') or ''
    password = headers.get('x-auth-token') or ''
    s_login = os.environ.get('CHAT_ADMIN_LOGIN') or ''
    s_pass = os.environ.get('CHAT_ADMIN_PASSWORD') or ''
    if not s_login or not s_pass or not (
        hmac.compare_digest(login.encode(), s_login.encode()) and hmac.compare_digest(password.encode(), s_pass.encode())
    ):
        return resp(401, {'error': 'Неверный логин или пароль'})

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        cur = conn.cursor()

        if method == 'GET':
            params = event.get('queryStringParameters') or {}
            archived = 'TRUE' if params.get('view') == 'archive' else 'FALSE'
            channel = params.get('channel') or 'all'
            where = f"archived = {archived}"
            if channel in ('general', 'private'):
                where += f" AND channel = '{channel}'"
            cur.execute(f"""
                SELECT id, channel, sender_name, sender_role, recipient_name, text, file_url, file_name, file_size, created_at, archived
                FROM chat_messages WHERE {where} ORDER BY id DESC LIMIT 1000
            """)
            msgs = [{
                'id': r[0], 'channel': r[1], 'sender_name': r[2], 'sender_role': r[3], 'recipient_name': r[4],
                'text': r[5], 'file_url': r[6], 'file_name': r[7], 'file_size': r[8],
                'created_at': r[9].strftime('%Y-%m-%d %H:%M:%S'), 'archived': r[10]
            } for r in cur.fetchall()]
            return resp(200, {'messages': msgs})

        if method == 'POST':
            body = json.loads(event.get('body') or '{}')
            action = body.get('action')
            if action == 'login':
                return resp(200, {'success': True})

            ids = [int(i) for i in (body.get('ids') or [])]
            scope = body.get('scope')
            if ids:
                cond = f"id IN ({','.join(str(i) for i in ids)})"
            elif scope == 'active':
                cond = "archived = FALSE"
            elif scope == 'archive':
                cond = "archived = TRUE"
            elif scope == 'general':
                cond = "channel = 'general' AND archived = FALSE"
            elif scope == 'private':
                cond = "channel = 'private' AND archived = FALSE"
            elif scope == 'all':
                cond = "TRUE"
            else:
                return resp(400, {'error': 'Не указано, что обработать'})

            if action == 'archive':
                cur.execute(f"UPDATE chat_messages SET archived = TRUE WHERE {cond} AND archived = FALSE")
            elif action == 'unarchive':
                cur.execute(f"UPDATE chat_messages SET archived = FALSE WHERE {cond} AND archived = TRUE")
            elif action in ('delete', 'clear_files'):
                cur.execute(f"SELECT id, file_key FROM chat_messages WHERE {cond} AND file_key IS NOT NULL")
                files = cur.fetchall()
                if files:
                    s3 = s3_client()
                    for _, key in files:
                        s3.delete_object(Bucket='files', Key=key)
                if action == 'delete':
                    cur.execute(f"DELETE FROM chat_messages WHERE {cond}")
                else:
                    cur.execute(f"UPDATE chat_messages SET file_url = NULL, file_name = NULL, file_key = NULL, file_size = NULL WHERE {cond} AND file_key IS NOT NULL")
            else:
                return resp(400, {'error': 'Неизвестное действие'})
            affected = cur.rowcount
            conn.commit()
            return resp(200, {'success': True, 'affected': affected})

        return resp(405, {'error': 'Method not allowed'})
    finally:
        conn.close()
