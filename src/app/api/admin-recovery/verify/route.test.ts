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

function req(body: unknown) {
  return new Request('http://localhost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/admin-recovery/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDB.users.findFirstAdmin.mockResolvedValue({
      id: 1,
      email: 'a@b.c',
      password_hash: 'x',
      secret_word_hash: SECRET_HASH,
      role: 'admin',
    });
    // Лимитер — модульный singleton, общий для verify/reset — сбрасываем
    // модуль между тестами, иначе они делят один счётчик попыток по IP.
    vi.resetModules();
  });

  it('200 при верном слове', async () => {
    const { POST } = await import('./route');
    const res = await POST(req({ secretWord: 'подсолнух' }));
    expect(res.status).toBe(200);
  });

  it('401 при неверном слове (общий текст ошибки)', async () => {
    const { POST } = await import('./route');
    const res = await POST(req({ secretWord: 'неверно' }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Неверное секретное слово');
  });

  it('401 с тем же текстом, если секретное слово вообще не задано (не палим доступность функции)', async () => {
    mockDB.users.findFirstAdmin.mockResolvedValueOnce({
      id: 1,
      email: 'a@b.c',
      password_hash: 'x',
      secret_word_hash: null,
      role: 'admin',
    });
    const { POST } = await import('./route');
    const res = await POST(req({ secretWord: 'что-угодно' }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Неверное секретное слово');
  });

  it('429 после превышения лимита попыток', async () => {
    const { POST } = await import('./route');
    for (let i = 0; i < 5; i++) {
      await POST(req({ secretWord: 'неверно' }));
    }
    const res = await POST(req({ secretWord: 'подсолнух' }));
    expect(res.status).toBe(429);
  });
});
