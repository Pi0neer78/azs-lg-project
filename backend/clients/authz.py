import json
import os
import hmac
from typing import Any, Dict, Optional, Tuple

MAX_FAILS = 10
WINDOW_MIN = 15

ALLOW_HEADERS = 'Content-Type, X-User-Id, X-Auth-Token, X-Api-Key, X-Session-Id'


def resp(code: int, data: Any) -> Dict[str, Any]:
    return {
        'statusCode': code,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(data, ensure_ascii=False, default=str),
        'isBase64Encoded': False,
    }


def preflight(methods: str) -> Dict[str, Any]:
    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': methods,
            'Access-Control-Allow-Headers': ALLOW_HEADERS,
            'Access-Control-Max-Age': '86400',
        },
        'body': '',
        'isBase64Encoded': False,
    }


def _headers(event: dict) -> dict:
    return {k.lower(): v for k, v in (event.get('headers') or {}).items()}


def _ip(event: dict) -> str:
    return str(((event.get('requestContext') or {}).get('identity') or {}).get('sourceIp') or '')[:64]


def verify(conn, login: str, password: str, ip: str = '') -> Tuple[Optional[dict], Optional[dict]]:
    login = (login or '').strip()
    password = (password or '').strip()
    if not login or not password:
        return None, resp(401, {'error': 'Требуется авторизация'})
    cur = conn.cursor()
    cur.execute(
        "SELECT COUNT(*) FROM auth_attempts WHERE created_at > NOW() - INTERVAL '%d minutes' AND (login = %%s OR (ip <> '' AND ip = %%s))" % WINDOW_MIN,
        (login, ip),
    )
    fails = cur.fetchone()[0]
    if fails >= MAX_FAILS * 3 or (fails >= MAX_FAILS):
        cur.close()
        return None, resp(429, {'error': 'Слишком много неудачных попыток. Попробуйте через 15 минут'})
    cur.execute("SELECT id, name, admin, operator, password FROM clients WHERE login = %s", (login,))
    row = cur.fetchone()
    if row and hmac.compare_digest(str(row[4]).encode(), password.encode()):
        cur.close()
        is_admin = bool(row[2])
        is_operator = bool(row[3])
        role = ('operator' if is_operator else 'admin') if is_admin else 'client'
        return {'id': row[0], 'name': row[1], 'login': login, 'admin': is_admin, 'operator': is_operator, 'role': role}, None
    cur.execute("INSERT INTO auth_attempts (login, ip) VALUES (%s, %s)", (login[:255], ip))
    conn.commit()
    cur.close()
    return None, resp(401, {'error': 'Неверный логин или пароль'})


def authenticate(conn, event: dict) -> Tuple[Optional[dict], Optional[dict]]:
    h = _headers(event)
    return verify(conn, h.get('x-user-id', ''), h.get('x-auth-token', ''), _ip(event))


def forbidden() -> Dict[str, Any]:
    return resp(403, {'error': 'Недостаточно прав для этого действия'})


def integration_or_admin(conn, event: dict) -> Optional[dict]:
    secret = os.environ.get('INTEGRATION_API_KEY') or ''
    given = _headers(event).get('x-api-key', '')
    if secret and given and hmac.compare_digest(given.encode(), secret.encode()):
        return None
    user, err = authenticate(conn, event)
    if err:
        return err
    if not user['admin']:
        return forbidden()
    return None
