-- Добавление модераторов с тематикой Metro 2033
INSERT INTO users (username, email, password_hash, role, station, avatar_url) VALUES 
-- Модераторы станций
('artyom_spartan', 'artyom@vdnh.metro', '$2b$10$example_hash_1', 'moderator', 'ВДНХ', '/avatars/artyom.jpg'),
('miller_ranger', 'miller@polis.metro', '$2b$10$example_hash_2', 'moderator', 'Полис', '/avatars/miller.jpg'),
('khan_mystic', 'khan@polis.metro', '$2b$10$example_hash_3', 'moderator', 'Полис', '/avatars/khan.jpg'),
('ulman_spartan', 'ulman@sparta.metro', '$2b$10$example_hash_4', 'moderator', 'Спарта', '/avatars/ulman.jpg'),
('pavel_stalker', 'pavel@dry.metro', '$2b$10$example_hash_5', 'moderator', 'Сухаревская', '/avatars/pavel.jpg'),
('bourbon_trader', 'bourbon@market.metro', '$2b$10$example_hash_6', 'moderator', 'Рынок', '/avatars/bourbon.jpg'),
('stepan_guard', 'stepan@alexpark.metro', '$2b$10$example_hash_7', 'moderator', 'Алексеевская', '/avatars/stepan.jpg'),
('danila_ranger', 'danila@ranger.metro', '$2b$10$example_hash_8', 'moderator', 'Рейнджеры', '/avatars/danila.jpg'),

-- Обычные пользователи для тестирования
('newbie_stalker', 'newbie@surface.metro', '$2b$10$example_hash_9', 'user', 'Проспект Мира', '/avatars/newbie.jpg'),
('trader_sasha', 'sasha@market.metro', '$2b$10$example_hash_10', 'user', 'Рынок', '/avatars/sasha.jpg'),
('engineer_kostya', 'kostya@technical.metro', '$2b$10$example_hash_11', 'user', 'Технический', '/avatars/kostya.jpg'),
('medic_vera', 'vera@medical.metro', '$2b$10$example_hash_12', 'user', 'Медицинская', '/avatars/vera.jpg');

-- Создание тестовых заявок поддержки
INSERT INTO support_tickets (title, user_id, status, priority, category, created_at) VALUES 
('Проблема с доступом к торговому посту', 9, 'open', 'high', 'technical', NOW() - INTERVAL '2 hours'),
('Вопрос по игровым правилам фракции Спарта', 10, 'open', 'medium', 'gameplay', NOW() - INTERVAL '1 hour'),
('Жалоба на нарушение RP в туннелях', 11, 'in_progress', 'high', 'violation', NOW() - INTERVAL '30 minutes'),
('Предложение по улучшению системы крафта', 12, 'open', 'low', 'suggestion', NOW() - INTERVAL '15 minutes');

-- Создание тестовых сообщений
INSERT INTO messages (ticket_id, sender_id, content, created_at) VALUES 
(1, 9, 'Здравствуйте! Не могу получить доступ к торговому посту на станции Рынок. Система выдает ошибку "Доступ запрещен". Помогите разобраться!', NOW() - INTERVAL '2 hours'),
(1, 1, 'Привет! Проверяем вашу заявку. Скажите, какую именно ошибку вы видите при попытке входа?', NOW() - INTERVAL '1 hour 45 minutes'),
(1, 9, 'При клике на вход в торговый пост появляется красное сообщение "Access Denied - Contact Administrator". Это случилось после последнего обновления.', NOW() - INTERVAL '1 hour 30 minutes'),

(2, 10, 'Добрый день! Хочу вступить в фракцию Спарта. Какие требования для новичков? И как проходит процесс принятия?', NOW() - INTERVAL '1 hour'),
(2, 4, 'Здравствуйте! Для вступления в Спарту нужно пройти испытания на выносливость и стрельбу. Подробности отправлю в личные сообщения.', NOW() - INTERVAL '45 minutes'),

(3, 11, 'Сегодня в туннеле между ВДНХ и Алексеевской игрок "destroyer123" нарушал RP, использовал современный сленг и мешал отыгрышу.', NOW() - INTERVAL '30 minutes'),
(3, 2, 'Принято к рассмотрению. Можете предоставить скриншоты или видео нарушения? Это поможет быстрее разобрать ситуацию.', NOW() - INTERVAL '25 minutes'),

(4, 12, 'Предлагаю добавить возможность создавать самодельные фильтры для противогазов из подручных материалов. Это бы улучшило реализм игры.', NOW() - INTERVAL '15 minutes');