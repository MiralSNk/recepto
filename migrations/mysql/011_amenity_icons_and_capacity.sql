-- Кастомная иконка удобства (загружается через /api/admin/upload). Если
-- пусто — на сайте используется один из встроенных дефолтных SVG.
ALTER TABLE amenities
  ADD COLUMN icon_url VARCHAR(500) NULL AFTER label;

-- Число дополнительных мест сверх базовой вместимости номера (guests),
-- за которые взимается доплата extra_guest_price (см. site_settings).
ALTER TABLE rooms
  ADD COLUMN extra_guest_capacity INT NOT NULL DEFAULT 0 AFTER guests;
