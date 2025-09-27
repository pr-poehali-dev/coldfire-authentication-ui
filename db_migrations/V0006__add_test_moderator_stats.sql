-- Добавляем тестовые данные для статистики модераторов
INSERT INTO t_p7304060_coldfire_authenticat.moderator_stats 
(moderator_id, total_tickets_closed, average_rating, total_reviews, response_time_avg, last_active)
SELECT 
    u.id,
    CASE 
        WHEN u.username = 'artyom_spartan' THEN 45
        WHEN u.username = 'miller_ranger' THEN 38
        WHEN u.username = 'khan_mystic' THEN 42
        WHEN u.username = 'ulman_spartan' THEN 35
        WHEN u.username = 'bourbon_trader' THEN 28
        WHEN u.username = 'stepan_guard' THEN 31
        WHEN u.username = 'danila_ranger' THEN 22
        ELSE 15
    END as tickets_closed,
    CASE 
        WHEN u.username = 'artyom_spartan' THEN 4.8
        WHEN u.username = 'miller_ranger' THEN 4.6
        WHEN u.username = 'khan_mystic' THEN 4.9
        WHEN u.username = 'ulman_spartan' THEN 4.3
        WHEN u.username = 'bourbon_trader' THEN 4.1
        WHEN u.username = 'stepan_guard' THEN 4.4
        WHEN u.username = 'danila_ranger' THEN 4.2
        ELSE 4.0
    END as rating,
    CASE 
        WHEN u.username = 'artyom_spartan' THEN 32
        WHEN u.username = 'miller_ranger' THEN 28
        WHEN u.username = 'khan_mystic' THEN 35
        WHEN u.username = 'ulman_spartan' THEN 25
        WHEN u.username = 'bourbon_trader' THEN 18
        WHEN u.username = 'stepan_guard' THEN 22
        WHEN u.username = 'danila_ranger' THEN 15
        ELSE 8
    END as reviews,
    CASE 
        WHEN u.username = 'artyom_spartan' THEN 15
        WHEN u.username = 'miller_ranger' THEN 22
        WHEN u.username = 'khan_mystic' THEN 12
        WHEN u.username = 'ulman_spartan' THEN 25
        WHEN u.username = 'bourbon_trader' THEN 35
        WHEN u.username = 'stepan_guard' THEN 28
        WHEN u.username = 'danila_ranger' THEN 32
        ELSE 45
    END as response_time,
    NOW() - INTERVAL '1 hour' * FLOOR(random() * 48) as last_active
FROM t_p7304060_coldfire_authenticat.users u
WHERE u.role = 'moderator'
ON CONFLICT (moderator_id) 
DO UPDATE SET 
    total_tickets_closed = EXCLUDED.total_tickets_closed,
    average_rating = EXCLUDED.average_rating,
    total_reviews = EXCLUDED.total_reviews,
    response_time_avg = EXCLUDED.response_time_avg,
    last_active = EXCLUDED.last_active;

-- Добавляем тестовые рейтинги
INSERT INTO t_p7304060_coldfire_authenticat.moderator_ratings 
(moderator_id, ticket_id, rating, review_text, user_id, created_at)
SELECT 
    (SELECT id FROM t_p7304060_coldfire_authenticat.users WHERE username = 'artyom_spartan'),
    t.id,
    4 + FLOOR(random() * 2),
    CASE 
        WHEN random() < 0.8 THEN 'Быстро решил проблему, спасибо!'
        WHEN random() < 0.9 THEN 'Отличная работа, очень доволен'
        ELSE 'Хороший модератор, рекомендую'
    END,
    t.user_id,
    t.created_at + INTERVAL '1 hour'
FROM t_p7304060_coldfire_authenticat.support_tickets t
WHERE t.status = 'closed' AND t.assigned_moderator_id IS NOT NULL
LIMIT 15;

-- Обновляем некоторые заявки как закрытые сегодня
UPDATE t_p7304060_coldfire_authenticat.support_tickets 
SET 
    status = 'closed',
    closed_at = CURRENT_TIMESTAMP - INTERVAL '1 hour' * FLOOR(random() * 12),
    assigned_moderator_id = (
        SELECT id FROM t_p7304060_coldfire_authenticat.users 
        WHERE role = 'moderator' 
        ORDER BY random() 
        LIMIT 1
    )
WHERE id IN (
    SELECT id FROM t_p7304060_coldfire_authenticat.support_tickets 
    WHERE status != 'closed'
    ORDER BY random()
    LIMIT 3
);