import { describe, it, expect, vi } from 'vitest';
import { MySQLBookingRepository } from '../mysql/repositories/booking-repository';
import type { Pool } from 'mysql2/promise';

describe('MySQLBookingRepository', () => {
  it('createBooking вставляет данные', async () => {
    const pool = {
      execute: vi.fn().mockResolvedValue([{ insertId: 1 }]),
    } as unknown as Pool;

    const repo = new MySQLBookingRepository(pool);
    const result = await repo.createBooking({
      name: 'Иван',
      phone: '+79990000000',
      adults: 2,
    });

    expect(result.id).toBe(1);
    expect(pool.execute).toHaveBeenCalled();
  });
});