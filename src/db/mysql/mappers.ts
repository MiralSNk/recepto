import 'server-only';
import type { RowDataPacket } from 'mysql2/promise';
import type { AdminCategory, AdminRoom, CategoryKey, Room } from '@/types';

/** Строка категории из MySQL */
export interface CategoryRow extends RowDataPacket {
  id: number;
  category_key: string;
  label: string;
  sort_order: number;
  is_visible: boolean | number;
  max_guests: number | null;
  created_at: string;
  updated_at: string;
}

/** Строка номера из MySQL (с учётом всех полей после миграций) */
export interface RoomRow extends RowDataPacket {
  id: number;
  name: string;
  category_key: string;
  price: number;
  old_price: number | null;
  price_day: number | null;
  price_half_day: number | null;
  area: number | null;
  guests: number | null;
  extra_guest_capacity: number;
  description: string;
  full_description: string;
  is_published: boolean | number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Кастомные подписи цен
  price_label: string | null;
  price_day_label: string | null;
  price_half_day_label: string | null;
  // Дополнительное поле для JOIN (не хранится в rooms)
  category_label?: string;
  // Дополнительное поле для JOIN (не хранится в rooms) — только в публичных
  // методах room-repository.ts (getAllRooms/getRoomsByCategory/getRoomById),
  // см. src/lib/shared/guest-limits.ts.
  category_max_guests?: number | null;
}

/**
 * Преобразует строку категории из БД в AdminCategory.
 */
export function mapCategoryRow(row: CategoryRow): AdminCategory {
  return {
    id: row.id,
    key: row.category_key as CategoryKey,
    label: row.label,
    is_visible: Boolean(row.is_visible),
    max_guests: row.max_guests,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Преобразует строку номера из БД в базовую часть AdminRoom (без связей).
 * Включает новые поля price_label и т.д.
 */
export function mapAdminRoomRow(
  row: RoomRow
): Omit<AdminRoom, 'amenities' | 'extras' | 'images' | 'roomTariffs'> {
  return {
    id: row.id,
    name: row.name,
    category_key: row.category_key as CategoryKey,
    // price и price_day — независимые поля (см. Room в src/types/room.ts).
    // Фолбэк на price для price_day — только подстраховка на случай строки,
    // не тронутой миграцией 014 (backfill), не общая логика синхронизации.
    price: row.price,
    price_day: row.price_day ?? row.price,
    old_price: row.old_price,
    price_half_day: row.price_half_day,
    price_label: row.price_label ?? null,
    price_day_label: row.price_day_label ?? null,
    price_half_day_label: row.price_half_day_label ?? null,
    area: row.area,
    guests: row.guests,
    extra_guest_capacity: row.extra_guest_capacity ?? 0,
    description: row.description,
    full_description: row.full_description,
    is_published: Boolean(row.is_published),
    sort_order: row.sort_order,
    category_max_guests: row.category_max_guests ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Преобразует AdminRoom в публичный Room (camelCase поля).
 */
export function toPublicRoom(adminRoom: AdminRoom): Room {
  return {
    id: adminRoom.id,
    name: adminRoom.name,
    category: adminRoom.category_key,
    categoryMaxGuests: adminRoom.category_max_guests ?? null,
    price: adminRoom.price,
    price_day: adminRoom.price_day,
    oldPrice: adminRoom.old_price ?? undefined,
    price_half_day: adminRoom.price_half_day ?? undefined,
    price_label: adminRoom.price_label,
    price_day_label: adminRoom.price_day_label,
    price_half_day_label: adminRoom.price_half_day_label,
    area: adminRoom.area,
    guests: adminRoom.guests,
    extraGuestCapacity: adminRoom.extra_guest_capacity ?? 0,
    description: adminRoom.description,
    fullDescription: adminRoom.full_description,
    amenities: adminRoom.amenities,
    extras: adminRoom.extras,
    images: adminRoom.images,
    roomTariffs: adminRoom.roomTariffs,
  };
}