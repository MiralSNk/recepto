import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { createMockDB } from '@/test/mocks/db';
import { GET, POST } from './route'; // статический импорт

const mockDB = createMockDB({
  categories: {
    getCategoryByKey: vi.fn().mockResolvedValue({
      id: 1,
      key: 'comfort',
      label: 'Комфорт',
    }),
  },
  rooms: {
    getAdminRooms: vi.fn().mockResolvedValue([{ id: 1, name: '101' }]),
    createRoom: vi.fn().mockResolvedValue({
      id: 10,
      name: 'Новый',
      amenities: [],
      extras: [],
      images: [],
    }),
  },
});

vi.mock('@/db', () => ({ getDB: () => mockDB }));

describe('admin rooms API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET 401 без сессии', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await GET(new Request('http://localhost/api/admin/rooms'));
    expect(res.status).toBe(401);
  });

  it('GET 200 со списком', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { email: 'a@b.c' } } as never);
    const res = await GET(new Request('http://localhost/api/admin/rooms'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data[0].name).toBe('101');
  });

  it('POST создаёт номер с defaults массивов', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { email: 'a@b.c' } } as never);
    const res = await POST(
      new Request('http://localhost/api/admin/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Новый',
          category_key: 'comfort',
          price: 3000,
          price_day: 3000,
          description: 'd',
          full_description: 'fd',
        }),
      })
    );
    expect(res.status).toBe(201);
    expect(mockDB.rooms.createRoom).toHaveBeenCalled();
  });

  // price и price_day — два умышленно независимых поля (заказчик
  // подтвердил, что показ на главной и везде остальном должен отличаться,
  // а не совпадать, см. src/types/room.ts). Значения разные специально,
  // чтобы тест ловил регрессию, если их снова начнут синхронизировать.
  it('createRoom получает price и price_day как независимые значения', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { email: 'a@b.c' } } as never);
    await POST(
      new Request('http://localhost/api/admin/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Новый',
          category_key: 'comfort',
          price: 6000,
          price_day: 3690,
          description: 'd',
          full_description: 'fd',
        }),
      })
    );
    const call = mockDB.rooms.createRoom.mock.calls[0][0];
    expect(call.price).toBe(6000);
    expect(call.price_day).toBe(3690);
  });

  it('POST 400 без price', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { email: 'a@b.c' } } as never);
    const res = await POST(
      new Request('http://localhost/api/admin/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Новый',
          category_key: 'comfort',
          price_day: 3000,
          description: 'd',
          full_description: 'fd',
        }),
      })
    );
    expect(res.status).toBe(400);
  });

  it('POST 400 без price_day', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { email: 'a@b.c' } } as never);
    const res = await POST(
      new Request('http://localhost/api/admin/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Новый',
          category_key: 'comfort',
          price: 3000,
          description: 'd',
          full_description: 'fd',
        }),
      })
    );
    expect(res.status).toBe(400);
  });
});