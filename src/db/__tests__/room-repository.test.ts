import { describe, it, expect, vi } from 'vitest';
import { MySQLRoomRepository } from '../mysql/repositories/room-repository';
import type { Pool } from 'mysql2/promise';

function createMockPool() {
  return {
    query: vi.fn(),
    execute: vi.fn(),
    getConnection: vi.fn(),
  } as unknown as Pool;
}

describe('MySQLRoomRepository', () => {
  it('getAllRooms возвращает комнаты со связями', async () => {
    const pool = createMockPool();
    const roomRow = {
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
      description: 'Краткое',
      full_description: 'Полное',
      is_published: 1,
      sort_order: 0,
      created_at: '2026-08-29',
      updated_at: '2026-08-29',
    };

    const amenityRows = [{ room_id: 5, amenity_key: 'wifi' }];
    const extraRows = [{ room_id: 5, text: 'Завтрак 500 руб.' }];
    const imageRows = [{ room_id: 5, path: '/rooms/5/01.jpg' }];

    (pool.query as any)
      .mockResolvedValueOnce([[roomRow]])
      .mockResolvedValueOnce([amenityRows])
      .mockResolvedValueOnce([extraRows])
      .mockResolvedValueOnce([imageRows])
      .mockResolvedValueOnce([[]]); // tariffRows

    const repo = new MySQLRoomRepository(pool);
    const rooms = await repo.getAllRooms();

    expect(rooms).toHaveLength(1);
    expect(rooms[0].amenities).toContain('wifi');
    expect(rooms[0].extras).toContain('Завтрак 500 руб.');
    expect(rooms[0].images).toContain('/rooms/5/01.jpg');
    expect(rooms[0].roomTariffs).toEqual([]);
  });

  it('getAllRooms прокидывает category_max_guests из JOIN как categoryMaxGuests', async () => {
    const pool = createMockPool();
    const roomRow = {
      id: 6,
      name: 'Люкс',
      category_key: 'comfort',
      price: 5000,
      old_price: null,
      price_day: 5000,
      price_half_day: null,
      price_label: null,
      price_day_label: null,
      price_half_day_label: null,
      area: null,
      guests: null,
      description: '',
      full_description: '',
      is_published: 1,
      sort_order: 0,
      created_at: '2026-08-29',
      updated_at: '2026-08-29',
      category_max_guests: 6,
    };

    (pool.query as any)
      .mockResolvedValueOnce([[roomRow]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]]);

    const repo = new MySQLRoomRepository(pool);
    const rooms = await repo.getAllRooms();

    expect(rooms[0].categoryMaxGuests).toBe(6);
  });

  it('getRoomById возвращает undefined для несуществующего id', async () => {
    const pool = createMockPool();
    (pool.query as any).mockResolvedValueOnce([[]]);

    const repo = new MySQLRoomRepository(pool);
    const room = await repo.getRoomById(999);

    expect(room).toBeUndefined();
  });

  // Регрессия: фильтр по числу гостей сравнивал minGuest только с guests,
  // игнорируя extra_guest_capacity — номер «4 + 2 доп. места» пропадал из
  // выдачи уже при поиске на 5-6 гостей, хотя реально их вмещает.
  it('getRoomsByCategory учитывает extra_guest_capacity при фильтре по числу гостей', async () => {
    const pool = createMockPool();
    const roomRow = {
      id: 1,
      name: 'Семейный',
      category_key: 'standard',
      price: 5000,
      old_price: null,
      price_day: null,
      price_half_day: null,
      price_label: null,
      price_day_label: null,
      price_half_day_label: null,
      area: null,
      guests: 4,
      extra_guest_capacity: 2,
      description: '',
      full_description: '',
      is_published: 1,
      sort_order: 0,
      created_at: '2026-08-29',
      updated_at: '2026-08-29',
    };

    (pool.query as any)
      .mockResolvedValueOnce([[roomRow]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]]); // tariffRows

    const repo = new MySQLRoomRepository(pool);
    const rooms = await repo.getRoomsByCategory('all', 6);

    expect(rooms).toHaveLength(1);
    expect(rooms[0].guests).toBe(4);
    expect(rooms[0].extraGuestCapacity).toBe(2);
  });

  it('getRoomsByCategory отсеивает номер, если гостей больше базы + доп. мест', async () => {
    const pool = createMockPool();
    const roomRow = {
      id: 1,
      name: 'Семейный',
      category_key: 'standard',
      price: 5000,
      old_price: null,
      price_day: null,
      price_half_day: null,
      price_label: null,
      price_day_label: null,
      price_half_day_label: null,
      area: null,
      guests: 4,
      extra_guest_capacity: 2,
      description: '',
      full_description: '',
      is_published: 1,
      sort_order: 0,
      created_at: '2026-08-29',
      updated_at: '2026-08-29',
    };

    (pool.query as any)
      .mockResolvedValueOnce([[roomRow]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]]); // tariffRows

    const repo = new MySQLRoomRepository(pool);
    const rooms = await repo.getRoomsByCategory('all', 7);

    expect(rooms).toHaveLength(0);
  });

  // Регрессия: createRoom/updateRoom раньше всегда сами открывали BEGIN/COMMIT
  // через this.pool.getConnection() — при вызове репозитория внутри внешней
  // db.transaction() (где this.pool это уже одиночное соединение без
  // getConnection) это падало с TypeError. Мок здесь имитирует именно такое
  // соединение — без getConnection.
  it('createRoom работает, если репозиторий создан на "голом" соединении (без getConnection — как внутри db.transaction())', async () => {
    const bareConnection = {
      query: vi.fn().mockResolvedValue([{}]),
      execute: vi.fn().mockResolvedValue([{ insertId: 42 }]),
      // getConnection намеренно отсутствует
    } as unknown as Pool;

    const repo = new MySQLRoomRepository(bareConnection);

    (bareConnection.query as any)
      .mockResolvedValueOnce([[{ id: 42, name: 'Новый', category_key: 'standard' }]]) // getAdminRoomById -> SELECT * FROM rooms
      .mockResolvedValueOnce([[]]) // attachRelations amenities
      .mockResolvedValueOnce([[]]) // attachRelations extras
      .mockResolvedValueOnce([[]]) // attachRelations images
      .mockResolvedValueOnce([[]]); // attachRelations roomTariffs

    const result = await repo.createRoom({
      name: 'Новый',
      category_key: 'standard',
      price: 2000,
      old_price: null,
      price_day: 1000,
      price_half_day: null,
      price_label: null,
      price_day_label: null,
      price_half_day_label: null,
      area: null,
      guests: 1,
      extra_guest_capacity: 0,
      description: 'd',
      full_description: 'fd',
      is_published: true,
      sort_order: 0,
      amenities: [],
      extras: [],
      images: [],
    });

    expect(result.id).toBe(42);
    // price и price_day — два умышленно независимых поля (заказчик
    // подтвердил, что это функциональность, а не рассинхрон, см.
    // src/types/room.ts). Позиции параметров соответствуют списку колонок
    // в INSERT INTO rooms (name, category_key, price, old_price, price_day, ...).
    const [insertSql, insertParams] = (bareConnection.execute as any).mock.calls[0];
    expect(insertSql).toContain('price, old_price, price_day');
    expect(insertParams[2]).toBe(2000); // price
    expect(insertParams[4]).toBe(1000); // price_day
    // beginTransaction/commit не должны вызываться — их нет у "голого" соединения
    expect((bareConnection as any).beginTransaction).toBeUndefined();
  });

  it('updateRoom обновляет price и price_day независимо друг от друга', async () => {
    const bareConnection = {
      query: vi.fn().mockResolvedValue([[]]),
      execute: vi.fn().mockResolvedValue([{}]),
    } as unknown as Pool;

    const repo = new MySQLRoomRepository(bareConnection);

    (bareConnection.query as any)
      .mockResolvedValueOnce([[{ id: 7, name: '№-7', category_key: 'comfort' }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]]);

    await repo.updateRoom(7, { price_day: 3690 });

    const [updateSql, updateParams] = (bareConnection.execute as any).mock.calls[0];
    expect(updateSql).toContain('price_day = ?');
    // Обновили только price_day — price трогать не должны вовсе.
    expect(updateSql).not.toContain('price = ?');
    expect(updateParams).toEqual([3690, 7]);
  });
});