import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { createMockDB } from '@/test/mocks/db';

const mockDB = createMockDB({
  places: {
    updatePlace: vi.fn().mockResolvedValue(undefined),
    deletePlace: vi.fn().mockResolvedValue(undefined),
  },
});

vi.mock('@/db', () => ({ getDB: () => mockDB }));
const ctx = { params: Promise.resolve({ id: '1' }) };

describe('/api/admin/places/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('PUT 200', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const { PUT } = await import('./route');
    const res = await PUT(
      new Request('http://x', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Новое' }),
      }),
      ctx
    );
    expect([200, 204]).toContain(res.status);
  });

  it('DELETE 200', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const { DELETE } = await import('./route');
    const res = await DELETE(new Request('http://x'), ctx);
    expect([200, 204]).toContain(res.status);
  });
});