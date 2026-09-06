import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockDB } from '@/test/mocks/db';

const mockDB = createMockDB({
  chat: {
    getSetting: vi.fn(async (key: string) =>
      key === 'capabilities_text' ? 'Я умею…' : key === 'cancel_booking_text' ? 'Звоните' : null
    ),
    getQuickReplies: vi.fn().mockResolvedValue([
      { id: 1, label: 'Бронь', action: '__BOOK__', sort_order: 0 },
    ]),
  },
});

vi.mock('@/db', () => ({
  getDB: () => mockDB,
}));

describe('GET /api/chat/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('отдаёт capabilities, cancelBooking, quickReplies', async () => {
    const { GET } = await import('./route');
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.capabilities).toBe('Я умею…');
    expect(data.cancelBooking).toBe('Звоните');
    expect(data.quickReplies).toHaveLength(1);
    expect(data.quickReplies[0].action).toBe('__BOOK__');
  });
});