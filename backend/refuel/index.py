import json
import authz
import os
import psycopg2
from typing import Dict, Any
from datetime import datetime

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Выполнение операции заправки: уменьшение баланса карты и запись в историю операций
    Args: event - dict с httpMethod, body (card_code, quantity, price, code_1c, comment)
          context - объект с атрибутами request_id, function_name
    Returns: HTTP response dict с результатом операции
    '''
    method: str = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': authz.ALLOW_HEADERS,
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Метод не поддерживается. Используйте POST'})
        }
    
    try:
        body_data = json.loads(event.get('body', '{}'))
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Некорректный JSON'})
        }
    
    card_code = body_data.get('card_code', '').strip()
    quantity = body_data.get('quantity', 0)
    price = body_data.get('price', 0)
    code_1c = body_data.get('code_1c', '').strip()
    comment = body_data.get('comment', '').strip()
    
    if not card_code:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Не указан номер карты (card_code)'})
        }
    
    if not quantity or quantity <= 0:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Количество топлива должно быть больше 0'})
        }
    
    if not code_1c:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Не указан код АЗС (code_1c)'})
        }
    
    dsn = os.environ.get('DATABASE_URL')
    if not dsn:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'DATABASE_URL не настроен'})
        }
    
    conn = psycopg2.connect(dsn)
    auth_err = authz.integration_or_admin(conn, event)
    if auth_err:
        conn.close()
        return auth_err
    try:
        conn.autocommit = False
        with conn.cursor() as cur:
            escaped_card_code = card_code.replace("'", "''")
            
            cur.execute(f"""
                SELECT id, card_code, balance_liters
                FROM fuel_cards
                WHERE card_code = '{escaped_card_code}'
            """)
            
            card_row = cur.fetchone()
            
            if not card_row:
                conn.rollback()
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': f'Карта {card_code} не найдена'})
                }
            
            card_id = card_row[0]
            current_balance = float(card_row[2]) if card_row[2] is not None else 0.0
            
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
                UPDATE fuel_cards
                SET balance_liters = {new_balance}
                WHERE id = {card_id}
            """)
            
            amount = quantity * price
            operation_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            escaped_code = code_1c.replace("'", "''")
            escaped_comment = comment.replace("'", "''")
            
            cur.execute(f"""
                SELECT id, name FROM stations WHERE code_1c = '{escaped_code}' LIMIT 1
            """)
            station_row = cur.fetchone()
            
            if not station_row:
                conn.rollback()
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': f'АЗС с кодом {code_1c} не найдена'})
                }
            
            station_id = station_row[0]
            station_name = station_row[1]
            
            cur.execute(f"""
                INSERT INTO card_operations 
                (fuel_card_id, station_id, operation_date, operation_type, quantity, price, amount, comment)
                VALUES 
                ({card_id}, {station_id}, '{operation_date}', 'заправка', {quantity}, {price}, {amount}, '{escaped_comment}')
            """)
            
            conn.commit()
            
            result = {
                'success': True,
                'card_code': card_code,
                'operation_type': 'заправка',
                'quantity': quantity,
                'price': price,
                'amount': amount,
                'previous_balance': current_balance,
                'new_balance': new_balance,
                'code_1c': code_1c,
                'station_name': station_name,
                'operation_date': operation_date
            }
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'isBase64Encoded': False,
                'body': json.dumps(result, ensure_ascii=False)
            }
    except Exception as e:
        conn.rollback()
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Ошибка выполнения операции'})
        }
    finally:
        conn.close()