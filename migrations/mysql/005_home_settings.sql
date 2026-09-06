INSERT INTO site_settings (setting_key, value) VALUES
('hero_bg', JSON_QUOTE('/hero-bg.png')),
('hero_title', JSON_QUOTE('Уютный отель\nдля вашего отдыха')),
('hero_subtitle', JSON_QUOTE('Комфортные номера, внимательный сервис и всё для удобного проживания')),
('logo_full', JSON_QUOTE('')),
('logo_title', JSON_QUOTE('')),
('logo_subtitle', JSON_QUOTE(''))
ON DUPLICATE KEY UPDATE value = VALUES(value);