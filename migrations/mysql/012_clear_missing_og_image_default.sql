-- 006_seo_settings.sql заполнил og_home_image/og_contacts_image/og_privacy_image
-- дефолтом '/og-image.jpg' — файла с таким именем никогда не было в public/.
-- Раньше это не проявлялось из-за бага чтения site_settings (см. миграцию
-- в site-settings-repository.ts / коммит с исправлением JSON.parse):
-- значение читалось как null и код падал на автогенерируемую OG-картинку.
-- После фикса чтения это же значение стало реально использоваться и ронять
-- next/og (relative URL) на сборке. Возвращаем поля к пустой строке —
-- "пусто" это и есть штатный кейс "сгенерировать превью автоматически".
UPDATE site_settings
SET value = JSON_QUOTE('')
WHERE setting_key IN ('og_home_image', 'og_contacts_image', 'og_privacy_image')
  AND value = JSON_QUOTE('/og-image.jpg');
