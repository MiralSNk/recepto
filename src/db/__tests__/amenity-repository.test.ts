import { describe, it, expect, vi } from 'vitest';
import { MySQLAmenityRepository } from '../mysql/repositories/amenity-repository';
import type { Pool } from 'mysql2/promise';

function createMockPool() {
  return {
    query: vi.fn(),
    execute: vi.fn(),
  } as unknown as Pool;
}

describe('MySQLAmenityRepository', () => {
  it('getAllAmenities возвращает список удобств', async () => {
    const pool = createMockPool();
    const rows = [
      { id: 1, amenity_key: 'wifi', label: 'Wi-Fi', sort_order: 10 },
    ];
    (pool.query as any).mockResolvedValueOnce([rows]);

    const repo = new MySQLAmenityRepository(pool);
    const amenities = await repo.getAllAmenities();

    expect(amenities).toHaveLength(1);
    expect(amenities[0].label).toBe('Wi-Fi');
  });

  it('getAmenityByKey возвращает null, если нет такого ключа', async () => {
    const pool = createMockPool();
    (pool.query as any).mockResolvedValueOnce([[]]);

    const repo = new MySQLAmenityRepository(pool);
    const amenity = await repo.getAmenityByKey('unknown');

    expect(amenity).toBeNull();
  });

  it('getAmenityById возвращает удобство по id', async () => {
    const pool = createMockPool();
    (pool.query as any).mockResolvedValueOnce([
      [{ id: 1, amenity_key: 'wifi', label: 'Wi-Fi', icon_url: '/uploads/wifi.svg', sort_order: 10 }],
    ]);

    const repo = new MySQLAmenityRepository(pool);
    const amenity = await repo.getAmenityById(1);

    expect(amenity?.icon_url).toBe('/uploads/wifi.svg');
  });

  it('getAmenityById возвращает null, если id не найден', async () => {
    const pool = createMockPool();
    (pool.query as any).mockResolvedValueOnce([[]]);

    const repo = new MySQLAmenityRepository(pool);
    expect(await repo.getAmenityById(999)).toBeNull();
  });
});