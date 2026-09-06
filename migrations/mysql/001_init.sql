-- База данных создаётся и выбирается в scripts/migrate-mysql.mjs на основе
-- DB_NAME из окружения (по умолчанию recepto_hotel) — так миграции работают
-- и с боевой, и с тестовой БД.

-- Таблица пользователей (администраторы)
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(30) DEFAULT 'admin',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Таблица категорий номеров
CREATE TABLE IF NOT EXISTS categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_key VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(100) NOT NULL,
  sort_order INT UNSIGNED DEFAULT 0,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Таблица номеров
CREATE TABLE IF NOT EXISTS rooms (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category_key VARCHAR(50) NOT NULL,
  price INT UNSIGNED NOT NULL,
  old_price INT UNSIGNED NULL,
  price_day INT UNSIGNED NULL,
  price_half_day INT UNSIGNED NULL,
  area INT UNSIGNED NULL,
  guests INT UNSIGNED NULL,
  description TEXT NOT NULL,
  full_description TEXT NOT NULL,
  is_published BOOLEAN DEFAULT TRUE,
  sort_order INT UNSIGNED DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_key) REFERENCES categories(category_key) ON DELETE CASCADE,
  INDEX idx_category_key (category_key),
  INDEX idx_is_published (is_published),
  INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB;

-- Удобства номера
CREATE TABLE IF NOT EXISTS room_amenities (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  room_id INT UNSIGNED NOT NULL,
  amenity_key VARCHAR(30) NOT NULL,
  UNIQUE KEY uk_room_amenity (room_id, amenity_key),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  INDEX idx_room_id (room_id)
) ENGINE=InnoDB;

-- Дополнительные услуги
CREATE TABLE IF NOT EXISTS room_extras (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  room_id INT UNSIGNED NOT NULL,
  text TEXT NOT NULL,
  sort_order INT UNSIGNED DEFAULT 0,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  INDEX idx_room_id (room_id),
  INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB;

-- Изображения номеров
CREATE TABLE IF NOT EXISTS room_images (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  room_id INT UNSIGNED NOT NULL,
  path TEXT NOT NULL,
  sort_order INT UNSIGNED DEFAULT 0,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  INDEX idx_room_id (room_id)
) ENGINE=InnoDB;

-- Заявки на бронирование
CREATE TABLE IF NOT EXISTS bookings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  room_id INT UNSIGNED NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(120) NULL,
  check_in DATE NULL,
  check_out DATE NULL,
  adults INT UNSIGNED DEFAULT 1,
  children INT UNSIGNED DEFAULT 0,
  comment TEXT NULL,
  status ENUM('new', 'processed', 'confirmed', 'cancelled') DEFAULT 'new',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
  INDEX idx_room_id (room_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- Настройки чат-бота
CREATE TABLE IF NOT EXISTS chat_settings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(50) NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Быстрые кнопки чата
CREATE TABLE IF NOT EXISTS chat_quick_replies (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  sort_order INT UNSIGNED DEFAULT 0,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_visible_sort (is_visible, sort_order)
) ENGINE=InnoDB;