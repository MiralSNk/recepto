import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { createMockDB } from '@/test/mocks/db';
import { PUT } from './route';

const HASH = bcrypt.hashSync('correct-password', 4);

const mockDB = createMockDB({
  users: {
    findByEmail: vi.fn().mockResolvedValue({ id: 1, email: 'a@b.c', password_hash: HASH, role: 'admin' }),
    updateSecretWord: vi.fn().mockResolvedValue(undefined),
  },
});

vi.mock('@/db', () => ({ getDB: () => mockDB }));

function req(body: unknown) {
  return new Request('http://localhost', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/admin/secret-word', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDB.users.findByEmail.mockResolvedValue({ id: 1, email: 'a@b.c', password_hash: HASH, role: 'admin' });
  });

  it('401 без сессии', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await PUT(req({ currentPassword: 'correct-password', secretWord: 'подсолнух' }));
    expect(res.status).toBe(401);
  });

  it('400 при неверном текущем пароле', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { email: 'a@b.c' } } as never);
    const res = await PUT(req({ currentPassword: 'wrong', secretWord: 'подсолнух' }));
    expect(res.status).toBe(400);
    expect(mockDB.users.updateSecretWord).not.toHaveBeenCalled();
  });

  it('400 при слишком коротком секретном слове', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { email: 'a@b.c' } } as never);
    const res = await PUT(req({ currentPassword: 'correct-password', secretWord: 'абв' }));
    expect(res.status).toBe(400);
  });

  it('200 — сохраняет хеш секретного слова (не сырой текст)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { email: 'a@b.c' } } as never);
    const res = await PUT(req({ currentPassword: 'correct-password', secretWord: 'подсолнух' }));
    expect(res.status).toBe(200);
    const [id, hash] = mockDB.users.updateSecretWord.mock.calls[0];
    expect(id).toBe(1);
    expect(hash).not.toBe('подсолнух');
    expect(await bcrypt.compare('подсолнух', hash)).toBe(true);
  });
});
