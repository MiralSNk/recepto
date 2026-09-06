import { describe, it, expect, vi } from 'vitest';
import { MySQLTariffRepository } from '../mysql/repositories/tariff-repository';
import type { Pool } from 'mysql2/promise';

function createMockPool() {
  return {
    query: vi.fn(),
    execute: vi.fn(),
  } as unknown as Pool;
}

describe('MySQLTariffRepository', () => {
  it('getAllTariffs возвращает список тарифов, приводя is_builtin/in_calculator к boolean', async () => {
    const pool = createMockPool();
    const rows = [
      { id: 1, tariff_key: 'second_guest', label: 'Доплата за 2-го гостя', price: 400, is_builtin: 1, in_calculator: 1, sort_order: 10 },
    ];
    (pool.query as any).mockResolvedValueOnce([rows]);

    const repo = new MySQLTariffRepository(pool);
    const tariffs = await repo.getAllTariffs();

    expect(tariffs).toHaveLength(1);
    expect(tariffs[0].is_builtin).toBe(true);
    expect(tariffs[0].in_calculator).toBe(true);
    expect(tariffs[0].price).toBe(400);
  });

  it('getTariffByKey возвращает null, если нет такого ключа', async () => {
    const pool = createMockPool();
    (pool.query as any).mockResolvedValueOnce([[]]);

    const repo = new MySQLTariffRepository(pool);
    const tariff = await repo.getTariffByKey('unknown');

    expect(tariff).toBeNull();
  });

  it('createTariff вставляет is_builtin=false по умолчанию', async () => {
    const pool = createMockPool();
    (pool.execute as any).mockResolvedValueOnce([{ insertId: 5 }]);

    const repo = new MySQLTariffRepository(pool);
    const result = await repo.createTariff({ tariff_key: 'pet_deposit', label: 'Депозит за животных', price: 800 });

    expect(result.id).toBe(5);
    const [, params] = (pool.execute as any).mock.calls[0];
    expect(params).toEqual(['pet_deposit', 'Депозит за животных', 800, false, false, 0]);
  });

  it('updateTariff обновляет только переданные поля', async () => {
    const pool = createMockPool();
    (pool.execute as any).mockResolvedValueOnce([{}]);

    const repo = new MySQLTariffRepository(pool);
    await repo.updateTariff(3, { price: 900 });

    const [sql, params] = (pool.execute as any).mock.calls[0];
    expect(sql).toContain('price = ?');
    expect(sql).not.toContain('label = ?');
    expect(params).toEqual([900, 3]);
  });

  it('countRoomTariffUsage возвращает число привязок', async () => {
    const pool = createMockPool();
    (pool.query as any).mockResolvedValueOnce([[{ count: 3 }]]);

    const repo = new MySQLTariffRepository(pool);
    const count = await repo.countRoomTariffUsage(1);

    expect(count).toBe(3);
  });
});
