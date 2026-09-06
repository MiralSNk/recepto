import { describe, it, expect, vi } from 'vitest';
import { getServerSession } from 'next-auth';
import { createMockDB } from '@/test/mocks/db';

vi.mock('@/db', () => ({ getDB: () => mockDB }));

const mockDB = createMockDB({
  amenities: {
    getAllAmenities: vi.fn().mockResolvedValue([]),
  },
});

describe('amenities route', () => {
  it('smoke test', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const { GET } = await import('./route');
    const res = await GET();
    expect(res.status).toBe(200);
  });
});