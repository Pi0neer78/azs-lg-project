import json
import authz
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    API для управления АЗС: получение, создание, обновление и удаление станций
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
                'Access-Control-Allow-Headers': authz.ALLOW_HEADERS,
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
        
        if method != 'GET':
            user, auth_err = authz.authenticate(conn, event)
            if auth_err or not user['admin']:
                cursor.close()
                conn.close()
                return auth_err or authz.forbidden()
        
        if method == 'GET':
            cursor.execute("""
                SELECT id, name, code_1c, address, created_at
                FROM stations
                ORDER BY id
            """)
            rows = cursor.fetchall()
            
            stations = []
            for row in rows:
                stations.append({
                    'id': row[0],
                    'name': row[1],
                    'code_1c': row[2],
                    'address': row[3],
                    'created_at': row[4].isoformat() if row[4] else None
                })
            
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'stations': stations}),
                'isBase64Encoded': False
            }
        
        if method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            
            cursor.execute("""
                INSERT INTO stations (name, code_1c, address)
                VALUES (%s, %s, %s)
                RETURNING id, name, code_1c, address
            """, (
                body_data.get('name'),
                body_data.get('code_1c'),
                body_data.get('address')
            ))
            
            row = cursor.fetchone()
            conn.commit()
            cursor.close()
            conn.close()
            
            station = {
                'id': row[0],
                'name': row[1],
                'code_1c': row[2],
                'address': row[3]
            }
            
            return {
                'statusCode': 201,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'station': station}),
                'isBase64Encoded': False
            }
        
        if method == 'PUT':
            body_data = json.loads(event.get('body', '{}'))
            station_id = body_data.get('id')
            
            cursor.execute("""
                UPDATE stations
                SET name = %s, code_1c = %s, address = %s
                WHERE id = %s
                RETURNING id, name, code_1c, address
            """, (
                body_data.get('name'),
                body_data.get('code_1c'),
                body_data.get('address'),
                station_id
            ))
            
            row = cursor.fetchone()
            conn.commit()
            cursor.close()
            conn.close()
            
            if row:
                station = {
                    'id': row[0],
                    'name': row[1],
                    'code_1c': row[2],
                    'address': row[3]
                }
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'station': station}),
                    'isBase64Encoded': False
                }
            else:
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Station not found'}),
                    'isBase64Encoded': False
                }
        
        if method == 'DELETE':
            params = event.get('queryStringParameters') or {}
            station_id = params.get('id')
            
            if not station_id:
                cursor.close()
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Station ID required'}),
                    'isBase64Encoded': False
                }
            
            cursor.execute("DELETE FROM stations WHERE id = %s", (station_id,))
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
            'body': json.dumps({'error': 'Ошибка сервера'}),
            'isBase64Encoded': False
        }
