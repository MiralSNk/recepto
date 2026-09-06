import { describe, it, expect } from 'vitest';
import { mapCategoryRow, mapAdminRoomRow, toPublicRoom } from '../mysql/mappers';
import type { CategoryRow, RoomRow } from '../mysql/mappers';
import type { AdminCategory, AdminRoom, Room } from '@/types';

describe('mappers', () => {
  it('mapCategoryRow преобразует строку в AdminCategory', () => {
    // Явное приведение, чтобы обойти ограничения RowDataPacket
    const row = {
      id: 1,
      category_key: 'standard',
      label: 'Стандарт',
      sort_order: 10,
      is_visible: 1,
      created_at: '2026-08-29 10:00:00',
      updated_at: '2026-08-29 10:00:00',
    } as unknown as CategoryRow;

    const result: AdminCategory = mapCategoryRow(row);

    expect(result).toEqual({
      id: 1,
      key: 'standard',
      label: 'Стандарт',
      is_visible: true,
      sort_order: 10,
      created_at: '2026-08-29 10:00:00',
      updated_at: '2026-08-29 10:00:00',
    });
  });

  it('mapAdminRoomRow корректно маппит поля, включая price_label', () => {
    const row = {
      id: 5,
      name: '№-5, Стандарт',
      category_key: 'standard',
      price: 2490,
      old_price: 5000,
      price_day: 3490,
      price_half_day: 2490,
      price_label: 'от 2490 ₽/ночь',
      price_day_label: 'Сутки',
      price_half_day_label: '12 часов',
      area: null,
      guests: 2,
      description: 'Краткое',
      full_description: 'Полное',
      is_published: 1,
      sort_order: 0,
      created_at: '2026-08-29 10:00:00',
      updated_at: '2026-08-29 10:00:00',
    } as unknown as RoomRow;

    const result = mapAdminRoomRow(row);

    expect(result.price).toBe(2490);
    expect(result.price_day).toBe(3490);
    expect(result.price_label).toBe('от 2490 ₽/ночь');
    expect(result.price_day_label).toBe('Сутки');
    expect(result.price_half_day_label).toBe('12 часов');
    expect(result.is_published).toBe(true);
  });

  // price и price_day — два умышленно независимых поля (см. Room в
  // src/types/room.ts), но на случай строки, которая проскочила мимо
  // миграции 014 backfill (price_day по какой-то причине null), маппер
  // обязан подстраховаться значением из price.
  it('mapAdminRoomRow подставляет price вместо null price_day (строка мимо миграций backfill)', () => {
    const row = {
      id: 6,
      name: 'Легаси-номер',
      category_key: 'standard',
      price: 4000,
      old_price: null,
      price_day: null,
      price_half_day: null,
      price_label: null,
      price_day_label: null,
      price_half_day_label: null,
      area: null,
      guests: 2,
      description: 'd',
      full_description: 'fd',
      is_published: 1,
      sort_order: 0,
      created_at: '2026-08-29 10:00:00',
      updated_at: '2026-08-29 10:00:00',
    } as unknown as RoomRow;

    const result = mapAdminRoomRow(row);

    expect(result.price_day).toBe(4000);
  });

  it('toPublicRoom правильно преобразует AdminRoom в Room', () => {
    const adminRoom: AdminRoom = {
      id: 5,
      name: '№-5, Стандарт',
      category_key: 'standard',
      price: 2490,
      old_price: 5000,
      price_day: 3490,
      price_half_day: 2490,
      price_label: null,
      price_day_label: null,
      price_half_day_label: null,
      area: null,
      guests: 2,
      extra_guest_capacity: 0,
      description: 'Краткое',
      full_description: 'Полное',
      is_published: true,
      sort_order: 0,
      amenities: ['wifi', 'tv'],
      extras: ['Завтрак 500 руб.'],
      images: ['/rooms/5/01.jpg'],
      roomTariffs: [
        { tariff_id: 1, tariff_key: 'second_guest', label: 'Доплата за 2-го гостя', custom_label: 'Стоимость 2-го гостя', price: 400 },
      ],
    };

    const room: Room = toPublicRoom(adminRoom);

    expect(room.category).toBe('standard');
    expect(room.price).toBe(2490);
    expect(room.price_day).toBe(3490);
    expect(room.oldPrice).toBe(5000);
    expect(room.amenities).toEqual(['wifi', 'tv']);
    // roomTariffs проходит как есть — цена уже разрешена (live) на уровне
    // репозитория (JOIN на tariffs), маппер её не трогает и не дублирует.
    expect(room.roomTariffs).toEqual([
      { tariff_id: 1, tariff_key: 'second_guest', label: 'Доплата за 2-го гостя', custom_label: 'Стоимость 2-го гостя', price: 400 },
    ]);
  });
});