-- Добавляем таблицы для системы рейтингов и отзывов
CREATE TABLE IF NOT EXISTS t_p7304060_coldfire_authenticat.moderator_ratings (
    id SERIAL PRIMARY KEY,
    moderator_id INTEGER REFERENCES t_p7304060_coldfire_authenticat.users(id),
    ticket_id INTEGER REFERENCES t_p7304060_coldfire_authenticat.support_tickets(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    user_id INTEGER REFERENCES t_p7304060_coldfire_authenticat.users(id)
);

-- Добавляем таблицу для статистики модераторов
CREATE TABLE IF NOT EXISTS t_p7304060_coldfire_authenticat.moderator_stats (
    id SERIAL PRIMARY KEY,
    moderator_id INTEGER REFERENCES t_p7304060_coldfire_authenticat.users(id) UNIQUE,
    total_tickets_closed INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0.0,
    total_reviews INTEGER DEFAULT 0,
    response_time_avg INTEGER DEFAULT 0,
    last_active TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Добавляем таблицу для системных сообщений
CREATE TABLE IF NOT EXISTS t_p7304060_coldfire_authenticat.system_messages (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES t_p7304060_coldfire_authenticat.support_tickets(id),
    message_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    action_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    is_processed BOOLEAN DEFAULT FALSE
);

-- Добавляем таблицу капчи
CREATE TABLE IF NOT EXISTS t_p7304060_coldfire_authenticat.captcha_sessions (
    id SERIAL PRIMARY KEY,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    captcha_text VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '10 minutes',
    is_used BOOLEAN DEFAULT FALSE
);

-- Добавляем новые поля в таблицу users
ALTER TABLE t_p7304060_coldfire_authenticat.users 
ADD COLUMN IF NOT EXISTS registration_ip VARCHAR(45),
ADD COLUMN IF NOT EXISTS total_logins INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Добавляем новые поля в таблицу support_tickets
ALTER TABLE t_p7304060_coldfire_authenticat.support_tickets 
ADD COLUMN IF NOT EXISTS closed_by_user BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS rating_given BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS auto_closed BOOLEAN DEFAULT FALSE;

-- Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_moderator_ratings_moderator ON t_p7304060_coldfire_authenticat.moderator_ratings(moderator_id);
CREATE INDEX IF NOT EXISTS idx_moderator_ratings_ticket ON t_p7304060_coldfire_authenticat.moderator_ratings(ticket_id);
CREATE INDEX IF NOT EXISTS idx_moderator_stats_moderator ON t_p7304060_coldfire_authenticat.moderator_stats(moderator_id);
CREATE INDEX IF NOT EXISTS idx_system_messages_ticket ON t_p7304060_coldfire_authenticat.system_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_captcha_token ON t_p7304060_coldfire_authenticat.captcha_sessions(session_token);

-- Инициализируем статистику для существующих модераторов
INSERT INTO t_p7304060_coldfire_authenticat.moderator_stats (moderator_id, total_tickets_closed, average_rating, total_reviews)
SELECT 
    u.id,
    0,
    0.0,
    0
FROM t_p7304060_coldfire_authenticat.users u
WHERE u.role = 'moderator'
ON CONFLICT (moderator_id) DO NOTHING;