import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { createMockDB } from '@/test/mocks/db';

const mockDB = createMockDB({
  bookings: {
    getBookings: vi.fn().mockResolvedValue([
      { id: 1, name: 'Иван', status: 'new' },
    ]),
  },
});

vi.mock('@/db', () => ({ getDB: () => mockDB }));

describe('/api/admin/bookings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('401', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const { GET } = await import('./route');
    expect((await GET(new Request('http://x'))).status).toBe(401);
  });

  it('200 + filter status', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const { GET } = await import('./route');
    const res = await GET(
      new Request('http://localhost/api/admin/bookings?status=new')
    );
    expect(res.status).toBe(200);
    expect(mockDB.bookings.getBookings).toHaveBeenCalled();
  });
});