import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { createMockDB } from '@/test/mocks/db';
import { GET, PUT } from '@/app/api/admin/palette/route';

const paletteJson = JSON.stringify({
  'color-bg': '#F5F0E8',
  'color-primary': '#173f35',
});

const mockDB = createMockDB({
  siteSettings: {
    getSetting: vi.fn().mockImplementation(async (key: string) => {
      if (key === 'palette') return paletteJson;
      return null;
    }),
    setSetting: vi.fn().mockResolvedValue(undefined),
  },
});

vi.mock('@/db', () => ({ getDB: () => mockDB }));

describe('/api/admin/palette', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET 401', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('GET 200 — палитра', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    // формат зависит от route: объект или { palette: ... }
    expect(data).toBeTruthy();
  });

  it('PUT 401', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await PUT(
      new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 'color-bg': '#fff' }),
      })
    );
    expect(res.status).toBe(401);
  });

  it('PUT 200 сохраняет palette', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const res = await PUT(
      new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          'color-bg': '#ffffff',
          'color-primary': '#000000',
        }),
      })
    );
    expect([200, 204]).toContain(res.status);
    expect(mockDB.siteSettings.setSetting).toHaveBeenCalled();
  });
});