/**
 * Регрессионный тест на закрытую timing-утечку — тот же класс, что был и в
 * /api/admin-recovery/verify, в главном логине (src/lib/server/auth.ts,
 * CredentialsProvider.authorize). Раньше `!user || !(await bcrypt.compare(...))`
 * было коротким замыканием: когда пользователь с таким email не найден,
 * bcrypt.compare вообще не вызывался, и функция возвращалась почти
 * мгновенно, а при неверном пароле сервер ждал полный bcrypt.compare (cost
 * factor 12) — замер времени ответа тривиально отличал "такого email нет" от
 * "email есть, пароль неверный", хотя единый текст ошибки как раз должен был
 * это скрывать (user enumeration).
 *
 * Сейчас authorize() использует compareOrDummy() (src/lib/server/
 * constant-time-compare.ts), которая всегда вызывает bcrypt.compare — либо с
 * реальным хешем, либо с фиксированным DUMMY_HASH, если пользователь не
 * найден. Тест ловит причину напрямую (не измеряет реальное время —
 * нестабильно): проверяет, что bcrypt.compare вызывается даже когда
 * пользователь с данным email не найден.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { createMockDB } from '@/test/mocks/db';

const mockDB = createMockDB({
  users: {
    findByEmail: vi.fn().mockResolvedValue(null),
  },
});

vi.mock('@/db', () => ({ getDB: () => mockDB }));

describe('auth.ts authorize() — таймингова утечка user enumeration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDB.users.findByEmail.mockResolvedValue(null);
    // Лимитер логина — модульный singleton, ключ по email; сбрасываем модуль,
    // чтобы разные тесты не делили один и тот же счётчик попыток.
    vi.resetModules();
  });

  it('bcrypt.compare должен вызываться и когда email не найден в базе (защита от timing user-enumeration)', async () => {
    const compareSpy = vi.spyOn(bcrypt, 'compare');
    const { authOptions } = await import('./auth');
    // next-auth хранит переданную нами функцию authorize в provider.options —
    // сам provider.authorize внутри next-auth это отдельная обёртка-заглушка.
    const provider = authOptions.providers[0] as unknown as {
      options: { authorize: (creds: { email: string; password: string }) => Promise<unknown> };
    };

    await expect(
      provider.options.authorize({ email: 'no-such-user@example.com', password: 'anything123' })
    ).rejects.toThrow('Неверный email или пароль');

    // compareOrDummy вызывает bcrypt.compare даже при user === null (сравнивая
    // с DUMMY_HASH) — этот путь больше не отвечает быстрее, чем "email
    // существует, пароль неверный".
    expect(compareSpy).toHaveBeenCalled();
  });
});
