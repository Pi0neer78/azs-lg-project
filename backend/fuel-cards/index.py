import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    API для управления топливными картами: получение, создание, обновление и удаление.
    Поддерживает поле card_index (0-9) для различия карт с одинаковым кодом.
    Уникальность: пара (card_code, card_index).
    Args: event - dict с httpMethod, body, queryStringParameters
          context - объект с атрибутами request_id, function_name
    Returns: HTTP response dict
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Database configuration error'}),
            'isBase64Encoded': False
        }
    
    try:
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        params = event.get('queryStringParameters', {}) or {}
        
        if method == 'GET':
            # Если передан card_code — вернуть список карт по коду (для выбора индекса)
            filter_code = params.get('card_code', '').strip()
            
            if filter_code:
                escaped = filter_code.replace("'", "''")
                cursor.execute(f"""
                    SELECT 
                        fc.id,
                        fc.card_code,
                        fc.card_index,
                        fc.balance_liters,
                        fc.pin_code,
                        c.name as client_name,
                        ft.name as fuel_type,
                        fc.client_id,
                        fc.fuel_type_id,
                        fc.status,
                        fc.block_reason,
                        fc.daily_limit
                    FROM fuel_cards fc
                    LEFT JOIN clients c ON fc.client_id = c.id
                    LEFT JOIN fuel_types ft ON fc.fuel_type_id = ft.id
                    WHERE fc.card_code = '{escaped}'
                    ORDER BY fc.card_index
                """)
            else:
                cursor.execute("""
                    SELECT 
                        fc.id,
                        fc.card_code,
                        fc.card_index,
                        fc.balance_liters,
                        fc.pin_code,
                        c.name as client_name,
                        ft.name as fuel_type,
                        fc.client_id,
                        fc.fuel_type_id,
                        fc.status,
                        fc.block_reason,
                        fc.daily_limit
                    FROM fuel_cards fc
                    LEFT JOIN clients c ON fc.client_id = c.id
                    LEFT JOIN fuel_types ft ON fc.fuel_type_id = ft.id
                    ORDER BY fc.card_code, fc.card_index
                """)
            
            rows = cursor.fetchall()
            cards = []
            for row in rows:
                cards.append({
                    'id': row[0],
                    'card_code': row[1],
                    'card_index': row[2] if row[2] is not None else 0,
                    'balance_liters': float(row[3]) if row[3] else 0.0,
                    'pin_code': row[4],
                    'client_name': row[5],
                    'fuel_type': row[6],
                    'client_id': row[7],
                    'fuel_type_id': row[8],
                    'status': row[9] if row[9] else 'активна',
                    'block_reason': row[10] if row[10] else '',
                    'daily_limit': float(row[11]) if row[11] else 0.0
                })
            
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'cards': cards}),
                'isBase64Encoded': False
            }
        
        if method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            
            card_index = int(body_data.get('card_index', 0))
            
            cursor.execute("""
                INSERT INTO fuel_cards (card_code, card_index, client_id, fuel_type_id, balance_liters, pin_code, status, block_reason, daily_limit)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, card_code, card_index, client_id, fuel_type_id, balance_liters, pin_code, status, block_reason, daily_limit
            """, (
                body_data.get('card_code'),
                card_index,
                body_data.get('client_id'),
                body_data.get('fuel_type_id'),
                body_data.get('balance_liters', 0),
                body_data.get('pin_code'),
                body_data.get('status', 'активна'),
                body_data.get('block_reason', ''),
                body_data.get('daily_limit', 0)
            ))
            
            row = cursor.fetchone()
            
            cursor.execute("""
                SELECT c.name, ft.name
                FROM clients c, fuel_types ft
                WHERE c.id = %s AND ft.id = %s
            """, (row[3], row[4]))
            
            names = cursor.fetchone()
            conn.commit()
            cursor.close()
            conn.close()
            
            card = {
                'id': row[0],
                'card_code': row[1],
                'card_index': row[2] if row[2] is not None else 0,
                'client_id': row[3],
                'fuel_type_id': row[4],
                'balance_liters': float(row[5]) if row[5] else 0.0,
                'pin_code': row[6],
                'status': row[7] if row[7] else 'активна',
                'block_reason': row[8] if row[8] else '',
                'daily_limit': float(row[9]) if row[9] else 0.0,
                'client_name': names[0] if names else '',
                'fuel_type': names[1] if names else ''
            }
            
            return {
                'statusCode': 201,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'card': card}),
                'isBase64Encoded': False
            }
        
        if method == 'PUT':
            body_data = json.loads(event.get('body', '{}'))
            card_id = body_data.get('id')
            
            update_fields = []
            update_values = []
            
            if 'card_code' in body_data:
                update_fields.append('card_code = %s')
                update_values.append(body_data['card_code'])
            if 'card_index' in body_data:
                update_fields.append('card_index = %s')
                update_values.append(int(body_data['card_index']))
            if 'client_id' in body_data:
                update_fields.append('client_id = %s')
                update_values.append(body_data['client_id'])
            if 'fuel_type_id' in body_data:
                update_fields.append('fuel_type_id = %s')
                update_values.append(body_data['fuel_type_id'])
            if 'balance_liters' in body_data:
                update_fields.append('balance_liters = %s')
                update_values.append(body_data['balance_liters'])
            if 'pin_code' in body_data:
                update_fields.append('pin_code = %s')
                update_values.append(body_data['pin_code'])
            if 'status' in body_data:
                update_fields.append('status = %s')
                update_values.append(body_data['status'])
            if 'block_reason' in body_data:
                update_fields.append('block_reason = %s')
                update_values.append(body_data['block_reason'])
            if 'daily_limit' in body_data:
                update_fields.append('daily_limit = %s')
                update_values.append(body_data['daily_limit'])
            
            if not update_fields:
                cursor.close()
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'No fields to update'}),
                    'isBase64Encoded': False
                }
            
            update_values.append(card_id)
            update_query = f"""
                UPDATE fuel_cards
                SET {', '.join(update_fields)}
                WHERE id = %s
                RETURNING id, card_code, card_index, client_id, fuel_type_id, balance_liters, pin_code, status, block_reason, daily_limit
            """
            
            cursor.execute(update_query, tuple(update_values))
            row = cursor.fetchone()
            
            if row:
                cursor.execute("""
                    SELECT c.name, ft.name
                    FROM clients c, fuel_types ft
                    WHERE c.id = %s AND ft.id = %s
                """, (row[3], row[4]))
                
                names = cursor.fetchone()
                conn.commit()
                cursor.close()
                conn.close()
                
                card = {
                    'id': row[0],
                    'card_code': row[1],
                    'card_index': row[2] if row[2] is not None else 0,
                    'client_id': row[3],
                    'fuel_type_id': row[4],
                    'balance_liters': float(row[5]) if row[5] else 0.0,
                    'pin_code': row[6],
                    'status': row[7] if row[7] else 'активна',
                    'block_reason': row[8] if row[8] else '',
                    'daily_limit': float(row[9]) if row[9] else 0.0,
                    'client_name': names[0] if names else '',
                    'fuel_type': names[1] if names else ''
                }
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'card': card}),
                    'isBase64Encoded': False
                }
            else:
                cursor.close()
                conn.close()
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Card not found'}),
                    'isBase64Encoded': False
                }
        
        if method == 'DELETE':
            body_data = json.loads(event.get('body', '{}'))
            card_id = body_data.get('id')
            
            cursor.execute("DELETE FROM fuel_cards WHERE id = %s RETURNING id", (card_id,))
            row = cursor.fetchone()
            conn.commit()
            cursor.close()
            conn.close()
            
            if row:
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True, 'deleted_id': row[0]}),
                    'isBase64Encoded': False
                }
            else:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Card not found'}),
                    'isBase64Encoded': False
                }
        
        cursor.close()
        conn.close()
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    except psycopg2.IntegrityError as e:
        error_msg = str(e)
        if 'card_code_card_index' in error_msg or 'unique' in error_msg.lower():
            return {
                'statusCode': 409,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Карта с таким кодом и индексом уже существует'}),
                'isBase64Encoded': False
            }
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': error_msg}),
            'isBase64Encoded': False
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
