-- Обновляем пароли для тестовых аккаунтов
UPDATE users SET password_hash = 'bb2b1572b26ea53c861fc25806a1be8b2b3e7f2b8dd6c0dc0c9ceb5b3e9c2cc6' 
WHERE username = 'artyom_spartan';

UPDATE users SET password_hash = 'c78e90d1f41be5b9d0bcb07ad259c6e27e8d8a34d30a1a17e40db7930c8b1f51' 
WHERE username = 'newbie_stalker';

UPDATE users SET password_hash = 'bb2b1572b26ea53c861fc25806a1be8b2b3e7f2b8dd6c0dc0c9ceb5b3e9c2cc6' 
WHERE username IN ('miller_ranger', 'khan_mystic', 'ulman_spartan', 'pavel_stalker', 'bourbon_trader', 'stepan_guard', 'danila_ranger');

-- Добавляем несколько новых сообщений для тестирования
INSERT INTO messages (ticket_id, sender_id, content, created_at) VALUES 
(1, 1, 'Проблема решена! Доступ к торговому посту восстановлен. Спасибо за обращение!', NOW() - INTERVAL '10 minutes'),
(2, 10, 'Спасибо за информацию! Когда можно подойти на испытания?', NOW() - INTERVAL '30 minutes'),
(3, 11, 'Вот скриншот нарушения: [image_placeholder.jpg]', NOW() - INTERVAL '20 minutes'),
(4, 5, 'Интересная идея! Передам разработчикам для рассмотрения.', NOW() - INTERVAL '5 minutes');