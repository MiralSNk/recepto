import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { createMockDB } from '@/test/mocks/db';

vi.mock('@/db', () => ({ getDB: () => mockDB }));

const deleteUploadedFile = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/server/file-storage', () => ({ deleteUploadedFile }));

const mockDB = createMockDB({
  amenities: {
    getAmenityById: vi.fn().mockResolvedValue(null),
    updateAmenity: vi.fn().mockResolvedValue(undefined),
    deleteAmenity: vi.fn().mockResolvedValue(undefined),
  },
});

const ctx = { params: Promise.resolve({ id: '1' }) };

describe('amenity by id route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDB.amenities.getAmenityById.mockResolvedValue(null);
  });

  it('PUT smoke test', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const { PUT } = await import('./route');
    const res = await PUT(
      new Request('http://x', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: 'Wi-Fi' }),
      }),
      ctx
    );
    expect([200, 204]).toContain(res.status);
  });

  // Регрессия: замена/удаление иконки не чистила старый файл с диска —
  // загрузки только накапливались.
  it('PUT — при замене icon_url удаляет старый файл', async () => {
    mockDB.amenities.getAmenityById.mockResolvedValueOnce({
      id: 1,
      amenity_key: 'wifi',
      label: 'Wi-Fi',
      icon_url: '/uploads/old.webp',
      sort_order: 0,
    });
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const { PUT } = await import('./route');
    await PUT(
      new Request('http://x', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ icon_url: '/uploads/new.webp' }),
      }),
      ctx
    );
    expect(deleteUploadedFile).toHaveBeenCalledWith('/uploads/old.webp');
  });

  it('PUT — icon_url не менялся в запросе — старый файл не трогает', async () => {
    mockDB.amenities.getAmenityById.mockResolvedValueOnce({
      id: 1,
      amenity_key: 'wifi',
      label: 'Wi-Fi',
      icon_url: '/uploads/old.webp',
      sort_order: 0,
    });
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const { PUT } = await import('./route');
    await PUT(
      new Request('http://x', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: 'Wi-Fi 6' }),
      }),
      ctx
    );
    expect(deleteUploadedFile).not.toHaveBeenCalled();
  });

  it('DELETE — удаляет иконку удобства с диска', async () => {
    mockDB.amenities.getAmenityById.mockResolvedValueOnce({
      id: 1,
      amenity_key: 'wifi',
      label: 'Wi-Fi',
      icon_url: '/uploads/old.webp',
      sort_order: 0,
    });
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const { DELETE } = await import('./route');
    await DELETE(new Request('http://x', { method: 'DELETE' }), ctx);
    expect(deleteUploadedFile).toHaveBeenCalledWith('/uploads/old.webp');
  });
});
