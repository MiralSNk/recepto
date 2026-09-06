INSERT INTO site_settings (setting_key, value) VALUES
('hotel_name', JSON_QUOTE('Название вашего отеля')),
('hotel_address', JSON_QUOTE('Адрес вашего отеля')),
('hotel_phone', JSON_QUOTE('+7 (000) 000-00-00')),
('hotel_email', JSON_QUOTE('info@example.com')),
('hotel_rating', JSON_QUOTE('4')),
('seo_home_title', JSON_QUOTE('Название вашего отеля — уютный отель в центре города')),
('seo_home_description', JSON_QUOTE('Название вашего отеля: комфортные номера и внимательный сервис. Бронирование онлайн.')),
('seo_contacts_title', JSON_QUOTE('Об отеле — Название вашего отеля')),
('seo_contacts_description', JSON_QUOTE('Информация об отеле «Название вашего отеля»: адрес, телефон, форма обратной связи.')),
('seo_privacy_title', JSON_QUOTE('Политика конфиденциальности')),
('seo_privacy_description', JSON_QUOTE('Политика конфиденциальности и обработки персональных данных отеля «Название вашего отеля».')),
-- Open Graph главной
('og_home_title', JSON_QUOTE('Название вашего отеля — уютный отель в центре города')),
('og_home_description', JSON_QUOTE('Уютные номера и внимательный сервис. Бронируйте онлайн.')),
('og_home_image', JSON_QUOTE('/og-image.jpg')),
-- Open Graph страницы «Об отеле»
('og_contacts_title', JSON_QUOTE('Об отеле — Название вашего отеля')),
('og_contacts_description', JSON_QUOTE('Адрес, телефон и форма обратной связи.')),
('og_contacts_image', JSON_QUOTE('/og-image.jpg')),
-- Open Graph страницы «Политика конфиденциальности»
('og_privacy_title', JSON_QUOTE('Политика конфиденциальности — Название вашего отеля')),
('og_privacy_description', JSON_QUOTE('Как мы обрабатываем персональные данные.')),
('og_privacy_image', JSON_QUOTE('/og-image.jpg'))
ON DUPLICATE KEY UPDATE value = VALUES(value);