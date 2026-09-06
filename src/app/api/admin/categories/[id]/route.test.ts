import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { createMockDB } from '@/test/mocks/db';

const mockDB = createMockDB();

vi.mock('@/db', () => ({ getDB: () => mockDB }));

const ctx = { params: Promise.resolve({ id: '1' }) };

describe('/api/admin/categories/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Существующая категория для getCategoryById
    mockDB.categories.getCategoryById.mockResolvedValue({
      id: 1,
      key: 'comfort',
      label: 'Комфорт',
      is_visible: true,
      sort_order: 0,
    });

    // При обновлении возвращаем объект, а не undefined
    mockDB.categories.updateCategory.mockResolvedValue({
      id: 1,
      key: 'comfort',
      label: 'Новое',
      is_visible: true,
      sort_order: 0,
    });

    // Для проверки дубликатов ключей (если понадобится)
    mockDB.categories.getCategoryByKey.mockResolvedValue(null);
  });

  it('PUT 401', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const { PUT } = await import('./route');
    const res = await PUT(
      new Request('http://x', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: 'Новое' }),
      }),
      ctx
    );
    expect(res.status).toBe(401);
  });

  it('PUT 200', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const { PUT } = await import('./route');
    const res = await PUT(
      new Request('http://x', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: 'Новое' }),
      }),
      ctx
    );
    expect([200, 204]).toContain(res.status);
    expect(mockDB.categories.updateCategory).toHaveBeenCalled();
  });

  it('DELETE 200', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const { DELETE } = await import('./route');
    const res = await DELETE(new Request('http://x', { method: 'DELETE' }), ctx);
    expect([200, 204]).toContain(res.status);
    expect(mockDB.categories.deleteCategory).toHaveBeenCalledWith(1);
  });
});