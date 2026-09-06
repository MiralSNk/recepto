-- Таблица для неотвеченных запросов ИИ-ассистента
CREATE TABLE IF NOT EXISTS chat_unanswered_queries (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  query_text VARCHAR(500) NOT NULL,
  count INT UNSIGNED NOT NULL DEFAULT 1,
  last_asked_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_query_text (query_text)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;