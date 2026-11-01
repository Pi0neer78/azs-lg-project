import json
import os
import hmac
import psycopg2
import authz
import audit
from typing import Dict, Any

ACTIONS = ('добавление', 'удаление', 'изменение', 'вход', 'выход', 'печать', 'в эксель', 'действия оператора')
CLIENT_EVENTS = ('выход', 'печать', 'в эксель', 'действия оператора')


def check_password(event: dict) -> bool:
    secret = os.environ.get('AUDIT_LOG_PASSWORD') or ''
    given = authz._headers(event).get('x-auth-token', '')
    return bool(secret) and bool(given) and hmac.compare_digest(given.encode(), secret.encode())


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Журнал операций. GET (заголовок X-Auth-Token = пароль из секрета AUDIT_LOG_PASSWORD):
    ?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&action=вид&user=имя&ip=адрес&section=раздел&q=текст — список записей.
    POST {action: login} — проверка пароля журнала.
    POST {action: event, type: выход|печать|в эксель|действия оператора, section, description} — запись события от авторизованного пользователя.
    '''
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return authz.preflight('GET, POST, OPTIONS')

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        if method == 'GET':
            if not check_password(event):
                return authz.resp(401, {'error': 'Неверный пароль'})
            p = event.get('queryStringParameters') or {}
            where = ['TRUE']
            args = []
            if (p.get('date_from') or '').strip():
                where.append('created_at >= %s::date')
                args.append(p['date_from'].strip())
            if (p.get('date_to') or '').strip():
                where.append("created_at < (%s::date + 1)")
                args.append(p['date_to'].strip())
            acts = [a for a in (p.get('action') or '').split(',') if a in ACTIONS]
            if acts:
                where.append('action = ANY(%s)')
                args.append(acts)
            for param, cols in (('user', ('user_name', 'user_login')), ('ip', ('ip', 'device')), ('section', ('section',))):
                v = (p.get(param) or '').strip()
                if v:
                    where.append('(' + ' OR '.join(c + ' ILIKE %s' for c in cols) + ')')
                    args += ['%' + v + '%'] * len(cols)
            q = (p.get('q') or '').strip()
            if q:
                where.append('(description ILIKE %s OR user_name ILIKE %s OR section ILIKE %s)')
                args += ['%' + q + '%'] * 3
            cur = conn.cursor()
            cur.execute(
                "SELECT id, created_at, user_name, user_login, user_role, ip, device, action, section, description "
                "FROM audit_log WHERE " + ' AND '.join(where) + " ORDER BY id DESC LIMIT 5000",
                args,
            )
            rows = [{
                'id': r[0], 'created_at': r[1].strftime('%Y-%m-%d %H:%M:%S'), 'user_name': r[2], 'user_login': r[3],
                'user_role': r[4], 'ip': r[5], 'device': r[6], 'action': r[7], 'section': r[8], 'description': r[9],
            } for r in cur.fetchall()]
            return authz.resp(200, {'records': rows})

        if method == 'POST':
            body = json.loads(event.get('body') or '{}')
            act = body.get('action')
            if act == 'login':
                if not check_password(event):
                    return authz.resp(401, {'error': 'Неверный пароль'})
                return authz.resp(200, {'success': True})
            if act == 'cleanup':
                if not check_password(event):
                    return authz.resp(401, {'error': 'Неверный пароль'})
                try:
                    days = int(body.get('days'))
                except (TypeError, ValueError):
                    return authz.resp(400, {'error': 'Укажите количество дней'})
                if days < 1:
                    return authz.resp(400, {'error': 'Количество дней должно быть не меньше 1'})
                cur = conn.cursor()
                cur.execute("DELETE FROM audit_log WHERE created_at < NOW() - make_interval(days => %s)", (days,))
                deleted = cur.rowcount
                conn.commit()
                cur.close()
                audit.log(conn, event, {'name': 'Просмотр журнала', 'login': '', 'role': 'журнал'}, 'удаление', 'Журнал операций',
                          audit.fmt([('Удалены записи старше (дней)', days), ('Удалено записей', deleted)]))
                return authz.resp(200, {'success': True, 'deleted': deleted})
            if act == 'event':
                if check_password(event):
                    user = {'name': 'Просмотр журнала', 'login': '', 'role': 'журнал'}
                else:
                    user, err = authz.authenticate(conn, event)
                    if err:
                        return err
                kind = body.get('type')
                if kind not in CLIENT_EVENTS:
                    return authz.resp(400, {'error': 'Неизвестный вид события'})
                audit.log(conn, event, user, kind, str(body.get('section') or '')[:60], str(body.get('description') or '')[:4000])
                return authz.resp(200, {'success': True})
            return authz.resp(400, {'error': 'Неизвестное действие'})

        return authz.resp(405, {'error': 'Method not allowed'})
    finally:
        conn.close()
