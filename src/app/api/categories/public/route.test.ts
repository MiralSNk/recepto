import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockDB } from '@/test/mocks/db';

const mockDB = createMockDB({
  categories: {
    getVisibleCategories: vi.fn().mockResolvedValue([
      { key: 'comfort', label: 'Комфорт' },
      { key: 'lux', label: 'Люкс' },
    ]),
  },
});

vi.mock('@/db', () => ({ getDB: () => mockDB }));

describe('GET /api/categories/public', () => {
  beforeEach(() => vi.clearAllMocks());

  it('отдаёт видимые категории', async () => {
    const { GET } = await import('./route');
    const res = await GET();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0].key).toBe('comfort');
  });
});