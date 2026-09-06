ALTER TABLE rooms
  ADD COLUMN price_label VARCHAR(100) NULL,
  ADD COLUMN price_day_label VARCHAR(100) NULL,
  ADD COLUMN price_half_day_label VARCHAR(100) NULL;