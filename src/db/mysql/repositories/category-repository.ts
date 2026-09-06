import 'server-only';
import type { Pool, RowDataPacket, ExecuteValues } from 'mysql2/promise';
import type { ICategoryRepository } from '@/db/repositories/category.repository';
import type { AdminCategory } from '@/types';
import { CategoryRow, mapCategoryRow } from '../mappers';

/**
 * Реализация репозитория категорий для MySQL.
 */
export class MySQLCategoryRepository implements ICategoryRepository {
  constructor(private pool: Pool) {}

  /**
   * Получить все категории (включая скрытые) для админки.
   * Сортировка: sort_order по убыванию, затем id по возрастанию.
   */
  async getAllCategories(): Promise<AdminCategory[]> {
    const [rows] = await this.pool.query<CategoryRow[]>(
      'SELECT * FROM categories ORDER BY sort_order DESC, id ASC'
    );
    return rows.map(mapCategoryRow);
  }

  /**
   * Получить категорию по id.
   */
  async getCategoryById(id: number): Promise<AdminCategory | null> {
    const [rows] = await this.pool.query<CategoryRow[]>(
      'SELECT * FROM categories WHERE id = ? LIMIT 1',
      [id]
    );
    return rows.length ? mapCategoryRow(rows[0]) : null;
  }

  /**
   * Получить только видимые категории (для публичной части).
   */
  async getVisibleCategories(): Promise<
    Pick<AdminCategory, 'key' | 'label' | 'sort_order' | 'max_guests'>[]
  > {
    const [rows] = await this.pool.query<CategoryRow[]>(
      'SELECT * FROM categories WHERE is_visible = TRUE ORDER BY sort_order DESC, id ASC'
    );
    return rows.map(mapCategoryRow).map((c) => ({
      key: c.key,
      label: c.label,
      sort_order: c.sort_order,
      max_guests: c.max_guests,
    }));
  }

  /**
   * Получить категорию по уникальному ключу.
   */
  async getCategoryByKey(key: string): Promise<AdminCategory | null> {
    const [rows] = await this.pool.query<CategoryRow[]>(
      'SELECT * FROM categories WHERE category_key = ? LIMIT 1',
      [key]
    );
    return rows.length ? mapCategoryRow(rows[0]) : null;
  }

  /**
   * Получить текстовую метку категории по ключу.
   */
  async getCategoryLabel(key: string): Promise<string> {
    if (key === 'all') return 'Все номера';
    const row = await this.getCategoryByKey(key);
    return row?.label ?? key;
  }

  /**
   * Проверить существование видимой категории.
   */
  async categoryExists(key: string): Promise<boolean> {
    if (key === 'all') return true;
    const [rows] = await this.pool.query<RowDataPacket[]>(
      'SELECT id FROM categories WHERE category_key = ? AND is_visible = TRUE LIMIT 1',
      [key]
    );
    return rows.length > 0;
  }

  /**
   * Проверить, является ли ключ валидной категорией (включая 'all').
   */
  async isValidCategory(key: string): Promise<boolean> {
    if (!key || key === 'all') return key === 'all';
    return this.categoryExists(key);
  }

  /**
   * Создать новую категорию.
   */
  async createCategory(data: {
    key: string;
    label: string;
    sort_order?: number;
    is_visible?: boolean;
    max_guests?: number | null;
  }): Promise<AdminCategory> {
    const sortOrder = data.sort_order ?? 0;
    const isVisible = data.is_visible ?? true;
    await this.pool.execute(
      'INSERT INTO categories (category_key, label, sort_order, is_visible, max_guests) VALUES (?, ?, ?, ?, ?)',
      [data.key, data.label, sortOrder, isVisible, data.max_guests ?? null]
    );
    const newCategory = await this.getCategoryByKey(data.key);
    if (!newCategory) throw new Error('Не удалось получить созданную категорию');
    return newCategory;
  }

  /**
   * Обновить категорию по id (частичное обновление).
   */
  async updateCategory(
    id: number,
    data: Partial<{
      key: string;
      label: string;
      sort_order: number;
      is_visible: boolean;
      max_guests: number | null;
    }>
  ): Promise<AdminCategory | null> {
    const fields: string[] = [];
    const values: ExecuteValues[] = [];

    if (data.key !== undefined) {
      fields.push('category_key = ?');
      values.push(data.key);
    }
    if (data.label !== undefined) {
      fields.push('label = ?');
      values.push(data.label);
    }
    if (data.sort_order !== undefined) {
      fields.push('sort_order = ?');
      values.push(data.sort_order);
    }
    if (data.is_visible !== undefined) {
      fields.push('is_visible = ?');
      values.push(data.is_visible);
    }
    if (data.max_guests !== undefined) {
      fields.push('max_guests = ?');
      values.push(data.max_guests);
    }

    if (fields.length > 0) {
      fields.push('updated_at = NOW()');
      values.push(id);
      await this.pool.execute(
        `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }

    const [rows] = await this.pool.query<CategoryRow[]>(
      'SELECT * FROM categories WHERE id = ?',
      [id]
    );
    return rows.length ? mapCategoryRow(rows[0]) : null;
  }

  /**
   * Удалить категорию по id.
   */
  async deleteCategory(id: number): Promise<void> {
    await this.pool.execute('DELETE FROM categories WHERE id = ?', [id]);
  }

  /**
   * Подсчитать количество номеров в категории.
   */
  async countRoomsInCategory(categoryKey: string): Promise<number> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as cnt FROM rooms WHERE category_key = ?',
      [categoryKey]
    );
    return Number(rows[0]?.cnt ?? 0);
  }
}