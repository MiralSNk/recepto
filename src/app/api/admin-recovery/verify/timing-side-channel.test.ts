/**
 * Регрессионный тест на закрытую timing-утечку. Раньше route.ts делал:
 *   if (!admin || !admin.secret_word_hash) { return ...401...; } // bcrypt.compare НЕ вызывался
 *   const isValid = await bcrypt.compare(secretWord, admin.secret_word_hash);
 * — при отсутствующем secret_word_hash ответ возвращался мгновенно, а при
 * неверном слове сервер тратил время на bcrypt.compare (cost factor 12).
 * Внешний атакующий, измеряя время ответа, мог надёжно отличить "функция
 * восстановления не настроена" от "настроена, но угадал неверно" — то, что
 * одинаковый текст ошибки (GENERIC_ERROR) как раз должен скрывать.
 *
 * Сейчас route.ts использует compareOrDummy() (src/lib/server/
 * constant-time-compare.ts), которая всегда вызывает bcrypt.compare — либо с
 * реальным hash, либо с фиксированным dummy-хешем. Тест не измеряет реальное
 * время (нестабильно в CI) — ловит причину напрямую: проверяет, что
 * bcrypt.compare вызывается в обеих ветках.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { createMockDB } from '@/test/mocks/db';

const mockDB = createMockDB({
  users: {
    findFirstAdmin: vi.fn().mockResolvedValue({
      id: 1,
      email: 'a@b.c',
      password_hash: 'x',
      secret_word_hash: null,
      role: 'admin',
    }),
  },
});

vi.mock('@/db', () => ({ getDB: () => mockDB }));

function req(body: unknown) {
  return new Request('http://localhost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/admin-recovery/verify — таймингова утечка "слово не задано"', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('bcrypt.compare вызывается и когда secret_word_hash === null (защита от timing-атаки)', async () => {
    const compareSpy = vi.spyOn(bcrypt, 'compare');
    mockDB.users.findFirstAdmin.mockResolvedValue({
      id: 1,
      email: 'a@b.c',
      password_hash: 'x',
      secret_word_hash: null,
      role: 'admin',
    });

    const { POST } = await import('./route');
    const res = await POST(req({ secretWord: 'что-угодно' }));

    expect(res.status).toBe(401);
    // compareOrDummy вызывает bcrypt.compare даже без реального hash
    // (сравнивая с dummy-хешем) — время ответа больше не выдаёт секрет.
    expect(compareSpy).toHaveBeenCalled();
  });
});
