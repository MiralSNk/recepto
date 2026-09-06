import 'server-only';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import type { IPlaceCategoryRepository } from '@/db/repositories/place-category.repository';
import type { PlaceCategory } from '@/types';

interface PlaceCategoryRow extends RowDataPacket {
  id: number;
  category_key: string;
  label: string;
  sort_order: number;
}

/**
 * Реализация репозитория категорий мест для MySQL.
 */
export class MySQLPlaceCategoryRepository implements IPlaceCategoryRepository {
  constructor(private pool: Pool) {}

  /**
   * Получить все категории мест.
   */
  async getAllPlaceCategories(): Promise<PlaceCategory[]> {
    const [rows] = await this.pool.query<PlaceCategoryRow[]>(
      'SELECT id, category_key, label, sort_order FROM place_categories ORDER BY sort_order, id'
    );
    return rows.map((row) => ({
      id: row.id,
      category_key: row.category_key,
      label: row.label,
      sort_order: row.sort_order,
    }));
  }

  /**
   * Создать категорию мест.
   */
  async createPlaceCategory(data: {
    category_key: string;
    label: string;
    sort_order?: number;
  }): Promise<{ id: number }> {
    const [result] = await this.pool.execute<import('mysql2/promise').ResultSetHeader>(
      'INSERT INTO place_categories (category_key, label, sort_order) VALUES (?, ?, ?)',
      [data.category_key, data.label, data.sort_order ?? 0]
    );
    return { id: result.insertId };
  }

  /**
   * Обновить категорию мест.
   */
  async updatePlaceCategory(
    id: number,
    data: Partial<{
      category_key: string;
      label: string;
      sort_order: number;
    }>
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.category_key !== undefined) { fields.push('category_key = ?'); values.push(data.category_key); }
    if (data.label !== undefined) { fields.push('label = ?'); values.push(data.label); }
    if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order); }

    if (fields.length) {
      values.push(id);
      await this.pool.execute(
        `UPDATE place_categories SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }
  }

  /**
   * Удалить категорию мест.
   */
  async deletePlaceCategory(id: number): Promise<void> {
    await this.pool.execute('DELETE FROM place_categories WHERE id = ?', [id]);
  }
}