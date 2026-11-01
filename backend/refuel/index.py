import json
import authz
import audit
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
    
    try:
        card_code = str(body_data.get('card_code', '')).strip()
        quantity = float(body_data.get('quantity', 0) or 0)
        price = float(body_data.get('price', 0) or 0)
        code_1c = str(body_data.get('code_1c', '')).strip()
        comment = str(body_data.get('comment', '')).strip()
    except (TypeError, ValueError):
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Некорректные данные'})
        }
    
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
            cur.execute("""
                SELECT id, card_code, balance_liters
                FROM fuel_cards
                WHERE card_code = %s
                FOR UPDATE
            """, (card_code,))
            
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
            
            cur.execute("UPDATE fuel_cards SET balance_liters = %s WHERE id = %s", (new_balance, card_id))
            
            amount = quantity * price
            operation_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            cur.execute("SELECT id, name FROM stations WHERE code_1c = %s LIMIT 1", (code_1c,))
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
            
            cur.execute("""
                INSERT INTO card_operations 
                (fuel_card_id, station_id, operation_date, operation_type, quantity, price, amount, comment)
                VALUES 
                (%s, %s, %s, 'заправка', %s, %s, %s, %s)
            """, (card_id, station_id, operation_date, quantity, price, amount, comment))
            
            conn.commit()
            audit.log(conn, event, None, 'добавление', 'Операции', audit.fmt([
                ('Источник', 'Интеграция 1С'), ('Вид операции', 'Заправка'), ('Карта', audit.card_info(cur, card_id)),
                ('АЗС', '%s (код 1С %s)' % (station_name, code_1c)), ('Количество', quantity), ('Цена', price), ('Сумма', amount),
                ('Комментарий', comment), ('Остаток', '%s → %s' % (current_balance, new_balance))]))
            
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