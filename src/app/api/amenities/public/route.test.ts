import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockDB } from '@/test/mocks/db';

const mockDB = createMockDB({
  amenities: {
    getAllAmenities: vi.fn().mockResolvedValue([
      { id: 1, amenity_key: 'wifi', label: 'Wi‑Fi', sort_order: 10 },
    ]),
  },
});

vi.mock('@/db', () => ({ getDB: () => mockDB }));

describe('GET /api/amenities/public', () => {
  beforeEach(() => vi.clearAllMocks());

  it('отдаёт list + labels map', async () => {
    const { GET } = await import('./route');
    const res = await GET();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.labels.wifi).toBe('Wi‑Fi');
    expect(data.amenities[0].amenity_key).toBe('wifi');
  });
});