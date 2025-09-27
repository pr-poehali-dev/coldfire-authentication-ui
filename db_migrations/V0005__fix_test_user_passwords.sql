-- Обновляем хэши паролей для тестовых пользователей
UPDATE t_p7304060_coldfire_authenticat.users 
SET password_hash = encode(sha256('spartan123'::bytea), 'hex')
WHERE username = 'artyom_spartan';

UPDATE t_p7304060_coldfire_authenticat.users 
SET password_hash = encode(sha256('metro2033'::bytea), 'hex')
WHERE username = 'newbie_stalker';