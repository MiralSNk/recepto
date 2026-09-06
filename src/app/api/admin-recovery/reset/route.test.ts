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
    updatePassword: vi.fn().mockResolvedValue(undefined),
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

describe('/api/admin-recovery/reset', () => {
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

  it('200 и меняет пароль при верном секретном слове', async () => {
    const { POST } = await import('./route');
    const res = await POST(req({ secretWord: 'подсолнух', newPassword: 'newSecurePass1' }));
    expect(res.status).toBe(200);
    expect(mockDB.users.updatePassword).toHaveBeenCalledWith(1, expect.any(String));
    const newHash = mockDB.users.updatePassword.mock.calls[0][1];
    expect(await bcrypt.compare('newSecurePass1', newHash)).toBe(true);
  });

  // Регрессия: reset не должен доверять тому, что клиент якобы уже прошёл
  // /verify на предыдущем экране — сам по себе обязан перепроверить слово.
  it('401 при неверном секретном слове — пароль не меняется', async () => {
    const { POST } = await import('./route');
    const res = await POST(req({ secretWord: 'неверно', newPassword: 'newSecurePass1' }));
    expect(res.status).toBe(401);
    expect(mockDB.users.updatePassword).not.toHaveBeenCalled();
  });

  it('400 при слишком коротком новом пароле', async () => {
    const { POST } = await import('./route');
    const res = await POST(req({ secretWord: 'подсолнух', newPassword: 'short' }));
    expect(res.status).toBe(400);
    expect(mockDB.users.updatePassword).not.toHaveBeenCalled();
  });

  it('401 общий текст, если секретное слово не задано вообще', async () => {
    mockDB.users.findFirstAdmin.mockResolvedValueOnce({
      id: 1,
      email: 'a@b.c',
      password_hash: 'x',
      secret_word_hash: null,
      role: 'admin',
    });
    const { POST } = await import('./route');
    const res = await POST(req({ secretWord: 'подсолнух', newPassword: 'newSecurePass1' }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Неверное секретное слово');
  });
});
