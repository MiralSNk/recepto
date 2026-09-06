import 'server-only';
import type { Pool, PoolConnection } from 'mysql2/promise';
import type { IRoomRepository } from '@/db/repositories/room.repository';
import type { AdminRoom, AdminRoomCreate, AdminRoomUpdate, Room } from '@/types';
import { RoomRow, mapAdminRoomRow, toPublicRoom } from '../mappers';

/**
 * Реализация репозитория номеров для MySQL.
 */
export class MySQLRoomRepository implements IRoomRepository {
  constructor(private pool: Pool) {}

  /**
   * Выполняет fn на соединении с атомарностью INSERT/UPDATE в rooms + связанные
   * таблицы. Если репозиторий уже создан внутри внешней транзакции (через
   * IDatabaseAdapter.transaction()), this.pool — это одиночный PoolConnection
   * без своего .getConnection(): в этом случае просто используем его как есть,
   * без вложенного BEGIN/COMMIT — атомарность уже обеспечивает внешняя
   * транзакция. Без этой развилки createRoom/updateRoom падали с
   * "this.pool.getConnection is not a function" при вызове внутри db.transaction().
   */
  private async withTransaction<T>(
    fn: (conn: PoolConnection) => Promise<T>
  ): Promise<T> {
    const isStandalonePool = typeof (this.pool as Partial<Pool>).getConnection === 'function';

    if (!isStandalonePool) {
      return fn(this.pool as unknown as PoolConnection);
    }

    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      const result = await fn(conn);
      await conn.commit();
      return result;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  /**
   * Присоединить к каждому номеру его удобства, доп. услуги и изображения.
   * Использует IN-запросы для избежания N+1.
   */
  private async attachRelations<T extends { id: number }>(
    rooms: T[]
  ): Promise<(T & { amenities: string[]; extras: string[]; images: string[]; roomTariffs: import('@/types').RoomTariffAttachment[] })[]> {
    if (!rooms.length) return [];
    const ids = rooms.map((r) => r.id);
    const placeholders = ids.map(() => '?').join(',');

    const [amenityRows] = await this.pool.query(
      `SELECT room_id, amenity_key FROM room_amenities WHERE room_id IN (${placeholders})`,
      ids
    );
    const [extraRows] = await this.pool.query(
      `SELECT room_id, text FROM room_extras WHERE room_id IN (${placeholders}) ORDER BY sort_order, id`,
      ids
    );
    const [imageRows] = await this.pool.query(
      `SELECT room_id, path FROM room_images WHERE room_id IN (${placeholders}) ORDER BY sort_order, id`,
      ids
    );
    // JOIN на tariffs — цена и tariff_key всегда читаются живьём из каталога,
    // в room_tariffs хранится только tariff_id + custom_label (см. миграцию 015).
    const [tariffRows] = await this.pool.query(
      `SELECT rt.room_id, rt.tariff_id, rt.custom_label, t.tariff_key, t.label, t.price
       FROM room_tariffs rt JOIN tariffs t ON t.id = rt.tariff_id
       WHERE rt.room_id IN (${placeholders}) ORDER BY rt.sort_order`,
      ids
    );

    const amenitiesMap = new Map<number, string[]>();
    const extrasMap = new Map<number, string[]>();
    const imagesMap = new Map<number, string[]>();
    const tariffsMap = new Map<number, import('@/types').RoomTariffAttachment[]>();

    for (const row of amenityRows as any[]) {
      if (!amenitiesMap.has(row.room_id)) amenitiesMap.set(row.room_id, []);
      amenitiesMap.get(row.room_id)!.push(row.amenity_key);
    }
    for (const row of extraRows as any[]) {
      if (!extrasMap.has(row.room_id)) extrasMap.set(row.room_id, []);
      extrasMap.get(row.room_id)!.push(row.text);
    }
    for (const row of imageRows as any[]) {
      if (!imagesMap.has(row.room_id)) imagesMap.set(row.room_id, []);
      imagesMap.get(row.room_id)!.push(row.path);
    }
    for (const row of tariffRows as any[]) {
      if (!tariffsMap.has(row.room_id)) tariffsMap.set(row.room_id, []);
      tariffsMap.get(row.room_id)!.push({
        tariff_id: row.tariff_id,
        tariff_key: row.tariff_key,
        label: row.label,
        custom_label: row.custom_label,
        price: row.price,
      });
    }

    return rooms.map((room) => ({
      ...room,
      amenities: amenitiesMap.get(room.id) || [],
      extras: extrasMap.get(room.id) || [],
      images: imagesMap.get(room.id) || [],
      roomTariffs: tariffsMap.get(room.id) || [],
    }));
  }

  /**
   * Получить все опубликованные номера (публичная часть).
   */
  async getAllRooms(): Promise<Room[]> {
    const [rows] = await this.pool.query<RoomRow[]>(
      `SELECT r.*, c.max_guests AS category_max_guests FROM rooms r
       JOIN categories c ON c.category_key = r.category_key
       WHERE r.is_published = TRUE AND c.is_visible = TRUE
       ORDER BY r.sort_order DESC, r.id ASC`
    );
    const adminRooms = rows.map(mapAdminRoomRow);
    const rooms = await this.attachRelations(adminRooms);
    return rooms.map(toPublicRoom);
  }

  /**
   * Получить опубликованные номера по категории (с фильтром по гостям).
   */
  async getRoomsByCategory(category: string, minGuest = 0): Promise<Room[]> {
    let sql = `
      SELECT r.*, c.max_guests AS category_max_guests FROM rooms r
      JOIN categories c ON c.category_key = r.category_key
      WHERE r.is_published = TRUE AND c.is_visible = TRUE
    `;
    const params: any[] = [];

    if (category && category !== 'all') {
      sql += ' AND r.category_key = ?';
      params.push(category);
    }

    sql += ' ORDER BY r.sort_order DESC, r.id ASC';

    const [rows] = await this.pool.query<RoomRow[]>(sql, params);
    let rooms = await this.attachRelations(rows.map(mapAdminRoomRow));
    if (minGuest > 0) {
      // Вместимость номера — база + платные доп. места, а не только guests.
      rooms = rooms.filter((r) => (r.guests ?? 0) + (r.extra_guest_capacity ?? 0) >= minGuest);
    }
    return rooms.map(toPublicRoom);
  }

  /**
   * Получить опубликованный номер по id (с учётом видимости категории).
   */
  async getRoomById(id: number): Promise<Room | undefined> {
    const [rows] = await this.pool.query<RoomRow[]>(
      `SELECT r.*, c.max_guests AS category_max_guests FROM rooms r
       JOIN categories c ON c.category_key = r.category_key
       WHERE r.id = ? AND r.is_published = TRUE AND c.is_visible = TRUE
       LIMIT 1`,
      [id]
    );
    if (!rows.length) return undefined;
    const [full] = await this.attachRelations([mapAdminRoomRow(rows[0])]);
    return toPublicRoom(full);
  }

  /**
   * Получить номер по id для админки (без учёта публикации/видимости).
   */
  async getAdminRoomById(id: number): Promise<AdminRoom | null> {
    const [rows] = await this.pool.query<RoomRow[]>(
      'SELECT * FROM rooms WHERE id = ? LIMIT 1',
      [id]
    );
    if (!rows.length) return null;
    const [full] = await this.attachRelations([mapAdminRoomRow(rows[0])]);
    return full;
  }

  /**
   * Получить список номеров для админки с фильтрами и поиском.
   */
  async getAdminRooms(filters?: {
    category?: string;
    search?: string;
  }): Promise<AdminRoom[]> {
    let sql = `
      SELECT r.*, c.label AS category_label
      FROM rooms r
      JOIN categories c ON c.category_key = r.category_key
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.category) {
      sql += ' AND r.category_key = ?';
      params.push(filters.category);
    }

    if (filters?.search) {
      sql += ' AND (r.name LIKE ? OR r.description LIKE ? OR r.full_description LIKE ?)';
      const like = `%${filters.search}%`;
      params.push(like, like, like);
    }

    sql += ' ORDER BY r.sort_order DESC, r.id ASC';

    const [rows] = await this.pool.query<any[]>(sql, params);
    const adminRooms = rows.map((row) => {
      const base = mapAdminRoomRow(row);
      return { ...base, category_label: row.category_label };
    });
    return this.attachRelations(adminRooms);
  }

  /**
   * Создать номер вместе со связями.
   */
  async createRoom(data: AdminRoomCreate): Promise<AdminRoom> {
    const roomId = await this.withTransaction(async (conn) => {
      const [result] = await conn.execute<import('mysql2/promise').ResultSetHeader>(
        `INSERT INTO rooms (name, category_key, price, old_price, price_day, price_half_day, area, guests, extra_guest_capacity, description, full_description, is_published, sort_order, price_label, price_day_label, price_half_day_label)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.name,
          data.category_key,
          data.price,
          data.old_price ?? null,
          data.price_day,
          data.price_half_day ?? null,
          data.area ?? null,
          data.guests ?? null,
          data.extra_guest_capacity ?? 0,
          data.description,
          data.full_description,
          data.is_published ?? true,
          data.sort_order ?? 0,
          data.price_label ?? null,
          data.price_day_label ?? null,
          data.price_half_day_label ?? null,
        ]
      );
      const roomId = result.insertId;

