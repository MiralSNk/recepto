/**
 * Регрессионный тест на закрытую уязвимость: лимитер /api/admin-recovery/
 * {verify,reset} раньше использовал в качестве ключа IP из X-Forwarded-For —
 * заголовка, полностью контролируемого клиентом при отсутствии доверенного
 * реверс-прокси. Атакующий мог подставлять новое значение заголовка на
 * каждый запрос — лимитер видел "нового клиента" на каждой попытке и
 * никогда не отдавал 429, сколько бы неверных слов ни было перебрано.
 *
 * Сейчас src/lib/server/admin-recovery-rate-limit.ts использует ГЛОБАЛЬНЫЙ
 * счётчик (единый ключ, не по IP) — этот тест бьёт по /verify 20 неверными
 * словами, каждый раз с новым X-Forwarded-For, и подтверждает, что лимит
 * всё равно исчерпывается и начинаются 429.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { createMockDB } from '@/test/mocks/db';

const SECRET_HASH = bcrypt.hashSync('подсолнух', 4);

const mockDB = createMockDB({
  users: {
    findFirstAdmin: vi.fn().mockResolvedValue({
      id: 1,
      email: 'a@b.c',
      password_hash: 'x',
      secret_word_hash: SECRET_HASH,
      role: 'admin',
    }),
  },
});

vi.mock('@/db', () => ({ getDB: () => mockDB }));

function reqWithIp(body: unknown, ip: string) {
  return new Request('http://localhost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });
}

describe('/api/admin-recovery/verify — обход rate limit подменой X-Forwarded-For', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDB.users.findFirstAdmin.mockResolvedValue({
      id: 1,
      email: 'a@b.c',
      password_hash: 'x',
      secret_word_hash: SECRET_HASH,
      role: 'admin',
    });
    vi.resetModules();
  });

  it('лимитер ловит перебор даже при разных X-Forwarded-For на каждый запрос', async () => {
    const { POST } = await import('./route');

    const statuses: number[] = [];
    for (let i = 0; i < 20; i++) {
      // Каждый запрос "приходит" с нового IP — раньше атакующий тривиально
      // подделывал бы заголовок, но лимитер теперь глобальный, не по IP.
      const res = await POST(reqWithIp({ secretWord: 'неверно' + i }, `1.2.3.${i}`));
      statuses.push(res.status);
    }

    // После 5 попыток (лимит по коду — createRateLimiter(5, 15*60_000))
    // должны начаться 429, независимо от заголовка X-Forwarded-For.
    expect(statuses).toContain(429);
  });
});
