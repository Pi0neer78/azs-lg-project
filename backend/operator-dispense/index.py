import json
import os
import psycopg2
from typing import Dict, Any
from datetime import datetime, date

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Панель оператора: получение данных карты по коду и списание топлива.
    GET ?card_code=XXXX — получить данные карты (если несколько по коду — вернуть массив с multiple:true)
    POST {card_id, quantity, station_id} — списать топливо по ID карты
    '''
    method: str = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }

    dsn = os.environ.get('DATABASE_URL')
    if not dsn:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'DATABASE_URL не настроен'})
        }

    conn = psycopg2.connect(dsn)

    if method == 'GET':
        params = event.get('queryStringParameters', {}) or {}
        card_code = params.get('card_code', '').strip()

        if not card_code:
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Не указан номер карты'})
            }

        try:
            with conn.cursor() as cur:
                escaped = card_code.replace("'", "''")
                cur.execute(f"""
                    SELECT fc.id, fc.card_code, fc.card_index, ft.name as fuel_type,
                           fc.balance_liters, c.name as client_name, fc.daily_limit, fc.status
                    FROM fuel_cards fc
                    LEFT JOIN clients c ON fc.client_id = c.id
                    LEFT JOIN fuel_types ft ON fc.fuel_type_id = ft.id
                    WHERE fc.card_code = '{escaped}'
                    ORDER BY fc.card_index
                """)
                rows = cur.fetchall()

                if not rows:
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': f'Карта {card_code} не найдена'})
                    }

                cards_result = []
                for row in rows:
                    card_id = row[0]
                    balance_liters = float(row[4]) if row[4] is not None else 0.0
                    daily_limit = float(row[6]) if row[6] is not None else 0.0
                    available = balance_liters

                    if daily_limit > 0:
                        today_start = date.today().strftime('%Y-%m-%d 00:00:00')
                        today_end = date.today().strftime('%Y-%m-%d 23:59:59')
                        cur.execute(f"""
                            SELECT COALESCE(SUM(quantity), 0)
                            FROM card_operations
                            WHERE fuel_card_id = {card_id}
                            AND operation_type = 'заправка'
                            AND operation_date >= '{today_start}'
                            AND operation_date <= '{today_end}'
                        """)
                        today_row = cur.fetchone()
                        today_refueled = float(today_row[0]) if today_row and today_row[0] else 0.0
                        available = min(balance_liters, daily_limit - today_refueled)
                        available = max(0.0, available)

                    cards_result.append({
                        'id': card_id,
                        'card_code': row[1],
                        'card_index': row[2] if row[2] is not None else 0,
                        'fuel_type': row[3] or '',
                        'balance_liters': balance_liters,
                        'daily_limit': daily_limit,
                        'available_balance': available,
                        'client_name': row[5] or '',
                        'status': row[7] if row[7] else 'активна'
                    })

                if len(cards_result) == 1:
                    result = cards_result[0]
                    result['multiple'] = False
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps(result, ensure_ascii=False)
                    }
                else:
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'multiple': True, 'cards': cards_result}, ensure_ascii=False)
                    }
        finally:
            conn.close()

    if method == 'POST':
        try:
            body = json.loads(event.get('body', '{}'))
        except json.JSONDecodeError:
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Некорректный JSON'})
            }

        card_id = body.get('card_id')
        quantity = body.get('quantity', 0)
        station_id = body.get('station_id', 1)

        if not card_id:
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Не указан card_id'})
            }

        if not quantity or float(quantity) <= 0:
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Количество топлива должно быть больше 0'})
            }

        quantity = float(quantity)
        station_id = int(station_id)
        card_id = int(card_id)

        try:
            conn.autocommit = False
            with conn.cursor() as cur:
                cur.execute(f"""
                    SELECT id, balance_liters, status FROM fuel_cards WHERE id = {card_id}
                """)
                row = cur.fetchone()

                if not row:
                    conn.rollback()
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Карта не найдена'})
                    }

                current_balance = float(row[1]) if row[1] is not None else 0.0
                card_status = row[2] if row[2] else 'активна'

                if card_status != 'активна':
                    conn.rollback()
                    return {
                        'statusCode': 403,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Карта заблокирована'})
                    }

                if current_balance < quantity:
                    conn.rollback()
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({
                            'error': 'Недостаточно топлива на карте',
                            'current_balance': current_balance,
                            'requested_quantity': quantity
                        })
                    }

                new_balance = current_balance - quantity
                cur.execute(f"""
                    UPDATE fuel_cards SET balance_liters = {new_balance} WHERE id = {card_id}
                """)

                operation_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                cur.execute(f"""
                    INSERT INTO card_operations
                    (fuel_card_id, station_id, operation_date, operation_type, quantity, price, amount, comment)
                    VALUES ({card_id}, {station_id}, '{operation_date}', 'заправка', {quantity}, 0, 0, 'Панель оператора')
                """)

                conn.commit()

                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'success': True,
                        'quantity': quantity,
                        'previous_balance': current_balance,
                        'new_balance': new_balance
                    }, ensure_ascii=False)
                }
        except Exception as e:
            conn.rollback()
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': f'Ошибка: {str(e)}'})
            }
        finally:
            conn.close()

    conn.close()
    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Метод не поддерживается'})
    }
