import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Управление заявками поддержки - получение, создание, обновление статуса
    Args: event с httpMethod, queryStringParameters для GET, body для POST/PUT
    Returns: HTTP response с данными заявок или результатом операции
    '''
    method: str = event.get('httpMethod', 'GET')
    
    # Handle CORS OPTIONS request
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    try:
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
        
        headers = event.get('headers', {})
        user_id = headers.get('X-User-Id')
        
        if method == 'GET':
            # Получение списка заявок
            query_params = event.get('queryStringParameters') or {}
            user_role = query_params.get('role', 'user')
            
            if user_role == 'moderator':
                # Модераторы видят все заявки
                cur.execute("""
                    SELECT t.id, t.title, t.status, t.priority, t.category, t.created_at, t.updated_at,
                           u.username, u.email, u.station, u.avatar_url,
                           COUNT(m.id) as message_count,
                           MAX(m.created_at) as last_message_at
                    FROM support_tickets t
                    JOIN users u ON t.user_id = u.id
                    LEFT JOIN messages m ON t.id = m.ticket_id
                    GROUP BY t.id, u.username, u.email, u.station, u.avatar_url
                    ORDER BY t.updated_at DESC
                """)
            else:
                # Пользователи видят только свои заявки
                if not user_id:
                    return {
                        'statusCode': 401,
                        'headers': {'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'User ID required'})
                    }
                
                cur.execute("""
                    SELECT t.id, t.title, t.status, t.priority, t.category, t.created_at, t.updated_at,
                           u.username, u.email, u.station, u.avatar_url,
                           COUNT(m.id) as message_count,
                           MAX(m.created_at) as last_message_at
                    FROM support_tickets t
                    JOIN users u ON t.user_id = u.id
                    LEFT JOIN messages m ON t.id = m.ticket_id
                    WHERE t.user_id = %s
                    GROUP BY t.id, u.username, u.email, u.station, u.avatar_url
                    ORDER BY t.updated_at DESC
                """, (user_id,))
            
            tickets = []
            for row in cur.fetchall():
                tickets.append({
                    'id': row[0],
                    'title': row[1],
                    'status': row[2],
                    'priority': row[3],
                    'category': row[4],
                    'created_at': row[5].isoformat() if row[5] else None,
                    'updated_at': row[6].isoformat() if row[6] else None,
                    'user': {
                        'username': row[7],
                        'email': row[8],
                        'station': row[9],
                        'avatar_url': row[10]
                    },
                    'message_count': row[11],
                    'last_message_at': row[12].isoformat() if row[12] else None
                })
            
            return {
                'statusCode': 200,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'tickets': tickets})
            }
            
        elif method == 'POST':
            # Создание новой заявки
            body_data = json.loads(event.get('body', '{}'))
            
            if not user_id:
                return {
                    'statusCode': 401,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'User ID required'})
                }
            
            title = body_data.get('title', '').strip()
            category = body_data.get('category', 'general')
            priority = body_data.get('priority', 'medium')
            
            if not title:
                return {
                    'statusCode': 400,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Title is required'})
                }
            
            cur.execute("""
                INSERT INTO support_tickets (title, user_id, category, priority)
                VALUES (%s, %s, %s, %s)
                RETURNING id, created_at
            """, (title, user_id, category, priority))
            
            ticket_id, created_at = cur.fetchone()
            conn.commit()
            
            return {
                'statusCode': 201,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': True,
                    'ticket': {
                        'id': ticket_id,
                        'title': title,
                        'status': 'open',
                        'priority': priority,
                        'category': category,
                        'created_at': created_at.isoformat()
                    }
                })
            }
            
        elif method == 'PUT':
            # Обновление статуса заявки (только для модераторов)
            body_data = json.loads(event.get('body', '{}'))
            ticket_id = body_data.get('ticket_id')
            new_status = body_data.get('status')
            moderator_id = body_data.get('moderator_id')
            
            if not ticket_id or not new_status:
                return {
                    'statusCode': 400,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Ticket ID and status required'})
                }
            
            # Обновляем статус и назначаем модератора
            cur.execute("""
                UPDATE support_tickets 
                SET status = %s, assigned_moderator_id = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (new_status, moderator_id, ticket_id))
            
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'message': 'Ticket updated'})
            }
        
        else:
            return {
                'statusCode': 405,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Method not allowed'})
            }
            
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Invalid JSON format'})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'Server error: {str(e)}'})
        }
    finally:
        if 'conn' in locals():
            conn.close()