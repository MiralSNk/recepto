import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { createMockDB } from '@/test/mocks/db';

const mockDB = createMockDB({
  unansweredQueries: {
    getUnansweredQueries: vi.fn().mockResolvedValue([
      { id: 1, query_text: 'где слон?', count: 3 },
    ]),
  },
});

vi.mock('@/db', () => ({ getDB: () => mockDB }));

describe('/api/admin/unanswered-queries', () => {
  beforeEach(() => vi.clearAllMocks());

  it('401', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const { GET } = await import('./route');
    expect((await GET()).status).toBe(401);
  });

  it('200 list', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const { GET } = await import('./route');
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json())[0].query_text).toContain('слон');
  });
});