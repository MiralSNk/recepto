import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { createMockDB } from '@/test/mocks/db';
import { PUT, DELETE } from '@/app/api/admin/rooms/[id]/route';

// vi.mock хостится над статическим import route выше — обычный
// `const x = vi.fn()` объявленный ниже ещё не инициализирован в момент,
// когда фабрика мока реально выполняется (route.ts грузится тем самым
// static import). vi.hoisted гарантированно выполняется до vi.mock.
const { deleteUploadedFiles } = vi.hoisted(() => ({
  deleteUploadedFiles: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/server/file-storage', () => ({ deleteUploadedFiles }));

const room = {
  id: 5,
  name: '101',
  amenities: [] as string[],
  extras: [] as string[],
  images: ['/rooms/5/a.webp', '/rooms/5/b.webp'] as string[],
};

const mockDB = createMockDB({
  rooms: {
    getAdminRoomById: vi.fn().mockResolvedValue(room),
    updateRoom: vi.fn().mockResolvedValue({ ...room, name: '102' }),
    deleteRoom: vi.fn().mockResolvedValue(undefined),
  },
});

vi.mock('@/db', () => ({ getDB: () => mockDB }));

const ctx = { params: Promise.resolve({ id: '5' }) };

describe('/api/admin/rooms/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('PUT 401 без сессии', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await PUT(
      new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '102' }),
      }),
      ctx
    );
    expect(res.status).toBe(401);
  });

  it('PUT 200', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const res = await PUT(
      new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '102' }),
      }),
      ctx
    );
    expect([200, 201]).toContain(res.status);
  });

  // price и price_day — два умышленно независимых поля (заказчик
  // подтвердил, что показ на главной и везде остальном должен отличаться,
  // см. src/types/room.ts). Роут не должен подмешивать одно в другое.
  it('PUT передаёт price и price_day как независимые значения', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    await PUT(
      new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: 6000, price_day: 3690 }),
      }),
      ctx
    );
    const call = mockDB.rooms.updateRoom.mock.calls[0][1];
    expect(call.price).toBe(6000);
    expect(call.price_day).toBe(3690);
  });

  it('PUT с одним только price_day не передаёт price репозиторию', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    await PUT(
      new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price_day: 3690 }),
      }),
      ctx
    );
    const call = mockDB.rooms.updateRoom.mock.calls[0][1];
    expect(call.price_day).toBe(3690);
    expect(call).not.toHaveProperty('price');
  });

  it('PUT без изменений цен не передаёт их репозиторию', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    await PUT(
      new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '102' }),
      }),
      ctx
    );
    const call = mockDB.rooms.updateRoom.mock.calls[0];
    expect(call[1]).not.toHaveProperty('price');
    expect(call[1]).not.toHaveProperty('price_day');
  });

  it('DELETE 200', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const res = await DELETE(new Request('http://localhost', { method: 'DELETE' }), ctx);
    expect([200, 204]).toContain(res.status);
    expect(mockDB.rooms.deleteRoom).toHaveBeenCalled();
  });

  // Регрессия: удаление/замена фото номера не чистила файлы с диска —
  // загрузки только накапливались.
  it('DELETE — удаляет с диска все фото удалённого номера (каскад в БД файлы не трогает)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    await DELETE(new Request('http://localhost', { method: 'DELETE' }), ctx);
    expect(deleteUploadedFiles).toHaveBeenCalledWith(['/rooms/5/a.webp', '/rooms/5/b.webp']);
  });

  it('PUT — удаляет с диска только пропавшие из нового списка фото, не все', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    await PUT(
      new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: ['/rooms/5/a.webp', '/rooms/5/c.webp'] }),
      }),
      ctx
    );
    // b.webp пропал из нового списка, a.webp остался, c.webp — новый (не удаляем новые).
    expect(deleteUploadedFiles).toHaveBeenCalledWith(['/rooms/5/b.webp']);
  });

  it('PUT без поля images в запросе — фото номера не трогает вообще', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    await PUT(
      new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '102' }),
      }),
      ctx
    );
    expect(deleteUploadedFiles).not.toHaveBeenCalled();
  });
});