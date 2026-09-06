import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { createMockDB } from '@/test/mocks/db';
import { PUT, DELETE } from './route';

const builtinTariff = {
  id: 1,
  tariff_key: 'second_guest',
  label: 'Доплата за 2-го гостя',
  price: 400,
  is_builtin: true,
  in_calculator: true,
  sort_order: 10,
};

const customTariff = {
  id: 3,
  tariff_key: 'pet_deposit',
  label: 'Депозит за животных',
  price: 800,
  is_builtin: false,
  in_calculator: true,
  sort_order: 30,
};

const mockDB = createMockDB({
  tariffs: {
    getTariffById: vi.fn().mockResolvedValue(customTariff),
    updateTariff: vi.fn().mockResolvedValue(undefined),
    deleteTariff: vi.fn().mockResolvedValue(undefined),
    countRoomTariffUsage: vi.fn().mockResolvedValue(0),
  },
});

vi.mock('@/db', () => ({ getDB: () => mockDB }));
vi.mock('@/lib/server/seo', () => ({
  getSiteSettings: vi.fn().mockResolvedValue({ calculator_formula: '' }),
}));

const ctx = { params: Promise.resolve({ id: '3' }) };

describe('/api/admin/tariffs/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDB.tariffs.getTariffById.mockResolvedValue(customTariff);
  });

  it('PUT 401 без сессии', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await PUT(
      new Request('http://x', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label: 'x' }) }),
      ctx
    );
    expect(res.status).toBe(401);
  });

  it('PUT 200 — обновляет обычный тариф', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const res = await PUT(
      new Request('http://x', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ price: 900 }) }),
      ctx
    );
    expect(res.status).toBe(200);
    expect(mockDB.tariffs.updateTariff).toHaveBeenCalledWith(3, { price: 900 });
  });

  it('PUT tariff_key не принимается вообще (схема его не знает — молча игнорируется)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    await PUT(
      new Request('http://x', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tariff_key: 'renamed', price: 900 }),
      }),
      ctx
    );
    const call = mockDB.tariffs.updateTariff.mock.calls[0][1];
    expect(call).not.toHaveProperty('tariff_key');
  });

  it('PUT 400 — у основного тарифа нельзя менять in_calculator/sort_order', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    mockDB.tariffs.getTariffById.mockResolvedValueOnce(builtinTariff);
    const res = await PUT(
      new Request('http://x', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ in_calculator: false }),
      }),
      { params: Promise.resolve({ id: '1' }) }
    );
    expect(res.status).toBe(400);
  });

  it('PUT 409 — нельзя отключить in_calculator, пока тариф используется в формуле', async () => {
    const { getSiteSettings } = await import('@/lib/server/seo');
    vi.mocked(getSiteSettings).mockResolvedValueOnce({ calculator_formula: 'base + pet_deposit' } as any);
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const res = await PUT(
      new Request('http://x', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ in_calculator: false }),
      }),
      ctx
    );
    expect(res.status).toBe(409);
    expect(mockDB.tariffs.updateTariff).not.toHaveBeenCalled();
  });

  it('DELETE 403 — основной тариф удалить нельзя', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    mockDB.tariffs.getTariffById.mockResolvedValueOnce(builtinTariff);
    const res = await DELETE(new Request('http://x', { method: 'DELETE' }), { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(403);
  });

  it('DELETE 409 — тариф привязан к номерам', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    mockDB.tariffs.countRoomTariffUsage.mockResolvedValueOnce(2);
    const res = await DELETE(new Request('http://x', { method: 'DELETE' }), ctx);
    expect(res.status).toBe(409);
    expect(mockDB.tariffs.deleteTariff).not.toHaveBeenCalled();
  });

  it('DELETE 409 — тариф используется в формуле калькулятора', async () => {
    const { getSiteSettings } = await import('@/lib/server/seo');
    vi.mocked(getSiteSettings).mockResolvedValueOnce({ calculator_formula: 'base + pet_deposit' } as any);
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const res = await DELETE(new Request('http://x', { method: 'DELETE' }), ctx);
    expect(res.status).toBe(409);
    expect(mockDB.tariffs.deleteTariff).not.toHaveBeenCalled();
  });

  it('DELETE 200 — обычный тариф без привязок удаляется', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const res = await DELETE(new Request('http://x', { method: 'DELETE' }), ctx);
    expect(res.status).toBe(200);
    expect(mockDB.tariffs.deleteTariff).toHaveBeenCalledWith(3);
  });
});
