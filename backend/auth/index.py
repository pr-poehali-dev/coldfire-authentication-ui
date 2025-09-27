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
                FROM t_p7304060_coldfire_authenticat.users 
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
            
            # Обновляем время последнего входа и счетчик входов
            cur.execute("""
                UPDATE t_p7304060_coldfire_authenticat.users 
                SET last_login = CURRENT_TIMESTAMP, total_logins = COALESCE(total_logins, 0) + 1
                WHERE id = %s
            """, (user_id,))
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
            station = body_data.get('station', '').strip()
            captcha_token = body_data.get('captcha_token', '').strip()
            
            if not email or not station:
                return {
                    'statusCode': 400,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Email и станция обязательны для регистрации'})
                }
            
            if not captcha_token:
                return {
                    'statusCode': 400,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Пройдите проверку капчи'})
                }
            
            # Проверяем капчу
            cur.execute("""
                SELECT captcha_text, is_used, expires_at 
                FROM t_p7304060_coldfire_authenticat.captcha_sessions 
                WHERE session_token = %s
            """, (captcha_token,))
            
            captcha_result = cur.fetchone()
            if not captcha_result:
                return {
                    'statusCode': 400,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Недействительная капча'})
                }
            
            captcha_text, is_used, expires_at = captcha_result
            
            if is_used:
                return {
                    'statusCode': 400,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Капча уже использована'})
                }
            
            # Проверяем срок действия
            cur.execute("SELECT NOW()")
            current_time = cur.fetchone()[0]
            if current_time > expires_at:
                return {
                    'statusCode': 400,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Капча просрочена'})
                }
            
            # Помечаем капчу как использованную
            cur.execute("""
                UPDATE t_p7304060_coldfire_authenticat.captcha_sessions 
                SET is_used = true 
                WHERE session_token = %s
            """, (captcha_token,))
            
            # Проверка существования пользователя
            cur.execute("SELECT id FROM t_p7304060_coldfire_authenticat.users WHERE username = %s OR email = %s", (username, email))
            if cur.fetchone():
                return {
                    'statusCode': 409,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Пользователь с таким логином или email уже существует'})
                }
            
            # Создание нового пользователя
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            
            cur.execute("""
                INSERT INTO t_p7304060_coldfire_authenticat.users 
                (username, email, password_hash, role, station, avatar_url, total_logins, email_verified)
                VALUES (%s, %s, %s, 'user', %s, '/avatars/default.jpg', 1, true)
                RETURNING id
            """, (username, email, password_hash, station))
            
            user_id = cur.fetchone()[0]
            
            # Обновляем статистику входов
            cur.execute("""
                UPDATE t_p7304060_coldfire_authenticat.users 
                SET last_login = CURRENT_TIMESTAMP, total_logins = total_logins + 1 
                WHERE id = %s
            """, (user_id,))
            
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