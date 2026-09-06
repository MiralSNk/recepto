import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { createMockDB } from '@/test/mocks/db';
import { GET, PUT } from '@/app/api/admin/pricing/route';

const SETTINGS_MAP: Record<string, string> = {
  child_free_age_limit: '7',
};

const mockDB = createMockDB({
  siteSettings: {
    getSettings: vi.fn().mockImplementation(async (keys: string[]) => {
      const result: Record<string, string> = {};
      for (const key of keys) result[key] = SETTINGS_MAP[key] ?? '';
      return result;
    }),
    setSetting: vi.fn().mockResolvedValue(undefined),
  },
});

vi.mock('@/db', () => ({ getDB: () => mockDB }));

describe('/api/admin/pricing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET 401 без сессии', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('GET 200 — заданные значения и дефолты для пустых (число, текст, формула)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.child_free_age_limit.value).toBe('7');
    expect(data.max_guests_absolute.value).toBe('10'); // дефолт, т.к. в БД пусто
    expect(data.room_capacity_heading.value).toBe('Допустимое размещение'); // дефолт текстового поля
    expect(data.room_price_note.value).toBe('Цена указана за проживание без доп. мест.');
    expect(data.calculator_formula.value).toBe('(base + second_guest + extra_guest) * days'); // дефолт формулы
  });

  it('PUT 400 при нечисловом значении числового поля', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const res = await PUT(
      new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_guests_absolute: 'abc' }),
      })
    );
    expect(res.status).toBe(400);
  });

  it('PUT 400 при пустом текстовом поле', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const res = await PUT(
      new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_capacity_heading: '   ' }),
      })
    );
    expect(res.status).toBe(400);
  });

  it('PUT 200 сохраняет числовое значение', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const res = await PUT(
      new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_guests_absolute: '12' }),
      })
    );
    expect(res.status).toBe(200);
    expect(mockDB.siteSettings.setSetting).toHaveBeenCalledWith('max_guests_absolute', '12');
  });

  it('PUT 200 сохраняет текстовое значение', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const res = await PUT(
      new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_capacity_heading: 'Вместимость' }),
      })
    );
    expect(res.status).toBe(200);
    expect(mockDB.siteSettings.setSetting).toHaveBeenCalledWith('room_capacity_heading', 'Вместимость');
  });

  it('PUT 200 сохраняет валидную формулу калькулятора', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const res = await PUT(
      new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calculator_formula: 'base + second_guest' }),
      })
    );
    expect(res.status).toBe(200);
    expect(mockDB.tariffs.getAllTariffs).toHaveBeenCalled();
    expect(mockDB.siteSettings.setSetting).toHaveBeenCalledWith('calculator_formula', 'base + second_guest');
  });

  it('PUT 400 при невалидной формуле (неизвестный тариф)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const res = await PUT(
      new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calculator_formula: 'base + unknown_card' }),
      })
    );
    expect(res.status).toBe(400);
    expect(mockDB.siteSettings.setSetting).not.toHaveBeenCalled();
  });

  it('PUT 401', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await PUT(
      new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_guests_absolute: '12' }),
      })
    );
    expect(res.status).toBe(401);
  });
});
