import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { createMockDB } from '@/test/mocks/db';

const deleteUploadedFile = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/server/file-storage', () => ({ deleteUploadedFile }));

const SETTINGS: Record<string, string> = {
  hero_bg: '/uploads/old-hero.webp',
  hero_title: '',
  hero_subtitle: '',
  logo_full: '',
  logo_title: '',
  logo_subtitle: '',
};

const mockDB = createMockDB({
  siteSettings: {
    getSetting: vi.fn().mockImplementation(async (key: string) => SETTINGS[key] ?? null),
    setSetting: vi.fn().mockResolvedValue(undefined),
  },
});

vi.mock('@/db', () => ({ getDB: () => mockDB }));

describe('/api/admin/home', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET 401', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const { GET } = await import('./route');
    expect((await GET()).status).toBe(401);
  });

  it('GET 200', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const { GET } = await import('./route');
    expect((await GET()).status).toBe(200);
  });

  it('PUT 200', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const { PUT } = await import('./route');
    const res = await PUT(
      new Request('http://x', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hero_title: 'Hi' }),
      })
    );
    expect([200, 204]).toContain(res.status);
  });

  // Регрессия: замена/удаление hero-фона или лого не чистила старый файл —
  // загрузки только накапливались.
  it('PUT — замена hero_bg на другой файл удаляет старый', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const { PUT } = await import('./route');
    await PUT(
      new Request('http://x', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hero_bg: '/uploads/new-hero.webp' }),
      })
    );
    expect(deleteUploadedFile).toHaveBeenCalledWith('/uploads/old-hero.webp');
  });

  it('PUT — очистка hero_bg (пустая строка) тоже удаляет старый файл', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const { PUT } = await import('./route');
    await PUT(
      new Request('http://x', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hero_bg: '' }),
      })
    );
    expect(deleteUploadedFile).toHaveBeenCalledWith('/uploads/old-hero.webp');
  });

  it('PUT — hero_bg не пришёл в запросе — старый файл не трогает', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const { PUT } = await import('./route');
    await PUT(
      new Request('http://x', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hero_title: 'Новый заголовок' }),
      })
    );
    expect(deleteUploadedFile).not.toHaveBeenCalled();
  });
});
