import json
import os
import psycopg2
import hashlib
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Авторизация пользователей в системе поддержки Coldfire Project
    Args: event с httpMethod, body (login/password) или регистрационными данными
    Returns: HTTP response с токеном и данными пользователя или ошибкой
    '''
    method: str = event.get('httpMethod', 'GET')
    
    # Handle CORS OPTIONS request
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    try:
        body_data = json.loads(event.get('body', '{}'))
        action = body_data.get('action')  # 'login' or 'register'
        username = body_data.get('username', '').strip()
        password = body_data.get('password', '').strip()
        
        if not username or not password:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Логин и пароль обязательны'})
            }
        
        # Подключение к базе данных
        DATABASE_URL = os.environ.get('DATABASE_URL')
        if not DATABASE_URL:
            return {
                'statusCode': 500,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Database connection error'})
            }
        
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        if action == 'login':
            # Авторизация
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            
            cur.execute("""
                SELECT id, username, email, role, is_banned, station, avatar_url, warning_count
                FROM users 
                WHERE username = %s AND password_hash = %s
            """, (username, password_hash))
            
            user_data = cur.fetchone()
            
            if not user_data:
                return {
                    'statusCode': 401,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Неверный логин или пароль'})
                }
            
            user_id, username, email, role, is_banned, station, avatar_url, warning_count = user_data
            
            if is_banned:
                return {
                    'statusCode': 403,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Аккаунт заблокирован'})
                }
            
            # Обновляем время последнего входа
            cur.execute("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = %s", (user_id,))
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': True,
                    'user': {
                        'id': user_id,
                        'username': username,
                        'email': email,
                        'role': role,
                        'station': station,
                        'avatar_url': avatar_url,
                        'warning_count': warning_count
                    },
                    'token': f'token_{user_id}_{username}'  # Простой токен для демо
                })
            }
            
        elif action == 'register':
            # Регистрация
            email = body_data.get('email', '').strip()
            
            if not email:
                return {
                    'statusCode': 400,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Email обязателен для регистрации'})
                }
            
            # Проверка существования пользователя
            cur.execute("SELECT id FROM users WHERE username = %s OR email = %s", (username, email))
            if cur.fetchone():
                return {
                    'statusCode': 409,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Пользователь с таким логином или email уже существует'})
                }
            
            # Создание нового пользователя
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            station = 'Проспект Мира'  # Начальная станция для новичков
            
            cur.execute("""
                INSERT INTO users (username, email, password_hash, role, station, avatar_url)
                VALUES (%s, %s, %s, 'user', %s, '/avatars/default.jpg')
                RETURNING id
            """, (username, email, password_hash, station))
            
            user_id = cur.fetchone()[0]
            conn.commit()
            
            return {
                'statusCode': 201,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': True,
                    'message': 'Регистрация успешна! Добро пожаловать в метро!',
                    'user': {
                        'id': user_id,
                        'username': username,
                        'email': email,
                        'role': 'user',
                        'station': station,
                        'avatar_url': '/avatars/default.jpg',
                        'warning_count': 0
                    },
                    'token': f'token_{user_id}_{username}'
                })
            }
        
        else:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Неизвестное действие'})
            }
            
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Неверный формат JSON'})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'Ошибка сервера: {str(e)}'})
        }
    finally:
        if 'conn' in locals():
            conn.close()