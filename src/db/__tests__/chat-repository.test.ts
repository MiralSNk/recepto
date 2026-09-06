import { describe, it, expect, vi } from 'vitest';
import { MySQLChatRepository } from '../mysql/repositories/chat-repository';
import type { Pool } from 'mysql2/promise';

describe('MySQLChatRepository', () => {
  it('getSetting возвращает значение', async () => {
    const pool = {
      query: vi.fn().mockResolvedValueOnce([[{ value: 'Привет' }]]),
    } as unknown as Pool;

    const repo = new MySQLChatRepository(pool);
    const value = await repo.getSetting('capabilities_text');

    expect(value).toBe('Привет');
  });

  it('getQuickReplies возвращает кнопки', async () => {
    const pool = {
      query: vi.fn().mockResolvedValueOnce([
        [{ id: 1, label: 'Кнопка', action: 'test', sort_order: 0 }],
      ]),
    } as unknown as Pool;

    const repo = new MySQLChatRepository(pool);
    const replies = await repo.getQuickReplies();

    expect(replies[0].label).toBe('Кнопка');
  });
});