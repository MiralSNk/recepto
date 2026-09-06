CREATE TABLE IF NOT EXISTS site_settings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(50) NOT NULL UNIQUE,
  value JSON NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO site_settings (setting_key, value) VALUES
('palette', JSON_OBJECT(
  'color-pr-gold', '#89754f',
  'color-pr-brown', '#173f35',
  'color-pr-warm', '#F5F0E8',
  'color-cream', '#ebe1c9',
  'color-white', '#FFFFFF',
  'color-dark', '#000000',
  'color-text-primary', '#111111',
  'color-text-inverse', '#FFFFFF',
  'color-text-muted', '#555555',
  'radius-sm', '6px',
  'radius-md', '10px',
  'radius-lg', '16px',
  'radius-full', '9999px',
  'spacing-unit', '8px'
))
ON DUPLICATE KEY UPDATE value = VALUES(value);