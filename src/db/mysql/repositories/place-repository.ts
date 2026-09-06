import 'server-only';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import type { IPlaceRepository } from '@/db/repositories/place.repository';

interface PlaceRow extends RowDataPacket {
  id: number;
  name: string;
  category_key: string;
  lat: number;
  lon: number;
  description: string;
  sort_order: number;
  is_visible: boolean;
}

/**
 * Реализация репозитория мест (places) для MySQL.
 */
export class MySQLPlaceRepository implements IPlaceRepository {
  constructor(private pool: Pool) {}

  /**
   * Получить только видимые места (для чат-бота).
   */
  async getPlaces(): Promise<PlaceRow[]> {
    const [rows] = await this.pool.query<PlaceRow[]>(
      'SELECT id, name, category_key, lat, lon, description, sort_order, is_visible FROM places WHERE is_visible = TRUE ORDER BY sort_order, id'
    );
    return rows;
  }

  /**
   * Получить все места (включая скрытые) для админки.
   */
  async getAllPlaces(): Promise<PlaceRow[]> {
    const [rows] = await this.pool.query<PlaceRow[]>(
      'SELECT id, name, category_key, lat, lon, description, sort_order, is_visible FROM places ORDER BY sort_order, id'
    );
    return rows;
  }

  /**
   * Получить место по id.
   */
  async getPlaceById(id: number): Promise<PlaceRow | null> {
    const [rows] = await this.pool.query<PlaceRow[]>(
      'SELECT id, name, category_key, lat, lon, description, sort_order, is_visible FROM places WHERE id = ? LIMIT 1',
      [id]
    );
    return rows.length ? rows[0] : null;
  }

  /**
   * Создать новое место.
   */
  async createPlace(data: {
    name: string;
    category_key: string;
    lat: number;
    lon: number;
    description: string;
    sort_order?: number;
    is_visible?: boolean;
  }): Promise<{ id: number }> {
    const [result] = await this.pool.execute<import('mysql2/promise').ResultSetHeader>(
      `INSERT INTO places (name, category_key, lat, lon, description, sort_order, is_visible)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name,
        data.category_key,
        data.lat,
        data.lon,
        data.description,
        data.sort_order ?? 0,
        data.is_visible ?? true,
      ]
    );
    return { id: result.insertId };
  }

  /**
   * Обновить место по id (частичное обновление).
   */
  async updatePlace(
    id: number,
    data: Partial<{
      name: string;
      category_key: string;
      lat: number;
      lon: number;
      description: string;
      sort_order: number;
      is_visible: boolean;
    }>
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.category_key !== undefined) { fields.push('category_key = ?'); values.push(data.category_key); }
    if (data.lat !== undefined) { fields.push('lat = ?'); values.push(data.lat); }
    if (data.lon !== undefined) { fields.push('lon = ?'); values.push(data.lon); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order); }
    if (data.is_visible !== undefined) { fields.push('is_visible = ?'); values.push(data.is_visible); }

    if (fields.length) {
      fields.push('updated_at = NOW()');
      values.push(id);
      await this.pool.execute(
        `UPDATE places SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }
  }

  /**
   * Удалить место по id.
   */
  async deletePlace(id: number): Promise<void> {
    await this.pool.execute('DELETE FROM places WHERE id = ?', [id]);
  }
}