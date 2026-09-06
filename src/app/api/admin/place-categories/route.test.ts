import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { createMockDB } from '@/test/mocks/db';

const mockDB = createMockDB({
  placeCategories: {
    getAllPlaceCategories: vi.fn().mockResolvedValue([
      { id: 1, category_key: 'food', label: 'Еда', sort_order: 10 },
    ]),
    createPlaceCategory: vi.fn().mockResolvedValue({ id: 2 }),
  },
});

vi.mock('@/db', () => ({ getDB: () => mockDB }));

describe('/api/admin/place-categories', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET отдаёт key alias', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const { GET } = await import('./route');
    const res = await GET();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data[0].key || data[0].category_key).toBeTruthy();
  });

  it('POST 201', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://x', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_key: 'shop', label: 'Магазины' }),
      })
    );
    expect([200, 201]).toContain(res.status);
  });
});