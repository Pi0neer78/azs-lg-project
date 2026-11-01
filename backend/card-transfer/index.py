import json
import authz
import audit
import os
import psycopg2
from datetime import datetime, timezone, timedelta

MSK_TZ = timezone(timedelta(hours=3))

def handler(event: dict, context) -> dict:
    """
    Перемещение топлива между картами: создаёт операцию списания на карте-источнике
    и операцию оприходования на карте-назначении, обновляет балансы обеих карт.
    """
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': authz.ALLOW_HEADERS,
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }

    if event.get('httpMethod') != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }

    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Database configuration error'})
        }

    body_data = json.loads(event.get('body', '{}'))

    from_card_id = int(body_data.get('from_card_id', 0))
    to_card_id = int(body_data.get('to_card_id', 0))
    debit_quantity = float(body_data.get('debit_quantity', 0))
    credit_quantity = float(body_data.get('credit_quantity', 0))

    if not from_card_id or not to_card_id or debit_quantity <= 0 or credit_quantity <= 0:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Необходимо указать карты и количество топлива'})
        }

    if from_card_id == to_card_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Карта-источник и карта-назначение не могут совпадать'})
        }

    conn = psycopg2.connect(database_url)
    cursor = conn.cursor()

    user, auth_err = authz.authenticate(conn, event)
    if auth_err:
        cursor.close()
        conn.close()
        return auth_err
    if not user['admin']:
        cursor.execute("SELECT COUNT(*) FROM fuel_cards WHERE id IN (%s, %s) AND client_id = %s", (from_card_id, to_card_id, user['id']))
        if cursor.fetchone()[0] != 2:
            cursor.close()
            conn.close()
            return authz.forbidden()

    cursor.execute("""
        SELECT fc.id, fc.card_code, fc.card_index, fc.balance_liters, ft.name as fuel_type, cl.name as client_name
        FROM fuel_cards fc
        LEFT JOIN fuel_types ft ON fc.fuel_type_id = ft.id
        LEFT JOIN clients cl ON fc.client_id = cl.id
        WHERE fc.id = %s
    """, (from_card_id,))
    from_row = cursor.fetchone()

    cursor.execute("""
        SELECT fc.id, fc.card_code, fc.card_index, fc.balance_liters, ft.name as fuel_type, cl.name as client_name
        FROM fuel_cards fc
        LEFT JOIN fuel_types ft ON fc.fuel_type_id = ft.id
        LEFT JOIN clients cl ON fc.client_id = cl.id
        WHERE fc.id = %s
    """, (to_card_id,))
    to_row = cursor.fetchone()

    if not from_row or not to_row:
        cursor.close()
        conn.close()
        return {
            'statusCode': 404,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Карта не найдена'})
        }

    from_card_code = from_row[1]
    from_card_index = from_row[2] if from_row[2] is not None else 0
    from_balance = float(from_row[3]) if from_row[3] else 0.0
    if from_balance < debit_quantity:
        cursor.close()
        conn.close()
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Недостаточно топлива на карте-источнике'})
        }
    from_fuel_type = from_row[4] or ''
    from_client = from_row[5] or ''

    to_card_code = to_row[1]
    to_card_index = to_row[2] if to_row[2] is not None else 0
    to_balance = float(to_row[3]) if to_row[3] else 0.0
    to_fuel_type = to_row[4] or ''
    to_client = to_row[5] or ''

    now = datetime.now(MSK_TZ).strftime('%Y-%m-%d %H:%M:%S')

    from_label = f"{from_card_code}/{from_card_index}"
    to_label = f"{to_card_code}/{to_card_index}"

    cursor.execute("SELECT id FROM stations WHERE name = 'Склад' LIMIT 1")
    sklat_row = cursor.fetchone()
    station_id = sklat_row[0] if sklat_row else None

    debit_comment = f"Перемещение: списание {debit_quantity:.3f} л ({from_fuel_type}) -> карта {to_label} ({to_client})"
    credit_comment = f"Перемещение: оприходование {credit_quantity:.3f} л ({to_fuel_type}), с карты {from_label} ({from_client}) {debit_quantity:.3f} л ({from_fuel_type})"

    cursor.execute("""
        INSERT INTO card_operations (fuel_card_id, station_id, operation_date, operation_type, quantity, price, amount, comment)
        VALUES (%s, %s, %s, 'списание', %s, 0, 0, %s)
        RETURNING id
    """, (from_card_id, station_id, now, debit_quantity, debit_comment))
    debit_op_id = cursor.fetchone()[0]

    cursor.execute("""
        INSERT INTO card_operations (fuel_card_id, station_id, operation_date, operation_type, quantity, price, amount, comment)
        VALUES (%s, %s, %s, 'оприходование', %s, 0, 0, %s)
        RETURNING id
    """, (to_card_id, station_id, now, credit_quantity, credit_comment))
    credit_op_id = cursor.fetchone()[0]

    new_from_balance = from_balance - debit_quantity
    new_to_balance = to_balance + credit_quantity

    cursor.execute("UPDATE fuel_cards SET balance_liters = %s WHERE id = %s", (new_from_balance, from_card_id))
    cursor.execute("UPDATE fuel_cards SET balance_liters = %s WHERE id = %s", (new_to_balance, to_card_id))

    conn.commit()
    audit.log(conn, event, user, 'добавление', 'Операции', audit.fmt([
        ('Вид операции', 'Перемещение топлива между картами'),
        ('С карты', '%s, клиент %s, топливо %s' % (from_label, from_client, from_fuel_type)), ('Списано', debit_quantity),
        ('На карту', '%s, клиент %s, топливо %s' % (to_label, to_client, to_fuel_type)), ('Оприходовано', credit_quantity),
        ('Остаток источника', '%s → %s' % (from_balance, new_from_balance)), ('Остаток получателя', '%s → %s' % (to_balance, new_to_balance))]))
    cursor.close()
    conn.close()

    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'success': True,
            'debit_operation_id': debit_op_id,
            'credit_operation_id': credit_op_id,
            'from_card': {
                'id': from_card_id,
                'label': from_label,
                'old_balance': from_balance,
                'new_balance': new_from_balance,
                'fuel_type': from_fuel_type,
                'client_name': from_client
            },
            'to_card': {
                'id': to_card_id,
                'label': to_label,
                'old_balance': to_balance,
                'new_balance': new_to_balance,
                'fuel_type': to_fuel_type,
                'client_name': to_client
            }
        })
    }