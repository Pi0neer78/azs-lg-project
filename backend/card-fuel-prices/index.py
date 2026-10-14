import json
import os
import psycopg2
from typing import Dict, Any

HEADERS = {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}


def resp(code: int, data: dict) -> Dict[str, Any]:
    return {'statusCode': code, 'headers': HEADERS, 'body': json.dumps(data), 'isBase64Encoded': False}


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    API доступного топлива для карт с видом "Рубль": список, добавление, изменение цены и удаление.
    Args: event - dict с httpMethod, body, queryStringParameters
          context - объект с атрибутом request_id
    Returns: HTTP response dict
    '''
    method = event.get('httpMethod', 'GET')

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

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    params = event.get('queryStringParameters') or {}

    if method == 'GET':
        card_id = int(params.get('fuel_card_id', 0))
        cur.execute(f"""
            SELECT p.id, p.fuel_card_id, p.fuel_type_id, ft.name, p.price
            FROM card_fuel_prices p
            JOIN fuel_types ft ON ft.id = p.fuel_type_id
            WHERE p.fuel_card_id = {card_id}
            ORDER BY ft.name
        """)
        items = [
            {'id': r[0], 'fuel_card_id': r[1], 'fuel_type_id': r[2], 'fuel_type': r[3], 'price': float(r[4])}
            for r in cur.fetchall()
        ]
        cur.close()
        conn.close()
        return resp(200, {'prices': items})

    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        card_id = int(body.get('fuel_card_id', 0))
        fuel_type_id = int(body.get('fuel_type_id', 0))
        price = float(body.get('price', 0))

        cur.execute(f"SELECT name, unit FROM fuel_types WHERE id = {fuel_type_id}")
        ft = cur.fetchone()
        if not ft or ft[1] == '₽':
            cur.close()
            conn.close()
            return resp(400, {'error': 'invalid_fuel_type'})

        cur.execute(f"SELECT id FROM card_fuel_prices WHERE fuel_card_id = {card_id} AND fuel_type_id = {fuel_type_id}")
        if cur.fetchone():
            cur.close()
            conn.close()
            return resp(409, {'error': 'duplicate'})

        cur.execute(f"""
            INSERT INTO card_fuel_prices (fuel_card_id, fuel_type_id, price)
            VALUES ({card_id}, {fuel_type_id}, {price})
            RETURNING id
        """)
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        return resp(201, {'price': {'id': new_id, 'fuel_card_id': card_id, 'fuel_type_id': fuel_type_id, 'fuel_type': ft[0], 'price': price}})

    if method == 'PUT':
        body = json.loads(event.get('body') or '{}')
        item_id = int(body.get('id', 0))
        price = float(body.get('price', 0))
        cur.execute(f"UPDATE card_fuel_prices SET price = {price} WHERE id = {item_id}")
        conn.commit()
        cur.close()
        conn.close()
        return resp(200, {'success': True})

    if method == 'DELETE':
        item_id = int(params.get('id', 0))
        cur.execute(f"DELETE FROM card_fuel_prices WHERE id = {item_id}")
        conn.commit()
        cur.close()
        conn.close()
        return resp(200, {'success': True})

    cur.close()
    conn.close()
    return resp(405, {'error': 'method_not_allowed'})
