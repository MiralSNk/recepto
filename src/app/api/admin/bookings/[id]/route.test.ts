import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { createMockDB } from '@/test/mocks/db';

const mockDB = createMockDB({
  bookings: {
    getBookingById: vi.fn().mockResolvedValue({ id: 1, status: 'new' }),
    updateBookingStatus: vi.fn().mockResolvedValue(undefined),
  },
});

vi.mock('@/db', () => ({ getDB: () => mockDB }));
const ctx = { params: Promise.resolve({ id: '1' }) };

describe('bookings [id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET 200', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const { GET } = await import('./route');
    expect((await GET(new Request('http://x'), ctx)).status).toBe(200);
  });

  it('PUT status', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const { PUT } = await import('./route');
    const res = await PUT(
      new Request('http://x', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      }),
      ctx
    );
    expect(res.status).toBe(200);
    expect(mockDB.bookings.updateBookingStatus).toHaveBeenCalledWith(1, 'confirmed');
  });

  it('PUT 400 bad status', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const { PUT } = await import('./route');
    const res = await PUT(
      new Request('http://x', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'nope' }),
      }),
      ctx
    );
    expect(res.status).toBe(400);
  });
});