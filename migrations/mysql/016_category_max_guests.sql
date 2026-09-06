-- Лимит гостей на категорию — фолбэк для пикера гостей, когда у конкретного
-- номера ещё не выбрана (или у него нет собственной вместимости). NULL —
-- у категории нет своего лимита, используется общий сайтовый
-- (site_settings.max_guests_absolute).
ALTER TABLE categories ADD COLUMN max_guests INT UNSIGNED NULL AFTER is_visible;
