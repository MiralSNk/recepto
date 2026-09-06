import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { createMockDB } from '@/test/mocks/db';

const mockDB = createMockDB({
  chat: {
    getSetting: vi.fn(async (k: string) =>
      k === 'capabilities_text' ? 'cap' : k === 'cancel_booking_text' ? 'cancel' : null
    ),
    setSetting: vi.fn().mockResolvedValue(undefined),
    getQuickReplies: vi.fn().mockResolvedValue([
      { id: 1, label: 'Бронь', action: '__BOOK__', sort_order: 0 },
    ]),
    createQuickReply: vi.fn().mockResolvedValue({ id: 2 }),
  },
});

vi.mock('@/db', () => ({ getDB: () => mockDB }));

describe('/api/admin/chat', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET 401', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const { GET } = await import('./route');
    expect((await GET()).status).toBe(401);
  });

  it('GET 200 settings + replies', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const { GET } = await import('./route');
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.settings || data.capabilities || data.quickReplies).toBeTruthy();
  });

  it('PUT сохраняет setting', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const { PUT } = await import('./route');
    const res = await PUT(
      new Request('http://x', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setting_key: 'capabilities_text',
          value: 'new',
        }),
      })
    );
    expect([200, 204]).toContain(res.status);
  });

  it('POST quick reply', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://x', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: 'Звонок', action: '__CALL__', sort_order: 10 }),
      })
    );
    expect([200, 201]).toContain(res.status);
  });
});