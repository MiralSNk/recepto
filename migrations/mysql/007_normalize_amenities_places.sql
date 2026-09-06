-- ============================================================
-- Нормализация: удобства и категории мест
-- ============================================================

-- 1. Таблица удобств (amenities)
CREATE TABLE IF NOT EXISTS amenities (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  amenity_key VARCHAR(30) NOT NULL UNIQUE,
  label VARCHAR(100) NOT NULL,
  sort_order INT UNSIGNED DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO amenities (amenity_key, label, sort_order) VALUES
('wifi', 'Wi‑Fi', 10),
('conditioner', 'Кондиционер', 20),
('tv', 'ТВ', 30)
ON DUPLICATE KEY UPDATE label = VALUES(label), sort_order = VALUES(sort_order);

-- room_amenities.amenity_key (миграция 001) создан без явного COLLATE —
-- наследует дефолт БАЗЫ ДАННЫХ на момент создания таблицы, а не обязательно
-- utf8mb4_unicode_ci, который сама эта миграция явно ставит для amenities
-- ниже. На большинстве уже развёрнутых окружений он совпадает случайно
-- (migrate-mysql.mjs создаёт БД с CHARACTER SET utf8mb4 COLLATE
-- utf8mb4_unicode_ci) — но если БД была создана ДО этого какой-то другой
-- стороной с другим дефолтом (например, официальный Docker-образ mysql сам
-- создаёт БД по MYSQL_DATABASE ещё до первого запуска migrate-mysql.mjs,
-- своим collation по умолчанию — utf8mb4_0900_ai_ci в MySQL 8), FOREIGN KEY
-- ниже падает с ER_FK_INCOMPATIBLE_COLUMNS. MODIFY явно приводит колонку к
-- нужному collation перед созданием ключа, независимо от дефолта БД.
ALTER TABLE room_amenities
  MODIFY amenity_key VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;

-- Добавляем внешний ключ к room_amenities
ALTER TABLE room_amenities
  ADD CONSTRAINT fk_room_amenities_amenity
  FOREIGN KEY (amenity_key) REFERENCES amenities(amenity_key)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- 2. Категории мест (place_categories)
CREATE TABLE IF NOT EXISTS place_categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_key VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(100) NOT NULL,
  sort_order INT UNSIGNED DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO place_categories (category_key, label, sort_order) VALUES
('food', 'Еда', 10),
('sights', 'Достопримечательности', 20),
('pharmacy', 'Аптека', 30),
('shop', 'Магазины', 40),
('service', 'Услуги', 50)
ON DUPLICATE KEY UPDATE label = VALUES(label), sort_order = VALUES(sort_order);

-- places.category (миграция 002) — тот же риск несовпадения collation, что
-- и у room_amenities.amenity_key выше, см. комментарий там.
ALTER TABLE places
  MODIFY category VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;

-- Добавляем внешний ключ к places
ALTER TABLE places
  ADD CONSTRAINT fk_places_category
  FOREIGN KEY (category) REFERENCES place_categories(category_key)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- 3. Составные индексы для room_extras и room_images
ALTER TABLE room_extras
  ADD INDEX idx_room_sort (room_id, sort_order);

ALTER TABLE room_images
  ADD INDEX idx_room_sort (room_id, sort_order);