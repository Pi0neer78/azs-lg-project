import json
import os
import uuid
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    CRUD операции для клиентов
    Args: event - dict с httpMethod (GET/POST/PUT/DELETE), body, queryStringParameters
          context - объект с атрибутами request_id, function_name
    Returns: HTTP response с данными клиентов или результатом операции
    '''
    method: str = event.get('httpMethod', 'GET')
    
    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept',
        'Access-Control-Max-Age': '86400'
    }
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': '',
            'isBase64Encoded': False
        }
    
    try:
        database_url = os.environ.get('DATABASE_URL')
        if not database_url:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    **cors_headers
                },
                'body': json.dumps({'error': 'Database configuration error'}),
                'isBase64Encoded': False
            }
        
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        if method == 'GET':
            cursor.execute("""
                SELECT id, inn, name, address, phone, email, login, admin, operator
                FROM clients 
                ORDER BY id
            """)
            rows = cursor.fetchall()
            clients = []
            for row in rows:
                clients.append({
                    'id': row[0],
                    'inn': row[1],
                    'name': row[2],
                    'address': row[3],
                    'phone': row[4],
                    'email': row[5],
                    'login': row[6],
                    'admin': row[7],
                    'operator': bool(row[8])
                })
            
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    **cors_headers
                },
                'body': json.dumps({'clients': clients}),
                'isBase64Encoded': False
            }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            
            print(f"Creating client with data: {json.dumps(body_data, ensure_ascii=False)}")
            
            email = body_data.get('email', '').strip() or None
            phone = body_data.get('phone', '').strip() or None
            login = body_data.get('login', '').strip() or f'admin_{uuid.uuid4().hex[:8]}'
            
            print(f"Normalized values - email: {email}, phone: {phone}, login: {login}")
            
            cursor.execute("""
                SELECT COUNT(*) FROM clients 
                WHERE login = %s 
                   OR (email IS NOT NULL AND email = %s) 
                   OR (phone IS NOT NULL AND phone = %s)
            """, (login, email, phone))
            
            conflict_count = cursor.fetchone()[0]
            print(f"Conflicts found: {conflict_count}")
            
            if conflict_count > 0:
                cursor.execute("""
                    SELECT login, email, phone FROM clients 
                    WHERE login = %s 
                       OR (email IS NOT NULL AND email = %s) 
                       OR (phone IS NOT NULL AND phone = %s)
                """, (login, email, phone))
                conflicts = cursor.fetchall()
                print(f"Conflicting records: {conflicts}")
            
            inn = body_data.get('inn', '').strip() or ''

            cursor.execute("""
                INSERT INTO clients (inn, name, address, phone, email, login, password, admin, operator)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, inn, name, address, phone, email, login, admin, operator
            """, (
                inn,
                body_data.get('name', '').strip(),
                body_data.get('address', '').strip() or None,
                phone,
                email,
                login,
                body_data.get('password'),
                body_data.get('admin', False),
                body_data.get('operator', False)
            ))
            
            row = cursor.fetchone()
            conn.commit()
            
            client = {
                'id': row[0],
                'inn': row[1],
                'name': row[2],
                'address': row[3],
                'phone': row[4],
                'email': row[5],
                'login': row[6],
                'admin': row[7],
                'operator': bool(row[8])
            }
            
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 201,
                'headers': {
                    'Content-Type': 'application/json',
                    **cors_headers
                },
                'body': json.dumps({'client': client}),
                'isBase64Encoded': False
            }
        
        elif method == 'PUT':
            body_data = json.loads(event.get('body', '{}'))
            client_id = body_data.get('id')
            
            cursor.execute("""
                UPDATE clients 
                SET inn = %s, name = %s, address = %s, phone = %s, email = %s, login = %s, operator = %s
                WHERE id = %s
                RETURNING id, inn, name, address, phone, email, login, admin, operator
            """, (
                body_data.get('inn'),
                body_data.get('name'),
                body_data.get('address'),
                body_data.get('phone'),
                body_data.get('email'),
                body_data.get('login'),
                body_data.get('operator', False),
                client_id
            ))
            
            row = cursor.fetchone()
            conn.commit()
            
            if row:
                client = {
                    'id': row[0],
                    'inn': row[1],
                    'name': row[2],
                    'address': row[3],
                    'phone': row[4],
                    'email': row[5],
                    'login': row[6],
                    'admin': row[7],
                    'operator': bool(row[8])
                }
                
                cursor.close()
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        **cors_headers
                    },
                    'body': json.dumps({'client': client}),
                    'isBase64Encoded': False
                }
            else:
                cursor.close()
                conn.close()
                
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        **cors_headers
                    },
                    'body': json.dumps({'error': 'Client not found'}),
                    'isBase64Encoded': False
                }
        
        elif method == 'DELETE':
            query_params = event.get('queryStringParameters', {})
            client_id = query_params.get('id')
            
            if not client_id:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        **cors_headers
                    },
                    'body': json.dumps({'error': 'Client ID is required'}),
                    'isBase64Encoded': False
                }
            
            cursor.execute("DELETE FROM clients WHERE id = %s", (client_id,))
            conn.commit()
            
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    **cors_headers
                },
                'body': json.dumps({'success': True}),
                'isBase64Encoded': False
            }
        
        else:
            return {
                'statusCode': 405,
                'headers': {
                    'Content-Type': 'application/json',
                    **cors_headers
                },
                'body': json.dumps({'error': 'Method not allowed'}),
                'isBase64Encoded': False
            }
    
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        
        if 'conn' in locals():
            conn.close()
        
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                **cors_headers
            },
            'body': json.dumps({'error': f'Server error: {str(e)}'}),
            'isBase64Encoded': False
        }