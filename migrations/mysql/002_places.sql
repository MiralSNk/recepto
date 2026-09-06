-- Таблица мест рядом с отелем
CREATE TABLE IF NOT EXISTS places (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  lat DOUBLE NOT NULL,
  lon DOUBLE NOT NULL,
  description VARCHAR(255) NOT NULL,
  is_visible BOOLEAN DEFAULT TRUE,
  sort_order INT UNSIGNED DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_visible_sort (is_visible, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Примерные данные — см. migrations/mysql/seed-places.sql (запускается вручную,
-- не этим файлом). Раньше INSERT был прямо здесь и использовал колонку
-- `category`, которую миграция 008 переименовывает в `category_key` — при
-- повторном/изолированном запуске этого файла на БД, где 008 уже применена,
-- он падал с "Unknown column 'category'". Сид-данные не идемпотентны (нет
-- уникального ключа на name) и не должны быть частью схемной миграции.