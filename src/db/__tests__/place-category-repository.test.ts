import { describe, it, expect, vi } from 'vitest';
import { MySQLPlaceCategoryRepository } from '../mysql/repositories/place-category-repository';
import type { Pool } from 'mysql2/promise';

function createMockPool() {
  return {
    query: vi.fn(),
    execute: vi.fn(),
  } as unknown as Pool;
}

describe('MySQLPlaceCategoryRepository', () => {
  it('getAllPlaceCategories возвращает категории', async () => {
    const pool = createMockPool();
    const rows = [
      { id: 1, category_key: 'food', label: 'Еда', sort_order: 10 },
    ];
    (pool.query as any).mockResolvedValueOnce([rows]);

    const repo = new MySQLPlaceCategoryRepository(pool);
    const categories = await repo.getAllPlaceCategories();

    expect(categories[0].label).toBe('Еда');
  });

  it('createPlaceCategory выполняет INSERT', async () => {
    const pool = createMockPool();
    (pool.execute as any).mockResolvedValue([{ insertId: 1 }]);

    const repo = new MySQLPlaceCategoryRepository(pool);
    await repo.createPlaceCategory({
      category_key: 'food',
      label: 'Еда',
    });

    expect(pool.execute).toHaveBeenCalledWith(
      'INSERT INTO place_categories (category_key, label, sort_order) VALUES (?, ?, ?)',
      ['food', 'Еда', 0]
    );
  });
});