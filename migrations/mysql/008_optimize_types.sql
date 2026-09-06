-- ============================================================
-- Оптимизация типов, ограничений и индексов
-- ============================================================

-- 1. Переименование поля category → category_key в таблице places
--    (для единообразия с categories и rooms). CHARACTER SET/COLLATE
--    указаны явно, а не унаследованы от дефолта таблицы/БД на момент
--    выполнения — этот же столбец уже приводился к utf8mb4_unicode_ci явно
--    в миграции 007 именно из-за FK с place_categories, полагаться на
--    неявное наследование здесь второй раз не стоит.
ALTER TABLE places
  CHANGE COLUMN category category_key VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;

-- Обновляем внешний ключ (удаляем старый, добавляем новый с новым именем)
ALTER TABLE places
  DROP FOREIGN KEY fk_places_category;
ALTER TABLE places
  ADD CONSTRAINT fk_places_category
  FOREIGN KEY (category_key) REFERENCES place_categories(category_key)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- 2. Уточнение типов текстовых полей
--    Краткое описание номера ограничиваем 500 символами (VARCHAR)
ALTER TABLE rooms
  MODIFY COLUMN description VARCHAR(500) NOT NULL;

-- 3. Добавление CHECK-ограничений (MySQL 8.0.16+)
--    Важно: перед выполнением убедитесь, что данные не нарушают условия.

-- Цена должна быть положительной
ALTER TABLE rooms
  ADD CONSTRAINT chk_rooms_price CHECK (price > 0);

-- Количество гостей (если указано) должно быть больше 0
ALTER TABLE rooms
  ADD CONSTRAINT chk_rooms_guests CHECK (guests IS NULL OR guests > 0);

-- Взрослых должно быть больше 0
ALTER TABLE bookings
  ADD CONSTRAINT chk_bookings_adults CHECK (adults > 0);

-- Детей не может быть отрицательным
ALTER TABLE bookings
  ADD CONSTRAINT chk_bookings_children CHECK (children >= 0);

-- Дата выезда не может быть раньше даты заезда (если обе указаны)
ALTER TABLE bookings
  ADD CONSTRAINT chk_bookings_dates CHECK (check_in IS NULL OR check_out IS NULL OR check_out >= check_in);

-- 4. Добавление индексов для часто используемых полей
ALTER TABLE rooms
  ADD INDEX idx_rooms_name (name);

ALTER TABLE bookings
  ADD INDEX idx_bookings_email (email),
  ADD INDEX idx_bookings_phone (phone);