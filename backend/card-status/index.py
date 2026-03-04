import json
import os
import psycopg2
from typing import Dict, Any
from datetime import date

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Получение баланса и состояния топливной карты для оператора АЗС.
    Если по коду найдено несколько карт (разные card_index) — возвращает массив cards.
    Если карта одна — возвращает одну карту в поле card_data (и cards из 1 элемента).
    Args: event - dict с httpMethod, queryStringParameters (card_code)
          context - объект с атрибутами request_id, function_name
    Returns: HTTP response dict с данными карты, включая доступный баланс с учетом дневного лимита
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    params = event.get('queryStringParameters', {}) or {}
    card_code = params.get('card_code', '').strip()
    
    if not card_code:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Не указан номер карты (параметр card_code)'})
        }
    
    dsn = os.environ.get('DATABASE_URL')
    if not dsn:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'DATABASE_URL не настроен'})
        }
    
    conn = psycopg2.connect(dsn)
    try:
        with conn.cursor() as cur:
            escaped_card_code = card_code.replace("'", "''")
            
            if method == 'GET':
                query = f"""
                    SELECT 
                        fc.id,
                        fc.card_code,
                        fc.card_index,
                        ft.name as fuel_type,
                        fc.balance_liters,
                        c.name as client_name,
                        c.inn as client_inn,
                        fc.daily_limit,
                        fc.status
                    FROM fuel_cards fc
                    LEFT JOIN clients c ON fc.client_id = c.id
                    LEFT JOIN fuel_types ft ON fc.fuel_type_id = ft.id
                    WHERE fc.card_code = '{escaped_card_code}'
                    ORDER BY fc.card_index
                """
                cur.execute(query)
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
                    daily_limit = float(row[7]) if row[7] is not None else 0.0
                    
                    available_balance = balance_liters
                    
                    if daily_limit > 0:
                        today_start = date.today().strftime('%Y-%m-%d 00:00:00')
                        today_end = date.today().strftime('%Y-%m-%d 23:59:59')
                        
                        cur.execute(f"""
                            SELECT COALESCE(SUM(quantity), 0) as today_total
                            FROM card_operations
                            WHERE fuel_card_id = {card_id}
                            AND operation_type = 'заправка'
                            AND operation_date >= '{today_start}'
                            AND operation_date <= '{today_end}'
                        """)
                        today_row = cur.fetchone()
                        today_refueled = float(today_row[0]) if today_row and today_row[0] else 0.0
                        
                        available_balance = min(balance_liters, daily_limit - today_refueled)
                        available_balance = max(0.0, available_balance)
                    
                    cards_result.append({
                        'id': card_id,
                        'card_code': row[1],
                        'card_index': row[2] if row[2] is not None else 0,
                        'fuel_type': row[3] or '',
                        'balance_liters': balance_liters,
                        'available_balance': available_balance,
                        'daily_limit': daily_limit,
                        'client_name': row[5] or '',
                        'client_inn': row[6] or '',
                        'status': row[8] if row[8] else 'активна'
                    })
                
                if len(cards_result) == 1:
                    result = cards_result[0]
                    result['multiple'] = False
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'isBase64Encoded': False,
                        'body': json.dumps(result, ensure_ascii=False)
                    }
                else:
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'isBase64Encoded': False,
                        'body': json.dumps({'multiple': True, 'cards': cards_result}, ensure_ascii=False)
                    }
            
            if method == 'POST':
                body_str = event.get('body', '{}') or '{}'
                body_data = json.loads(body_str)
                
                card_id = body_data.get('card_id')
                quantity = float(body_data.get('quantity', 0))
                station_id = body_data.get('station_id')
                
                if not card_id or quantity <= 0 or not station_id:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Необходимы card_id, quantity > 0, station_id'})
                    }
                
                cur.execute(f"""
                    SELECT fc.id, fc.card_code, fc.card_index, fc.balance_liters, fc.daily_limit, fc.status
                    FROM fuel_cards fc
                    WHERE fc.id = {int(card_id)}
                """)
                card_row = cur.fetchone()
                
                if not card_row:
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Карта не найдена'})
                    }
                
                card_balance = float(card_row[3]) if card_row[3] else 0.0
                daily_limit = float(card_row[4]) if card_row[4] else 0.0
                card_status = card_row[5] if card_row[5] else 'активна'
                
                if card_status != 'активна':
                    return {
                        'statusCode': 403,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Карта заблокирована'})
                    }
                
                available = card_balance
                if daily_limit > 0:
                    today_start = date.today().strftime('%Y-%m-%d 00:00:00')
                    today_end = date.today().strftime('%Y-%m-%d 23:59:59')
                    cur.execute(f"""
                        SELECT COALESCE(SUM(quantity), 0)
                        FROM card_operations
                        WHERE fuel_card_id = {int(card_id)}
                        AND operation_type = 'заправка'
                        AND operation_date >= '{today_start}'
                        AND operation_date <= '{today_end}'
                    """)
                    today_row = cur.fetchone()
                    today_refueled = float(today_row[0]) if today_row and today_row[0] else 0.0
                    available = min(card_balance, daily_limit - today_refueled)
                    available = max(0.0, available)
                
                if quantity > available:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': f'Недостаточно средств. Доступно: {available:.3f} л'})
                    }
                
                new_balance = card_balance - quantity
                cur.execute(f"""
                    UPDATE fuel_cards SET balance_liters = {new_balance}
                    WHERE id = {int(card_id)}
                """)
                
                cur.execute(f"""
                    INSERT INTO card_operations (fuel_card_id, station_id, operation_date, operation_type, quantity, price, amount, comment)
                    VALUES ({int(card_id)}, {int(station_id)}, NOW(), 'заправка', {quantity}, 0, 0, 'Отпуск топлива оператором')
                """)
                
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True, 'new_balance': new_balance}, ensure_ascii=False)
                }
    finally:
        conn.close()
