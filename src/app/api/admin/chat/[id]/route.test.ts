import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { createMockDB } from '@/test/mocks/db';

const mockDB = createMockDB({
  chat: {
    deleteQuickReply: vi.fn().mockResolvedValue(undefined),
    updateQuickReply: vi.fn().mockResolvedValue(undefined),
  },
});

vi.mock('@/db', () => ({ getDB: () => mockDB }));
const ctx = { params: Promise.resolve({ id: '1' }) };

describe('/api/admin/chat/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('DELETE quick reply', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const { DELETE } = await import('./route');
    const res = await DELETE(new Request('http://x'), ctx);
    expect([200, 204]).toContain(res.status);
    expect(mockDB.chat.deleteQuickReply).toHaveBeenCalledWith(1);
  });
});