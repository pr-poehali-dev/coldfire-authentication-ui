import json
import os
import random
import string
import hashlib
import base64
from datetime import datetime, timedelta
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Генерирует и проверяет капчи для регистрации
    Args: event - dict с httpMethod, body для создания/проверки капчи
          context - объект с request_id, function_name
    Returns: HTTP response с капчей или результатом проверки
    '''
    method: str = event.get('httpMethod', 'GET')
    
    # Handle CORS OPTIONS request
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    # Подключение к БД
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Database connection not configured'})
        }
    
    try:
        conn = psycopg2.connect(database_url)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        if method == 'GET':
            # Генерируем новую капчу
            return generate_captcha(cur, conn)
        elif method == 'POST':
            # Проверяем капчу
            body_str = event.get('body', '{}')
            if not body_str or body_str.strip() == '':
                body_str = '{}'
            body_data = json.loads(body_str)
            return verify_captcha(cur, conn, body_data)
        else:
            return {
                'statusCode': 405,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Method not allowed'})
            }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'Server error: {str(e)}'})
        }
    finally:
        if 'conn' in locals():
            conn.close()

def generate_captcha(cur, conn) -> Dict[str, Any]:
    """Генерирует новую капчу"""
    # Очищаем просроченные капчи
    cur.execute("""
        UPDATE t_p7304060_coldfire_authenticat.captcha_sessions 
        SET is_used = true 
        WHERE expires_at < NOW()
    """)
    
    # Генерируем случайный текст капчи (5 символов)
    captcha_text = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
    
    # Создаем уникальный токен сессии
    session_token = hashlib.sha256(
        f"{captcha_text}_{datetime.now().isoformat()}_{random.randint(1000, 9999)}".encode()
    ).hexdigest()[:32]
    
    # Сохраняем в БД
    cur.execute("""
        INSERT INTO t_p7304060_coldfire_authenticat.captcha_sessions 
        (session_token, captcha_text, created_at, expires_at)
        VALUES (%s, %s, NOW(), NOW() + INTERVAL '10 minutes')
    """, (session_token, captcha_text))
    conn.commit()
    
    # Генерируем простую ASCII-арт капчу
    ascii_captcha = generate_ascii_captcha(captcha_text)
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'session_token': session_token,
            'captcha_image': ascii_captcha,
            'expires_in': 600  # 10 минут в секундах
        })
    }

def verify_captcha(cur, conn, data: Dict[str, Any]) -> Dict[str, Any]:
    """Проверяет введенную капчу"""
    session_token = data.get('session_token', '')
    user_input = data.get('captcha_input', '').upper().strip()
    
    if not session_token or not user_input:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Missing session_token or captcha_input'})
        }
    
    # Проверяем капчу
    cur.execute("""
        SELECT captcha_text, is_used, expires_at 
        FROM t_p7304060_coldfire_authenticat.captcha_sessions 
        WHERE session_token = %s
    """, (session_token,))
    
    result = cur.fetchone()
    if not result:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Invalid session token'})
        }
    
    if result['is_used']:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Captcha already used'})
        }
    
    if datetime.now() > result['expires_at']:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Captcha expired'})
        }
    
    if user_input != result['captcha_text']:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Incorrect captcha'})
        }
    
    # Помечаем капчу как использованную
    cur.execute("""
        UPDATE t_p7304060_coldfire_authenticat.captcha_sessions 
        SET is_used = true 
        WHERE session_token = %s
    """, (session_token,))
    conn.commit()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'valid': True, 'message': 'Captcha verified successfully'})
    }

def generate_ascii_captcha(text: str) -> str:
    """Генерирует простую ASCII-арт капчу"""
    # Простые ASCII символы для каждой буквы/цифры
    ascii_patterns = {
        'A': ['  █  ', ' █ █ ', '█████', '█   █', '█   █'],
        'B': ['████ ', '█   █', '████ ', '█   █', '████ '],
        'C': [' ████', '█    ', '█    ', '█    ', ' ████'],
        'D': ['████ ', '█   █', '█   █', '█   █', '████ '],
        'E': ['█████', '█    ', '███  ', '█    ', '█████'],
        'F': ['█████', '█    ', '███  ', '█    ', '█    '],
        'G': [' ████', '█    ', '█ ███', '█   █', ' ████'],
        'H': ['█   █', '█   █', '█████', '█   █', '█   █'],
        'I': ['█████', '  █  ', '  █  ', '  █  ', '█████'],
        'J': ['█████', '    █', '    █', '█   █', ' ████'],
        'K': ['█   █', '█  █ ', '███  ', '█  █ ', '█   █'],
        'L': ['█    ', '█    ', '█    ', '█    ', '█████'],
        'M': ['█   █', '██ ██', '█ █ █', '█   █', '█   █'],
        'N': ['█   █', '██  █', '█ █ █', '█  ██', '█   █'],
        'O': [' ███ ', '█   █', '█   █', '█   █', ' ███ '],
        'P': ['████ ', '█   █', '████ ', '█    ', '█    '],
        'Q': [' ███ ', '█   █', '█ █ █', '█  ██', ' ████'],
        'R': ['████ ', '█   █', '████ ', '█  █ ', '█   █'],
        'S': [' ████', '█    ', ' ███ ', '    █', '████ '],
        'T': ['█████', '  █  ', '  █  ', '  █  ', '  █  '],
        'U': ['█   █', '█   █', '█   █', '█   █', ' ███ '],
        'V': ['█   █', '█   █', '█   █', ' █ █ ', '  █  '],
        'W': ['█   █', '█   █', '█ █ █', '██ ██', '█   █'],
        'X': ['█   █', ' █ █ ', '  █  ', ' █ █ ', '█   █'],
        'Y': ['█   █', ' █ █ ', '  █  ', '  █  ', '  █  '],
        'Z': ['█████', '   █ ', '  █  ', ' █   ', '█████'],
        '0': [' ███ ', '█   █', '█   █', '█   █', ' ███ '],
        '1': ['  █  ', ' ██  ', '  █  ', '  █  ', '█████'],
        '2': [' ███ ', '█   █', '  ██ ', ' █   ', '█████'],
        '3': [' ███ ', '█   █', '  ██ ', '█   █', ' ███ '],
        '4': ['█   █', '█   █', '█████', '    █', '    █'],
        '5': ['█████', '█    ', '████ ', '    █', '████ '],
        '6': [' ███ ', '█    ', '████ ', '█   █', ' ███ '],
        '7': ['█████', '    █', '   █ ', '  █  ', ' █   '],
        '8': [' ███ ', '█   █', ' ███ ', '█   █', ' ███ '],
        '9': [' ███ ', '█   █', ' ████', '    █', ' ███ ']
    }
    
    # Создаем многострочный ASCII-арт
    lines = ['', '', '', '', '']
    for char in text:
        if char in ascii_patterns:
            for i, line in enumerate(ascii_patterns[char]):
                lines[i] += line + ' '
    
    return '\n'.join(lines)