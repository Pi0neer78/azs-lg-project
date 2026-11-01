import re
from typing import Any, Dict, Optional


def _headers(event: dict) -> dict:
    return {k.lower(): v for k, v in (event.get('headers') or {}).items()}


def client_ip(event: dict) -> str:
    h = _headers(event)
    ip = str(((event.get('requestContext') or {}).get('identity') or {}).get('sourceIp') or '')
    if not ip:
        ip = (h.get('x-forwarded-for') or '').split(',')[0].strip()
    return ip[:64]


def device_name(event: dict) -> str:
    ua = _headers(event).get('user-agent', '')
    if not ua:
        return ''
    os_name = ''
    for pat, name in (
        (r'Windows NT 10', 'Windows 10/11'), (r'Windows NT 6\.3', 'Windows 8.1'), (r'Windows NT 6\.1', 'Windows 7'),
        (r'Windows', 'Windows'), (r'Android', 'Android'), (r'iPhone|iPad', 'iOS'),
        (r'Mac OS X', 'macOS'), (r'Linux', 'Linux'),
    ):
        if re.search(pat, ua):
            os_name = name
            break
    br = ''
    for pat, name in (
        (r'YaBrowser', 'Яндекс Браузер'), (r'Edg/', 'Edge'), (r'OPR/|Opera', 'Opera'),
        (r'Firefox', 'Firefox'), (r'Chrome', 'Chrome'), (r'Safari', 'Safari'),
    ):
        if re.search(pat, ua):
            br = name
            break
    return ', '.join(x for x in (os_name, br) if x)[:255] or ua[:255]


def fmt(pairs) -> str:
    out = []
    for label, value in pairs:
        if value is None or value == '':
            value = '—'
        out.append('%s : %s' % (label, value))
    return ', '.join(out)


def diff(old: dict, new: dict, labels: Dict[str, str]) -> str:
    out = []
    for k, label in labels.items():
        if k not in new:
            continue
        a, b = old.get(k), new.get(k)
        if str(a if a is not None else '') != str(b if b is not None else ''):
            out.append('%s : %s → %s' % (label, '—' if a in (None, '') else a, '—' if b in (None, '') else b))
    return ', '.join(out)


def log(conn, event: dict, user: Optional[dict], action: str, section: str, description: str) -> None:
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO audit_log (user_name, user_login, user_role, ip, device, action, section, description) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
            (
                str((user or {}).get('name') or 'Система')[:255],
                str((user or {}).get('login') or '')[:255],
                str((user or {}).get('role') or '')[:20],
                client_ip(event),
                device_name(event),
                action[:30],
                section[:60],
                description,
            ),
        )
        conn.commit()
        cur.close()
    except Exception:
        try:
            conn.rollback()
        except Exception:
            pass


def card_info(cur, card_id) -> str:
    try:
        cur.execute(
            "SELECT fc.card_code, fc.card_index, c.name, ft.name FROM fuel_cards fc "
            "LEFT JOIN clients c ON c.id = fc.client_id LEFT JOIN fuel_types ft ON ft.id = fc.fuel_type_id WHERE fc.id = %s",
            (int(card_id),),
        )
        r = cur.fetchone()
        if not r:
            return '—'
        return '%s/%s, клиент %s, топливо %s' % (r[0], r[1] if r[1] is not None else 0, r[2] or '—', r[3] or '—')
    except Exception:
        return '—'


def station_name(cur, station_id) -> str:
    try:
        cur.execute("SELECT name FROM stations WHERE id = %s", (int(station_id),))
        r = cur.fetchone()
        return r[0] if r else '—'
    except Exception:
        return '—'
