import { describe, it, expect, vi } from 'vitest';
import { MySQLUserRepository } from '../mysql/repositories/user-repository';
import type { Pool } from 'mysql2/promise';

describe('MySQLUserRepository', () => {
  it('findByEmail возвращает пользователя', async () => {
    const pool = {
      query: vi.fn().mockResolvedValueOnce([
        [{ id: 1, email: 'admin@example.com', password_hash: 'hash', role: 'admin' }],
      ]),
    } as unknown as Pool;

    const repo = new MySQLUserRepository(pool);
    const user = await repo.findByEmail('admin@example.com');

    expect(user?.email).toBe('admin@example.com');
  });

  it('findFirstAdmin возвращает первого по id пользователя', async () => {
    const pool = {
      query: vi.fn().mockResolvedValueOnce([
        [{ id: 1, email: 'admin@example.com', password_hash: 'hash', secret_word_hash: 'secret-hash', role: 'admin' }],
      ]),
    } as unknown as Pool;

    const repo = new MySQLUserRepository(pool);
    const admin = await repo.findFirstAdmin();

    expect(pool.query).toHaveBeenCalledWith(
      'SELECT id, email, password_hash, secret_word_hash, role FROM users ORDER BY id ASC LIMIT 1'
    );
    expect(admin?.secret_word_hash).toBe('secret-hash');
  });

  it('findFirstAdmin возвращает null, если пользователей нет', async () => {
    const pool = { query: vi.fn().mockResolvedValueOnce([[]]) } as unknown as Pool;
    const repo = new MySQLUserRepository(pool);
    expect(await repo.findFirstAdmin()).toBeNull();
  });

  it('updateSecretWord обновляет колонку secret_word_hash', async () => {
    const pool = { execute: vi.fn().mockResolvedValue([{}]) } as unknown as Pool;
    const repo = new MySQLUserRepository(pool);
    await repo.updateSecretWord(1, 'new-hash');
    expect(pool.execute).toHaveBeenCalledWith(
      'UPDATE users SET secret_word_hash = ?, updated_at = NOW() WHERE id = ?',
      ['new-hash', 1]
    );
  });
});