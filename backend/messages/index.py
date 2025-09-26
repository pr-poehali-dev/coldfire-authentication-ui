import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Управление сообщениями в чатах поддержки - отправка, получение, жалобы
    Args: event с httpMethod, queryStringParameters для GET, body для POST
    Returns: HTTP response с сообщениями или результатом операции
    '''
    method: str = event.get('httpMethod', 'GET')
    
    # Handle CORS OPTIONS request
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
            # Получение сообщений для конкретной заявки
            query_params = event.get('queryStringParameters') or {}
            ticket_id = query_params.get('ticket_id')
            
            if not ticket_id:
                return {
                    'statusCode': 400,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Ticket ID required'})
                }
            
            # Получаем сообщения с информацией об отправителях
            cur.execute("""
                SELECT m.id, m.content, m.message_type, m.attachment_url, 
                       m.created_at, m.edited_at, m.is_flagged,
                       u.username, u.role, u.station, u.avatar_url
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                WHERE m.ticket_id = %s
                ORDER BY m.created_at ASC
            """, (ticket_id,))
            
            messages = []
            for row in cur.fetchall():
                messages.append({
                    'id': row[0],
                    'content': row[1],
                    'message_type': row[2],
                    'attachment_url': row[3],
                    'created_at': row[4].isoformat() if row[4] else None,
                    'edited_at': row[5].isoformat() if row[5] else None,
                    'is_flagged': row[6],
                    'sender': {
                        'username': row[7],
                        'role': row[8],
                        'station': row[9],
                        'avatar_url': row[10]
                    }
                })
            
            return {
                'statusCode': 200,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'messages': messages})
            }
            
        elif method == 'POST':
            # Отправка нового сообщения или подача жалобы
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action', 'send_message')
            
            if not user_id:
                return {
                    'statusCode': 401,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'User ID required'})
                }
            
            if action == 'send_message':
                # Отправка сообщения
                ticket_id = body_data.get('ticket_id')
                content = body_data.get('content', '').strip()
                message_type = body_data.get('message_type', 'text')
                
                if not ticket_id or not content:
                    return {
                        'statusCode': 400,
                        'headers': {'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Ticket ID and content required'})
                    }
                
                if len(content) > 1000:
                    return {
                        'statusCode': 400,
                        'headers': {'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Message too long (max 1000 characters)'})
                    }
                
                # Вставляем сообщение
                cur.execute("""
                    INSERT INTO messages (ticket_id, sender_id, content, message_type)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id, created_at
                """, (ticket_id, user_id, content, message_type))
                
                message_id, created_at = cur.fetchone()
                
                # Обновляем время последнего обновления заявки
                cur.execute("""
                    UPDATE support_tickets 
                    SET updated_at = CURRENT_TIMESTAMP 
                    WHERE id = %s
                """, (ticket_id,))
                
                conn.commit()
                
                return {
                    'statusCode': 201,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'success': True,
                        'message': {
                            'id': message_id,
                            'content': content,
                            'created_at': created_at.isoformat()
                        }
                    })
                }
                
            elif action == 'report_message':
                # Подача жалобы на сообщение
                message_id = body_data.get('message_id')
                reason = body_data.get('reason', '').strip()
                description = body_data.get('description', '').strip()
                
                if not message_id or not reason:
                    return {
                        'statusCode': 400,
                        'headers': {'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Message ID and reason required'})
                    }
                
                # Получаем ID автора сообщения
                cur.execute("SELECT sender_id FROM messages WHERE id = %s", (message_id,))
                result = cur.fetchone()
                if not result:
                    return {
                        'statusCode': 404,
                        'headers': {'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Message not found'})
                    }
                
                reported_user_id = result[0]
                
                # Создаем жалобу
                cur.execute("""
                    INSERT INTO reports (message_id, reporter_id, reported_user_id, reason, description)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                """, (message_id, user_id, reported_user_id, reason, description))
                
                report_id = cur.fetchone()[0]
                
                # Помечаем сообщение как содержащее жалобу
                cur.execute("""
                    UPDATE messages 
                    SET is_flagged = TRUE, flag_reason = %s 
                    WHERE id = %s
                """, (reason, message_id))
                
                # Увеличиваем счетчик предупреждений пользователя
                cur.execute("""
                    UPDATE users 
                    SET warning_count = warning_count + 1 
                    WHERE id = %s
                    RETURNING warning_count
                """, (reported_user_id,))
                
                warning_count = cur.fetchone()[0]
                
                # Если 3 предупреждения - блокируем пользователя
                if warning_count >= 3:
                    cur.execute("""
                        UPDATE users 
                        SET is_banned = TRUE, ban_reason = 'Автоматическая блокировка за 3 нарушения'
                        WHERE id = %s
                    """, (reported_user_id,))
                
                conn.commit()
                
                return {
                    'statusCode': 201,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'success': True,
                        'report_id': report_id,
                        'warning_count': warning_count,
                        'user_banned': warning_count >= 3
                    })
                }
            
            else:
                return {
                    'statusCode': 400,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Unknown action'})
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