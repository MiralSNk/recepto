import 'server-only';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import type { IAmenityRepository } from '@/db/repositories/amenity.repository';
import type { Amenity } from '@/types';

interface AmenityRow extends RowDataPacket {
  id: number;
  amenity_key: string;
  label: string;
  icon_url: string | null;
  sort_order: number;
}

/**
 * Реализация репозитория удобств для MySQL.
 */
export class MySQLAmenityRepository implements IAmenityRepository {
  constructor(private pool: Pool) {}

  /**
   * Получить все удобства (сортировка по sort_order).
   */
  async getAllAmenities(): Promise<Amenity[]> {
    const [rows] = await this.pool.query<AmenityRow[]>(
      'SELECT id, amenity_key, label, icon_url, sort_order FROM amenities ORDER BY sort_order, id'
    );
    return rows.map((row) => ({
      id: row.id,
      amenity_key: row.amenity_key,
      label: row.label,
      icon_url: row.icon_url,
      sort_order: row.sort_order,
    }));
  }

  /**
   * Получить удобство по ключу.
   */
  async getAmenityByKey(key: string): Promise<Amenity | null> {
    const [rows] = await this.pool.query<AmenityRow[]>(
      'SELECT id, amenity_key, label, icon_url, sort_order FROM amenities WHERE amenity_key = ? LIMIT 1',
      [key]
    );
    return rows.length
      ? {
          id: rows[0].id,
          amenity_key: rows[0].amenity_key,
          label: rows[0].label,
          icon_url: rows[0].icon_url,
          sort_order: rows[0].sort_order,
        }
      : null;
  }

  /**
   * Получить удобство по id.
   */
  async getAmenityById(id: number): Promise<Amenity | null> {
    const [rows] = await this.pool.query<AmenityRow[]>(
      'SELECT id, amenity_key, label, icon_url, sort_order FROM amenities WHERE id = ? LIMIT 1',
      [id]
    );
    return rows.length
      ? {
          id: rows[0].id,
          amenity_key: rows[0].amenity_key,
          label: rows[0].label,
          icon_url: rows[0].icon_url,
          sort_order: rows[0].sort_order,
        }
      : null;
  }

  /**
   * Создать новое удобство.
   */
  async createAmenity(data: {
    amenity_key: string;
    label: string;
    icon_url?: string | null;
    sort_order?: number;
  }): Promise<{ id: number }> {
    const [result] = await this.pool.execute<import('mysql2/promise').ResultSetHeader>(
      'INSERT INTO amenities (amenity_key, label, icon_url, sort_order) VALUES (?, ?, ?, ?)',
      [data.amenity_key, data.label, data.icon_url ?? null, data.sort_order ?? 0]
    );
    return { id: result.insertId };
  }

  /**
   * Обновить удобство.
   */
  async updateAmenity(
    id: number,
    data: Partial<{
      amenity_key: string;
      label: string;
      icon_url: string | null;
      sort_order: number;
    }>
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.amenity_key !== undefined) { fields.push('amenity_key = ?'); values.push(data.amenity_key); }
    if (data.label !== undefined) { fields.push('label = ?'); values.push(data.label); }
    if (data.icon_url !== undefined) { fields.push('icon_url = ?'); values.push(data.icon_url); }
    if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order); }

    if (fields.length) {
      values.push(id);
      await this.pool.execute(
        `UPDATE amenities SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }
  }

  /**
   * Удалить удобство.
   */
  async deleteAmenity(id: number): Promise<void> {
    await this.pool.execute('DELETE FROM amenities WHERE id = ?', [id]);
  }
}