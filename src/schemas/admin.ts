import { z } from 'zod';

const emptyToNull = (v: unknown) => {
  if (v === '' || v === undefined) return null;
  return v;
};

const optionalMoney = z.preprocess(
  emptyToNull,
  z.coerce.number().int().nonnegative().nullable().optional()
);

const optionalInt = z.preprocess(
  emptyToNull,
  z.coerce.number().int().nonnegative().nullable().optional()
);

export const createCategorySchema = z.object({
  key: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9_-]+$/, 'Только латиница, цифры, _ и -'),
  label: z.string().min(1).max(100),
  sort_order: z.coerce.number().int().min(0).default(0),
  is_visible: z.boolean().default(true),
  // Лимит гостей в пикере для этой категории — фолбэк, когда у номера нет
  // своей вместимости (см. src/lib/shared/guest-limits.ts). Пусто = нет
  // своего лимита, используется общий сайтовый.
  max_guests: optionalInt,
});

export const updateCategorySchema = createCategorySchema.partial();

export const createRoomSchema = z.object({
  name: z.string().min(1).max(100),
  category_key: z.string().min(1).max(50),
  // Два независимых поля по требованию заказчика (см. RoomFormModal.tsx):
  // price — только для карточек номеров (главная/список), price_day — везде
  // остальное (страница номера, форма бронирования, ИИ-помощник). Не
  // синхронизируются между собой умышленно.
  price: z.coerce.number().int().positive('Цена (основная) должна быть > 0'),
  price_day: z.coerce.number().int().positive('Цена за сутки должна быть > 0'),
  old_price: optionalMoney,
  price_half_day: optionalMoney,
  area: optionalInt,
  guests: optionalInt,
  extra_guest_capacity: z.coerce.number().int().min(0).max(20).optional(),
  description: z.string().min(1),
  full_description: z.string().min(1),
  amenities: z.array(z.string()).optional(),
  extras: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  tariffs: z
    .array(
      z.object({
        tariff_id: z.coerce.number().int().positive(),
        custom_label: z.string().min(1).max(200),
      })
    )
    .optional(),
  is_published: z.boolean().optional(),
  sort_order: z.coerce.number().int().min(0).optional(),
  price_label: z.string().max(100).optional().nullable(),
  price_day_label: z.string().max(100).optional().nullable(),
  price_half_day_label: z.string().max(100).optional().nullable(),
});

export const updateRoomSchema = createRoomSchema.partial();

export const createPlaceSchema = z.object({
  name: z.string().min(1).max(150),
  category_key: z.string().min(1).max(50),
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  description: z.string().max(2000).default(''),
  sort_order: z.coerce.number().int().min(0).default(0),
  is_visible: z.boolean().default(true),
});

export const updatePlaceSchema = createPlaceSchema.partial();

// Значения palette попадают без экранирования в инлайновый <style> в
// src/app/layout.tsx на каждой странице сайта — ключ/значение обязаны быть
// строго CSS-значением (цвет или размер), иначе это открытая дыра для
// site-wide XSS через один скомпрометированный админ-аккаунт.
export const paletteSchema = z.record(
  z.string().regex(/^[a-z][a-z0-9-]{0,49}$/, 'Некорректный ключ палитры'),
  z
    .string()
    .max(20)
    .regex(
      /^(#[0-9a-fA-F]{3,8}|\d{1,4}(\.\d+)?(px|rem|em|%))$/,
      'Значение должно быть hex-цветом или CSS-размером (px/rem/em/%)'
    )
);

export const bulkPriceSchema = z.object({
  roomIds: z.array(z.coerce.number().int().positive()).optional(),
  categoryKey: z.string().min(1).optional(),
  price_day: z.coerce.number().int().positive().optional(),
  price_half_day: z.coerce.number().int().positive().optional(),
  old_price: z.preprocess(
    emptyToNull,
    z.coerce.number().int().nonnegative().nullable().optional()
  ),
});