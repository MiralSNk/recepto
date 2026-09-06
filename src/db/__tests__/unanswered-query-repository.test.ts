import { describe, it, expect, vi } from 'vitest';
import { MySQLUnansweredQueryRepository } from '../mysql/repositories/unanswered-query-repository';
import type { Pool } from 'mysql2/promise';

function createMockPool() {
  return {
    query: vi.fn(),
    execute: vi.fn(),
  } as unknown as Pool;
}

describe('MySQLUnansweredQueryRepository', () => {
  it('getUnansweredQueries возвращает answer', async () => {
    const pool = createMockPool();
    const rows = [
      {
        id: 1,
        query_text: 'Как добраться?',
        answer: null,
        answered_at: null,
        count: 5,
        last_asked_at: '...',
        created_at: '...',
      },
      {
        id: 2,
        query_text: 'Где парковка?',
        answer: 'Парковка во дворе',
        answered_at: '2026-01-01',
        count: 2,
        last_asked_at: '...',
        created_at: '...',
      },
    ];
    (pool.query as any).mockResolvedValueOnce([rows]);

    const repo = new MySQLUnansweredQueryRepository(pool);
    const queries = await repo.getUnansweredQueries();

    expect(queries[0].query_text).toBe('Как добраться?');
    expect(queries[0].answer).toBeNull();
    expect(queries[1].answer).toBe('Парковка во дворе');
  });

  it('upsertUnansweredQuery вызывает INSERT ... ON DUPLICATE KEY UPDATE', async () => {
    const pool = createMockPool();
    (pool.execute as any).mockResolvedValue([{ affectedRows: 1 }]);

    const repo = new MySQLUnansweredQueryRepository(pool);
    await repo.upsertUnansweredQuery('Новый вопрос');

    expect(pool.execute).toHaveBeenCalled();
    const [sql, params] = (pool.execute as any).mock.calls[0];
    expect(sql).toContain('INSERT INTO chat_unanswered_queries');
    expect(sql).toContain('ON DUPLICATE KEY UPDATE');
    expect(params).toEqual(['Новый вопрос']);
  });

  it('findAnswer возвращает текст при совпадении', async () => {
    const pool = createMockPool();
    (pool.query as any).mockResolvedValueOnce([
      [{ answer: 'Ответ админа' }],
    ]);

    const repo = new MySQLUnansweredQueryRepository(pool);
    const answer = await repo.findAnswer('Как добраться?');

    expect(answer).toBe('Ответ админа');
    const [sql, params] = (pool.query as any).mock.calls[0];
    expect(sql).toContain('LOWER(query_text)');
    expect(params[0]).toBe('Как добраться?');
  });

  it('findAnswer возвращает null если ответа нет', async () => {
    const pool = createMockPool();
    (pool.query as any).mockResolvedValueOnce([[]]);

    const repo = new MySQLUnansweredQueryRepository(pool);
    const answer = await repo.findAnswer('Неизвестный вопрос');

    expect(answer).toBeNull();
  });

  it('setAnswer обновляет answer и answered_at', async () => {
    const pool = createMockPool();
    (pool.execute as any).mockResolvedValue([{ affectedRows: 1 }]);

    const repo = new MySQLUnansweredQueryRepository(pool);
    await repo.setAnswer(3, '  Текст ответа  ');

    const [sql, params] = (pool.execute as any).mock.calls[0];
    expect(sql).toContain('SET answer');
    expect(params).toEqual(['Текст ответа', 3]);
  });

  it('clearAnswer обнуляет answer', async () => {
    const pool = createMockPool();
    (pool.execute as any).mockResolvedValue([{ affectedRows: 1 }]);

    const repo = new MySQLUnansweredQueryRepository(pool);
    await repo.clearAnswer(7);

    const [sql, params] = (pool.execute as any).mock.calls[0];
    expect(sql).toContain('answer = NULL');
    expect(params).toEqual([7]);
  });
});