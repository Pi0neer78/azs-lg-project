import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    API для управления видами топлива: получение, создание, обновление и удаление.
    Поддерживает поле unit (л/руб/шт/кг) — единица измерения.
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
        
        if method == 'GET':
            cursor.execute("""
                SELECT id, name, code_1c, unit, created_at
                FROM fuel_types
                ORDER BY id
            """)
            rows = cursor.fetchall()
            
            fuel_types = []
            for row in rows:
                fuel_types.append({
                    'id': row[0],
                    'name': row[1],
                    'code_1c': row[2],
                    'unit': row[3] if row[3] else 'л',
                    'created_at': row[4].isoformat() if row[4] else None
                })
            
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'fuel_types': fuel_types}),
                'isBase64Encoded': False
            }
        
        if method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            unit = body_data.get('unit', 'л')
            
            cursor.execute("""
                INSERT INTO fuel_types (name, code_1c, unit)
                VALUES (%s, %s, %s)
                RETURNING id, name, code_1c, unit
            """, (
                body_data.get('name'),
                body_data.get('code_1c'),
                unit
            ))
            
            row = cursor.fetchone()
            conn.commit()
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 201,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'fuel_type': {'id': row[0], 'name': row[1], 'code_1c': row[2], 'unit': row[3] if row[3] else 'л'}}),
                'isBase64Encoded': False
            }
        
        if method == 'PUT':
            body_data = json.loads(event.get('body', '{}'))
            fuel_type_id = body_data.get('id')
            unit = body_data.get('unit', 'л')
            
            cursor.execute("""
                UPDATE fuel_types
                SET name = %s, code_1c = %s, unit = %s
                WHERE id = %s
                RETURNING id, name, code_1c, unit
            """, (
                body_data.get('name'),
                body_data.get('code_1c'),
                unit,
                fuel_type_id
            ))
            
            row = cursor.fetchone()
            conn.commit()
            cursor.close()
            conn.close()
            
            if row:
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'fuel_type': {'id': row[0], 'name': row[1], 'code_1c': row[2], 'unit': row[3] if row[3] else 'л'}}),
                    'isBase64Encoded': False
                }
            else:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Fuel type not found'}),
                    'isBase64Encoded': False
                }
        
        if method == 'DELETE':
            params = event.get('queryStringParameters') or {}
            fuel_type_id = params.get('id')
            
            if not fuel_type_id:
                cursor.close()
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Fuel type ID required'}),
                    'isBase64Encoded': False
                }
            
            cursor.execute("DELETE FROM fuel_types WHERE id = %s", (fuel_type_id,))
            conn.commit()
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True}),
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
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'Server error: {str(e)}'}),
            'isBase64Encoded': False
        }
