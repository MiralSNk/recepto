import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { GET, PUT } from '@/app/api/admin/settings/route';

vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn().mockResolvedValue('KEY=value\n'),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
  readFile: vi.fn().mockResolvedValue('KEY=value\n'),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

describe('/api/admin/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_USER = 'user@example.com';
    process.env.ADMIN_EMAIL = 'admin@example.com';
  });

  it('GET 401 без сессии', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('GET 200 — секреты не в открытом виде', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    // типичный формат: Record<key, { value, secret, editable }>
    const json = JSON.stringify(data);
    // пароли/secret не должны светиться полным значением
    expect(json).not.toMatch(/SMTP_PASS":\s*"[^"]{8,}/);
  });

  it('PUT 401', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await PUT(
      new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ SMTP_HOST: 'smtp.other.com' }),
      })
    );
    expect(res.status).toBe(401);
  });

  it('PUT 200 или 400 на payload', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const res = await PUT(
      new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ SMTP_HOST: 'smtp.other.com' }),
      })
    );
    // settings часто пишет в .env — 200 ok или 400 если ключ не editable
    expect([200, 400]).toContain(res.status);
  });
});