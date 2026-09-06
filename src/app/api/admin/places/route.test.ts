import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { createMockDB } from '@/test/mocks/db';

const mockDB = createMockDB({
  places: {
    getAllPlaces: vi.fn().mockResolvedValue([
      { id: 1, name: 'Кафе', category_key: 'food', lat: 47, lon: 39 },
    ]),
    getPlaces: vi.fn().mockResolvedValue([]),
    createPlace: vi.fn().mockResolvedValue({ id: 2 }),
  },
});

vi.mock('@/db', () => ({ getDB: () => mockDB }));

describe('/api/admin/places', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET 401', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const { GET } = await import('./route');
    expect((await GET()).status).toBe(401);
  });

  it('GET 200', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const { GET } = await import('./route');
    const res = await GET();
    expect(res.status).toBe(200);
  });

  it('POST создаёт место', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://x', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Кафе',
          category_key: 'food',
          lat: 47.2,
          lon: 39.7,
          description: '',
          sort_order: 0,
          is_visible: true,
        }),
      })
    );
    expect([200, 201]).toContain(res.status);
  });
});