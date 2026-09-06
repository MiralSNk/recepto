-- Секретное слово для восстановления пароля админки без email/SMTP.
-- NULL — слово ещё не задано, восстановление недоступно (честная ошибка,
-- а не ложное чувство защищённости).
ALTER TABLE users ADD COLUMN secret_word_hash VARCHAR(255) NULL AFTER password_hash;
