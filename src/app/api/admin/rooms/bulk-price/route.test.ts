import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { createMockDB } from '@/test/mocks/db';

const mockDB = createMockDB({
  rooms: {
    bulkUpdatePrices: vi.fn().mockResolvedValue(3),
  },
});

vi.mock('@/db', () => ({ getDB: () => mockDB }));

describe('/api/admin/rooms/bulk-price', () => {
  beforeEach(() => vi.clearAllMocks());

  it('401 без сессии', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://x', { method: 'POST', body: '{}' })
    );
    expect(res.status).toBe(401);
  });

  it('обновляет цены', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://x', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomIds: [1, 2, 3],
          price_day: 4500,
        }),
      })
    );
    expect([200, 201]).toContain(res.status);
  });

  // price ("Цена (основная)", карточки номеров) — умышленно независимое
  // поле, задаётся только по одному номеру в RoomFormModal.tsx. Массовое
  // обновление price_day не должно его трогать вовсе.
  it('массовое обновление price_day не трогает price', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const { POST } = await import('./route');
    await POST(
      new Request('http://x', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomIds: [1, 2, 3], price_day: 4500 }),
      })
    );
    const call = mockDB.rooms.bulkUpdatePrices.mock.calls[0][1];
    expect(call.price_day).toBe(4500);
    expect(call).not.toHaveProperty('price');
  });
});