import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { createMockDB } from '@/test/mocks/db';

const mockDB = createMockDB({
  placeCategories: {
    updatePlaceCategory: vi.fn().mockResolvedValue(undefined),
    deletePlaceCategory: vi.fn().mockResolvedValue(undefined),
  },
});

vi.mock('@/db', () => ({ getDB: () => mockDB }));
const ctx = { params: Promise.resolve({ id: '1' }) };

describe('place-categories [id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('PUT', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const { PUT } = await import('./route');
    const res = await PUT(
      new Request('http://x', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: 'Еда+' }),
      }),
      ctx
    );
    expect(res.status).toBe(200);
  });

  it('DELETE', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const { DELETE } = await import('./route');
    expect((await DELETE(new Request('http://x'), ctx)).status).toBe(200);
  });
});