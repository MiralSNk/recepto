import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { createMockDB } from '@/test/mocks/db';
import { GET, POST } from './route';

const mockDB = createMockDB({
  tariffs: {
    getAllTariffs: vi.fn().mockResolvedValue([]),
    getTariffByKey: vi.fn().mockResolvedValue(null),
    createTariff: vi.fn().mockResolvedValue({ id: 10 }),
  },
});

vi.mock('@/db', () => ({ getDB: () => mockDB }));

describe('/api/admin/tariffs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET 401 без сессии', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('GET 200 со списком', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const res = await GET();
    expect(res.status).toBe(200);
  });

  it('POST создаёт дополнительный тариф с is_builtin=false', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const res = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tariff_key: 'pet_deposit', label: 'Депозит за животных', price: 800 }),
      })
    );
    expect(res.status).toBe(201);
    expect(mockDB.tariffs.createTariff).toHaveBeenCalledWith(
      expect.objectContaining({ tariff_key: 'pet_deposit', is_builtin: false })
    );
  });

  // Ключ тарифа — ещё и идентификатор в формуле калькулятора, дефис
  // неотличим от оператора минус при токенизации (extra-guest vs extra - guest).
  it('POST 400 при дефисе в ключе', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const res = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tariff_key: 'pet-deposit', label: 'x', price: 100 }),
      })
    );
    expect(res.status).toBe(400);
  });

  it('POST 400 на зарезервированный ключ (base/days)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const res = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tariff_key: 'days', label: 'x', price: 100 }),
      })
    );
    expect(res.status).toBe(400);
    expect(mockDB.tariffs.createTariff).not.toHaveBeenCalled();
  });

  it('POST 409 при дублирующемся ключе', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    mockDB.tariffs.getTariffByKey.mockResolvedValueOnce({ id: 1, tariff_key: 'pet_deposit' });
    const res = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tariff_key: 'pet_deposit', label: 'x', price: 100 }),
      })
    );
    expect(res.status).toBe(409);
  });
});
