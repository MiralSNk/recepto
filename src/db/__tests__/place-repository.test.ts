import { describe, it, expect, vi } from 'vitest';
import { MySQLPlaceRepository } from '../mysql/repositories/place-repository';
import type { Pool } from 'mysql2/promise';

function createMockPool() {
  return {
    query: vi.fn(),
    execute: vi.fn(),
  } as unknown as Pool;
}

describe('MySQLPlaceRepository', () => {
  it('getPlaces возвращает только видимые места с полем category_key', async () => {
    const pool = createMockPool();
    const placeRow = {
      id: 1,
      name: 'Гастрономъ',
      category_key: 'food',
      lat: 47.2182,
      lon: 39.7184,
      description: 'ул. Береговая, 100 м',
      sort_order: 1,
      is_visible: 1,
    };

    (pool.query as any).mockResolvedValueOnce([[placeRow]]);

    const repo = new MySQLPlaceRepository(pool);
    const places = await repo.getPlaces();

    // Проверяем, что query был вызван один раз с SQL, содержащим условие видимости
    expect(pool.query).toHaveBeenCalledTimes(1);
    const [sql] = (pool.query as any).mock.calls[0];
    expect(sql).toContain('FROM places WHERE is_visible = TRUE');
    expect(places[0].category_key).toBe('food');
  });

  it('createPlace использует category_key', async () => {
    const pool = createMockPool();
    (pool.execute as any).mockResolvedValue([{ insertId: 1 }]);

    const repo = new MySQLPlaceRepository(pool);
    await repo.createPlace({
      name: 'Новое место',
      category_key: 'food',
      lat: 47.0,
      lon: 39.0,
      description: 'Описание',
    });

    expect(pool.execute).toHaveBeenCalled();
    const [sql, params] = (pool.execute as any).mock.calls[0];
    expect(sql).toContain('INSERT INTO places');
    expect(sql).toContain('category_key');
    expect(params).toEqual(['Новое место', 'food', 47.0, 39.0, 'Описание', 0, true]);
  });
});