      if (data.amenities?.length) {
        await conn.query(
          'INSERT INTO room_amenities (room_id, amenity_key) VALUES ?',
          [data.amenities.map((key) => [roomId, key])]
        );
      }
      if (data.extras?.length) {
        await conn.query(
          'INSERT INTO room_extras (room_id, text, sort_order) VALUES ?',
          [data.extras.map((text, idx) => [roomId, text, idx])]
        );
      }
      if (data.images?.length) {
        await conn.query(
          'INSERT INTO room_images (room_id, path, sort_order) VALUES ?',
          [data.images.map((path, idx) => [roomId, path, idx])]
        );
      }
      if (data.tariffs?.length) {
        await conn.query(
          'INSERT INTO room_tariffs (room_id, tariff_id, custom_label, sort_order) VALUES ?',
          [data.tariffs.map((t, idx) => [roomId, t.tariff_id, t.custom_label, idx])]
        );
      }

      return roomId;
    });

    const created = await this.getAdminRoomById(roomId);
    if (!created) throw new Error('Не удалось получить созданный номер');
    return created;
  }

  /**
   * Обновить номер по id (частичное обновление, связи обновляются при явной передаче).
   */
  async updateRoom(id: number, data: AdminRoomUpdate): Promise<AdminRoom | null> {
    await this.withTransaction(async (conn) => {
      const fields: string[] = [];
      const values: any[] = [];

      if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
      if (data.category_key !== undefined) { fields.push('category_key = ?'); values.push(data.category_key); }
      if (data.old_price !== undefined) { fields.push('old_price = ?'); values.push(data.old_price); }
      if (data.price !== undefined) { fields.push('price = ?'); values.push(data.price); }
      if (data.price_day !== undefined) { fields.push('price_day = ?'); values.push(data.price_day); }
      if (data.price_half_day !== undefined) { fields.push('price_half_day = ?'); values.push(data.price_half_day); }
      if (data.area !== undefined) { fields.push('area = ?'); values.push(data.area); }
      if (data.guests !== undefined) { fields.push('guests = ?'); values.push(data.guests); }
      if (data.extra_guest_capacity !== undefined) { fields.push('extra_guest_capacity = ?'); values.push(data.extra_guest_capacity); }
      if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
      if (data.full_description !== undefined) { fields.push('full_description = ?'); values.push(data.full_description); }
      if (data.is_published !== undefined) { fields.push('is_published = ?'); values.push(data.is_published); }
      if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order); }
      if (data.price_label !== undefined) { fields.push('price_label = ?'); values.push(data.price_label); }
      if (data.price_day_label !== undefined) { fields.push('price_day_label = ?'); values.push(data.price_day_label); }
      if (data.price_half_day_label !== undefined) { fields.push('price_half_day_label = ?'); values.push(data.price_half_day_label); }

      if (fields.length) {
        fields.push('updated_at = NOW()');
        values.push(id);
        await conn.execute(`UPDATE rooms SET ${fields.join(', ')} WHERE id = ?`, values);
      }

      if (data.amenities !== undefined) {
        await conn.execute('DELETE FROM room_amenities WHERE room_id = ?', [id]);
        if (data.amenities.length) {
          await conn.query(
            'INSERT INTO room_amenities (room_id, amenity_key) VALUES ?',
            [data.amenities.map((key) => [id, key])]
          );
        }
      }

      if (data.extras !== undefined) {
        await conn.execute('DELETE FROM room_extras WHERE room_id = ?', [id]);
        if (data.extras.length) {
          await conn.query(
            'INSERT INTO room_extras (room_id, text, sort_order) VALUES ?',
            [data.extras.map((text, idx) => [id, text, idx])]
          );
        }
      }

      if (data.images !== undefined) {
        await conn.execute('DELETE FROM room_images WHERE room_id = ?', [id]);
        if (data.images.length) {
          await conn.query(
            'INSERT INTO room_images (room_id, path, sort_order) VALUES ?',
            [data.images.map((path, idx) => [id, path, idx])]
          );
        }
      }

      if (data.tariffs !== undefined) {
        await conn.execute('DELETE FROM room_tariffs WHERE room_id = ?', [id]);
        if (data.tariffs.length) {
          await conn.query(
            'INSERT INTO room_tariffs (room_id, tariff_id, custom_label, sort_order) VALUES ?',
            [data.tariffs.map((t, idx) => [id, t.tariff_id, t.custom_label, idx])]
          );
        }
      }

    });

    return this.getAdminRoomById(id);
  }

  /**
   * Удалить номер по id (каскадно удаляются связи).
   */
  async deleteRoom(id: number): Promise<void> {
    await this.pool.execute('DELETE FROM rooms WHERE id = ?', [id]);
  }

  /**
   * Массово обновить цены для списка номеров.
   */
  async bulkUpdatePrices(
    ids: number[],
    prices: Partial<{
      price: number;
      price_day: number;
      price_half_day: number;
      old_price: number | null;
    }>
  ): Promise<number> {
    if (!ids.length) return 0;
    const fields: string[] = [];
    const values: any[] = [];

    if (prices.price !== undefined) { fields.push('price = ?'); values.push(prices.price); }
    if (prices.price_day !== undefined) { fields.push('price_day = ?'); values.push(prices.price_day); }
    if (prices.price_half_day !== undefined) { fields.push('price_half_day = ?'); values.push(prices.price_half_day); }
    if (prices.old_price !== undefined) { fields.push('old_price = ?'); values.push(prices.old_price); }

    if (!fields.length) return 0;

    fields.push('updated_at = NOW()');
    const placeholders = ids.map(() => '?').join(',');
    const [result] = await this.pool.execute<import('mysql2/promise').ResultSetHeader>(
      `UPDATE rooms SET ${fields.join(', ')} WHERE id IN (${placeholders})`,
      [...values, ...ids]
    );
    return result.affectedRows;
  }
}