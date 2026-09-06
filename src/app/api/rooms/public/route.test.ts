import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockDB } from '@/test/mocks/db';

const mockDB = createMockDB({
  rooms: {
    getAllRooms: vi.fn().mockResolvedValue([
      {
        id: 1,
        name: '101',
        price_day: 3500,
        price_half_day: 2000,
        category: 'comfort',
        description: 'x',
        fullDescription: 'y',
        amenities: [],
        extras: [],
        images: [],
      },
    ]),
  },
});

vi.mock('@/db', () => ({ getDB: () => mockDB }));

describe('GET /api/rooms/public', () => {
  beforeEach(() => vi.clearAllMocks());

  it('отдаёт урезанный список для формы брони', async () => {
    const { GET } = await import('./route');
    const res = await GET();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data[0]).toMatchObject({
      id: 1,
      name: '101',
      price_day: 3500,
      price_half_day: 2000,
    });
    expect(data[0].price).toBeUndefined();
    expect(data[0].fullDescription).toBeUndefined();
  });
});