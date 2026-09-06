-- ============================================================
-- Тарифы: справочник (замена second_guest_price/extra_guest_price
-- из site_settings) + возможность создавать доп. тарифы, переиспользуемые
-- на нескольких номерах (аналог amenities), + формула калькулятора.
-- ============================================================

CREATE TABLE IF NOT EXISTS tariffs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tariff_key VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(150) NOT NULL,
  price INT UNSIGNED NOT NULL DEFAULT 0,
  is_builtin TINYINT(1) NOT NULL DEFAULT 0,
  in_calculator TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT UNSIGNED DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Два builtin-тарифа. Дефолтная цена — те же 400/800, что были в
-- src/lib/server/pricing.ts DEFAULTS, на случай если site_settings ещё
-- ни разу не сохранялись.
INSERT INTO tariffs (tariff_key, label, price, is_builtin, in_calculator, sort_order)
VALUES
  ('second_guest', 'Доплата за 2-го гостя', 400, 1, 1, 10),
  ('extra_guest', 'Доплата за 3-го и каждого следующего гостя', 800, 1, 1, 20)
ON DUPLICATE KEY UPDATE label = VALUES(label);

-- Бэкфилл реальных значений из site_settings, если админ их уже менял
-- (JSON-колонка хранит JSON.stringify() строки — числовая настройка лежит
-- как JSON-строка вида "400", отсюда JSON_UNQUOTE). Не перетираем, если
-- значение не выглядит как положительное целое (та же защита, что
-- toPositiveInt() в pricing.ts — не даём молча записать 0/мусор).
UPDATE tariffs t
JOIN site_settings s ON s.setting_key = 'second_guest_price'
SET t.price = CAST(JSON_UNQUOTE(s.value) AS UNSIGNED)
WHERE t.tariff_key = 'second_guest'
  AND JSON_UNQUOTE(s.value) REGEXP '^[0-9]+$';

UPDATE tariffs t
JOIN site_settings s ON s.setting_key = 'extra_guest_price'
SET t.price = CAST(JSON_UNQUOTE(s.value) AS UNSIGNED)
WHERE t.tariff_key = 'extra_guest'
  AND JSON_UNQUOTE(s.value) REGEXP '^[0-9]+$';

-- Старые site_settings-строки second_guest_price/extra_guest_price
-- намеренно НЕ удаляются (additive-only конвенция проекта) — они просто
-- перестают читаться кодом после этой миграции.

CREATE TABLE IF NOT EXISTS room_tariffs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  room_id INT UNSIGNED NOT NULL,
  tariff_id INT UNSIGNED NOT NULL,
  custom_label VARCHAR(200) NOT NULL,
  sort_order INT UNSIGNED DEFAULT 0,
  UNIQUE KEY uniq_room_tariff (room_id, tariff_id),
  CONSTRAINT fk_room_tariffs_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_room_tariffs_tariff FOREIGN KEY (tariff_id) REFERENCES tariffs(id) ON DELETE CASCADE,
  INDEX idx_room_sort (room_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
