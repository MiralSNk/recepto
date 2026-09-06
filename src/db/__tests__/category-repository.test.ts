import { describe, it, expect, vi } from 'vitest';
import { MySQLCategoryRepository } from '../mysql/repositories/category-repository';
import type { Pool } from 'mysql2/promise';

function createMockPool() {
  return {
    query: vi.fn(),
    execute: vi.fn(),
  } as unknown as Pool;
}

describe('MySQLCategoryRepository', () => {
  it('getAllCategories выполняет правильный SQL и возвращает массив', async () => {
    const pool = createMockPool();
    (pool.query as any).mockResolvedValueOnce([
      [
        {
          id: 1,
          category_key: 'standard',
          label: 'Стандарт',
          sort_order: 10,
          is_visible: 1,
          max_guests: null,
          created_at: '2026-08-29',
          updated_at: '2026-08-29',
        },
      ],
    ]);

    const repo = new MySQLCategoryRepository(pool);
    const categories = await repo.getAllCategories();

    expect(pool.query).toHaveBeenCalledWith(
      'SELECT * FROM categories ORDER BY sort_order DESC, id ASC'
    );
    expect(categories).toHaveLength(1);
    expect(categories[0].label).toBe('Стандарт');
  });

  it('getCategoryByKey возвращает null, если категория не найдена', async () => {
    const pool = createMockPool();
    (pool.query as any).mockResolvedValueOnce([[]]);

    const repo = new MySQLCategoryRepository(pool);
    const category = await repo.getCategoryByKey('nonexistent');

    expect(category).toBeNull();
  });

  it('createCategory вставляет и возвращает созданную категорию', async () => {
    const pool = createMockPool();
    (pool.execute as any).mockResolvedValue([{ insertId: 1 }]);
    (pool.query as any).mockResolvedValueOnce([
      [
        {
          id: 1,
          category_key: 'new_cat',
          label: 'Новая категория',
          sort_order: 5,
          is_visible: 1,
          max_guests: null,
          created_at: '2026-08-29',
          updated_at: '2026-08-29',
        },
      ],
    ]);

    const repo = new MySQLCategoryRepository(pool);
    const created = await repo.createCategory({
      key: 'new_cat',
      label: 'Новая категория',
      sort_order: 5,
    });

    expect(created.key).toBe('new_cat');
    expect(pool.execute).toHaveBeenCalledWith(
      'INSERT INTO categories (category_key, label, sort_order, is_visible, max_guests) VALUES (?, ?, ?, ?, ?)',
      ['new_cat', 'Новая категория', 5, true, null]
    );
  });

  // Регрессия: лимит гостей категории — фолбэк для пикера, когда у номера
  // нет своей вместимости (см. src/lib/shared/guest-limits.ts).
  it('getVisibleCategories возвращает max_guests вместе с остальными полями', async () => {
    const pool = createMockPool();
    (pool.query as any).mockResolvedValueOnce([
      [
        {
          id: 1,
          category_key: 'comfort',
          label: 'Комфорт',
          sort_order: 10,
          is_visible: 1,
          max_guests: 6,
          created_at: '2026-08-29',
          updated_at: '2026-08-29',
        },
      ],
    ]);

    const repo = new MySQLCategoryRepository(pool);
    const categories = await repo.getVisibleCategories();

    expect(categories).toEqual([{ key: 'comfort', label: 'Комфорт', sort_order: 10, max_guests: 6 }]);
  });

  it('updateCategory обновляет max_guests, включая сброс в null', async () => {
    const pool = createMockPool();
    (pool.execute as any).mockResolvedValue([{}]);
    (pool.query as any).mockResolvedValueOnce([
      [
        {
          id: 1,
          category_key: 'comfort',
          label: 'Комфорт',
          sort_order: 10,
          is_visible: 1,
          max_guests: null,
          created_at: '2026-08-29',
          updated_at: '2026-08-29',
        },
      ],
    ]);

    const repo = new MySQLCategoryRepository(pool);
    await repo.updateCategory(1, { max_guests: null });

    const [sql, values] = (pool.execute as any).mock.calls[0];
    expect(sql).toContain('max_guests = ?');
    expect(values).toContain(null);
  });
});