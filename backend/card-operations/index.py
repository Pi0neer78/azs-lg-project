import json
import os
import psycopg2
from typing import Dict, Any
from datetime import datetime, timezone, timedelta

MSK_TZ = timezone(timedelta(hours=3))

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    API для управления операциями по картам: получение, создание, обновление и удаление
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
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Database configuration error'}),
            'isBase64Encoded': False
        }
    
    try:
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        if method == 'GET':
            cursor.execute("""
                SELECT 
                    co.id,
                    fc.card_code,
                    s.name as station_name,
                    co.operation_date,
                    co.operation_type,
                    co.quantity,
                    co.price,
                    co.amount,
                    co.comment,
                    co.fuel_card_id,
                    co.station_id,
                    fc.card_index
                FROM card_operations co
                LEFT JOIN fuel_cards fc ON co.fuel_card_id = fc.id
                LEFT JOIN stations s ON co.station_id = s.id
                ORDER BY co.operation_date DESC, co.id DESC
            """)
            rows = cursor.fetchall()
            
            operations = []
            for row in rows:
                operations.append({
                    'id': row[0],
                    'card_code': row[1],
                    'station_name': row[2],
                    'operation_date': row[3].strftime('%Y-%m-%d %H:%M') if row[3] else '',
                    'operation_type': row[4],
                    'quantity': float(row[5]) if row[5] else 0.0,
                    'price': float(row[6]) if row[6] else 0.0,
                    'amount': float(row[7]) if row[7] else 0.0,
                    'comment': row[8] or '',
                    'fuel_card_id': row[9],
                    'station_id': row[10],
                    'card_index': row[11] if row[11] is not None else 0
                })
            
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'operations': operations}),
                'isBase64Encoded': False
            }
        
        if method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            
            card_code = body_data.get('card_code', '').replace("'", "''")
            cursor.execute(f"SELECT id FROM fuel_cards WHERE card_code = '{card_code}'")
            card_row = cursor.fetchone()
            
            if not card_row:
                cursor.close()
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Card not found'}),
                    'isBase64Encoded': False
                }
            
            fuel_card_id = card_row[0]
            
            station_name = body_data.get('station_name', '').replace("'", "''")
            cursor.execute(f"SELECT id FROM stations WHERE name = '{station_name}'")
            station_row = cursor.fetchone()
            station_id = station_row[0] if station_row else 'NULL'
            
            operation_date_str = body_data.get('operation_date', '')
            
            if not operation_date_str:
                operation_date = datetime.now()
            else:
                try:
                    operation_date = datetime.strptime(operation_date_str, '%Y-%m-%dT%H:%M')
                except:
                    try:
                        operation_date = datetime.strptime(operation_date_str, '%Y-%m-%d %H:%M')
                    except:
                        try:
                            operation_date = datetime.strptime(operation_date_str, '%Y-%m-%d %H:%M:%S')
                        except:
                            operation_date = datetime.now()
            
            operation_type = body_data.get('operation_type', '').replace("'", "''")
            quantity = float(body_data.get('quantity', 0))
            price = float(body_data.get('price', 0))
            amount = float(body_data.get('amount', 0))
            comment = body_data.get('comment', '').replace("'", "''")
            operation_date_formatted = operation_date.strftime('%Y-%m-%d %H:%M:%S')
            
            cursor.execute(f"""
                INSERT INTO card_operations 
                (fuel_card_id, station_id, operation_date, operation_type, quantity, price, amount, comment)
                VALUES ({fuel_card_id}, {station_id}, '{operation_date_formatted}', '{operation_type}', {quantity}, {price}, {amount}, '{comment}')
                RETURNING id, operation_date, operation_type, quantity, price, amount, comment
            """)
            
            row = cursor.fetchone()
            conn.commit()
            cursor.close()
            conn.close()
            
            operation = {
                'id': row[0],
                'card_code': card_code,
                'station_name': station_name,
                'operation_date': row[1].strftime('%Y-%m-%d %H:%M') if row[1] else '',
                'operation_type': row[2],
                'quantity': float(row[3]) if row[3] else 0.0,
                'price': float(row[4]) if row[4] else 0.0,
                'amount': float(row[5]) if row[5] else 0.0,
                'comment': row[6] or ''
            }
            
            return {
                'statusCode': 201,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'operation': operation}),
                'isBase64Encoded': False
            }
        
        if method == 'PUT':
            body_data = json.loads(event.get('body', '{}'))
            operation_id = body_data.get('id')
            
            card_code = body_data.get('card_code')
            cursor.execute("SELECT id FROM fuel_cards WHERE card_code = %s", (card_code,))
            card_row = cursor.fetchone()
            fuel_card_id = card_row[0] if card_row else None
            
            station_name = body_data.get('station_name')
            cursor.execute("SELECT id FROM stations WHERE name = %s", (station_name,))
            station_row = cursor.fetchone()
            station_id = station_row[0] if station_row else None
            
            operation_date_str = body_data.get('operation_date')
            if not operation_date_str:
                operation_date = datetime.now()
            else:
                try:
                    operation_date = datetime.strptime(operation_date_str, '%Y-%m-%d %H:%M')
                except:
                    try:
                        operation_date = datetime.strptime(operation_date_str, '%Y-%m-%d %H:%M:%S')
                    except:
                        try:
                            operation_date = datetime.strptime(operation_date_str, '%Y-%m-%dT%H:%M')
                        except:
                            operation_date = datetime.now()
            
            cursor.execute("""
                UPDATE card_operations
                SET fuel_card_id = %s, station_id = %s, operation_date = %s,
                    operation_type = %s, quantity = %s, price = %s, amount = %s, comment = %s
                WHERE id = %s
                RETURNING id, operation_date, operation_type, quantity, price, amount, comment
            """, (
                fuel_card_id,
                station_id,
                operation_date,
                body_data.get('operation_type'),
                body_data.get('quantity'),
                body_data.get('price'),
                body_data.get('amount'),
                body_data.get('comment', ''),
                operation_id
            ))
            
            row = cursor.fetchone()
            conn.commit()
            cursor.close()
            conn.close()
            
            if row:
                operation = {
                    'id': row[0],
                    'card_code': card_code,
                    'station_name': station_name,
                    'operation_date': row[1].strftime('%Y-%m-%d %H:%M') if row[1] else '',
                    'operation_type': row[2],
                    'quantity': float(row[3]) if row[3] else 0.0,
                    'price': float(row[4]) if row[4] else 0.0,
                    'amount': float(row[5]) if row[5] else 0.0,
                    'comment': row[6] or ''
                }
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'operation': operation}),
                    'isBase64Encoded': False
                }
            else:
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Operation not found'}),
                    'isBase64Encoded': False
                }
        
        if method == 'DELETE':
            params = event.get('queryStringParameters') or {}
            operation_id = params.get('id')
            
            if not operation_id:
                cursor.close()
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Operation ID required'}),
                    'isBase64Encoded': False
                }
            
            cursor.execute("DELETE FROM card_operations WHERE id = %s", (operation_id,))
            conn.commit()
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'success': True}),
                'isBase64Encoded': False
            }
        
        cursor.close()
        conn.close()
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': f'Server error: {str(e)}'}),
            'isBase64Encoded': False
        }