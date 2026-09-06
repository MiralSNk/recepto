import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { createMockDB } from '@/test/mocks/db';

const mockDB = createMockDB({
  categories: {
    getAllCategories: vi.fn().mockResolvedValue([{ id: 1, key: 'comfort', label: 'Комфорт' }]),
    createCategory: vi.fn().mockResolvedValue({ id: 2, key: 'biz', label: 'Бизнес' }),
  },
});

vi.mock('@/db', () => ({ getDB: () => mockDB }));

describe('/api/admin/categories', () => {
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
    expect((await res.json())[0].key).toBe('comfort');
  });

  it('POST 401', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://x', {
        method: 'POST',
        body: JSON.stringify({ key: 'a', label: 'A' }),
      })
    );
    expect(res.status).toBe(401);
  });

  it('POST создаёт категорию', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://x', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'biz',
          label: 'Бизнес',
          sort_order: 10,
          is_visible: true,
        }),
      })
    );
    expect([200, 201]).toContain(res.status);
  });
});