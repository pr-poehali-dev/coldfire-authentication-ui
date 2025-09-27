import json
import os
from decimal import Decimal
from datetime import datetime
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Получает статистику модераторов и системы поддержки
    Args: event с httpMethod, queryStringParameters для moderator_id
          context - объект с request_id, function_name
    Returns: HTTP response со статистикой модератора, топ-модераторов и системы
    '''
    method: str = event.get('httpMethod', 'GET')
    
    # Handle CORS OPTIONS request
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
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
        # Получаем ID модератора из параметров
        params = event.get('queryStringParameters') or {}
        moderator_id = params.get('moderator_id')
        
        if not moderator_id:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'moderator_id is required'})
            }
        
        conn = psycopg2.connect(database_url)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Получаем статистику конкретного модератора
        cur.execute("""
            SELECT 
                ms.total_tickets_closed,
                ms.average_rating,
                ms.total_reviews,
                ms.response_time_avg,
                ms.last_active
            FROM t_p7304060_coldfire_authenticat.moderator_stats ms
            WHERE ms.moderator_id = %s
        """, (moderator_id,))
        
        moderator_stats = cur.fetchone()
        
        if not moderator_stats:
            # Если статистики нет, создаем пустую
            moderator_stats = {
                'total_tickets_closed': 0,
                'average_rating': 0.0,
                'total_reviews': 0,
                'response_time_avg': 0,
                'last_active': None
            }
        
        # Получаем топ модераторов
        cur.execute("""
            SELECT 
                u.username,
                u.station,
                ms.total_tickets_closed,
                ms.average_rating,
                ms.total_reviews
            FROM t_p7304060_coldfire_authenticat.moderator_stats ms
            JOIN t_p7304060_coldfire_authenticat.users u ON u.id = ms.moderator_id
            WHERE u.role = 'moderator' AND ms.total_tickets_closed > 0
            ORDER BY ms.average_rating DESC, ms.total_tickets_closed DESC
            LIMIT 10
        """)
        
        top_moderators = cur.fetchall()
        
        # Получаем системную статистику
        cur.execute("""
            SELECT 
                COUNT(*) as total_tickets,
                COUNT(*) FILTER (WHERE status = 'open') as open_tickets,
                COUNT(*) FILTER (WHERE status = 'closed' AND DATE(closed_at) = CURRENT_DATE) as closed_today
            FROM t_p7304060_coldfire_authenticat.support_tickets
        """)
        
        ticket_stats = cur.fetchone()
        
        # Средний рейтинг системы
        cur.execute("""
            SELECT AVG(rating) as avg_rating
            FROM t_p7304060_coldfire_authenticat.moderator_ratings
        """)
        
        avg_rating_result = cur.fetchone()
        avg_rating = avg_rating_result['avg_rating'] if avg_rating_result['avg_rating'] else 0.0
        
        # Среднее время ответа (примерно)
        cur.execute("""
            SELECT AVG(response_time_avg) as avg_response_time
            FROM t_p7304060_coldfire_authenticat.moderator_stats
            WHERE response_time_avg > 0
        """)
        
        response_time_result = cur.fetchone()
        avg_response_time = response_time_result['avg_response_time'] if response_time_result['avg_response_time'] else 45
        
        system_stats = {
            'total_tickets': ticket_stats['total_tickets'],
            'open_tickets': ticket_stats['open_tickets'],
            'closed_today': ticket_stats['closed_today'],
            'average_response_time': int(avg_response_time),
            'user_satisfaction': min(100, max(0, (avg_rating / 5.0) * 100))
        }
        
        def convert_for_json(obj):
            """Конвертирует Decimal и datetime в JSON-совместимые типы"""
            if isinstance(obj, dict):
                return {key: convert_for_json(value) for key, value in obj.items()}
            elif isinstance(obj, list):
                return [convert_for_json(item) for item in obj]
            elif isinstance(obj, Decimal):
                return float(obj)
            elif isinstance(obj, datetime):
                return obj.isoformat()
            return obj
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'stats': convert_for_json(dict(moderator_stats)) if moderator_stats else {},
                'top_moderators': convert_for_json([dict(mod) for mod in top_moderators]),
                'system_stats': convert_for_json(system_stats)
            })
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