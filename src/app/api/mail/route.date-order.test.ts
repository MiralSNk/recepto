import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockDB } from '@/test/mocks/db';

// Регрессионный тест: POST /api/mail (type: booking) с checkOut раньше или
// равным checkIn. Раньше маршрут делал только `body.checkIn?.trim() || null`/
// `body.checkOut?.trim() || null` — никакой проверки порядка дат в самом
// приложении не было, единственной защитой оставался CHECK-constraint
// chk_bookings_dates в MySQL (миграция 008, причём он допускал даже
// checkOut === checkIn). В юнит-тесте БД замокана и ничего не проверяет —
// это как раз показывает, что валидация теперь часть бизнес-логики
// приложения, а не побочный эффект конкретной СУБД. route.ts теперь сам
// сравнивает даты перед сохранением.
const mockDB = createMockDB();

vi.mock('@/db', () => ({ getDB: () => mockDB }));
vi.mock('@/lib/index.server', async () => {
  const actual = await vi.importActual<typeof import('@/lib/index.server')>('@/lib/index.server');
  return { ...actual, sendMail: vi.fn().mockResolvedValue(undefined) };
});

vi.stubGlobal(
  'fetch',
  vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ status: 'ok' }),
  })
);

function postMail(body: unknown) {
  return new Request('http://localhost/api/mail', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/mail — booking должен проверять порядок дат заезда/выезда', () => {
  beforeEach(() => {
    process.env.YANDEX_CAPTCHA_SERVERKEY = 'secret';
    vi.clearAllMocks();
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok' }),
    } as Response);
    vi.resetModules();
  });

  it('checkOut раньше checkIn должен отклоняться (400) на уровне приложения', async () => {
    const { POST } = await import('./route');
    const res = await POST(
      postMail({
        type: 'booking',
        name: 'Иван',
        phone: '+79001112233',
        captchaToken: 'token',
        roomId: 1,
        checkIn: '2026-05-10',
        checkOut: '2026-05-01',
        agreed: true,
      })
    );

    expect(res.status).toBe(400);
    expect(mockDB.bookings.createBooking).not.toHaveBeenCalled();
  });

  it('checkOut === checkIn (0 ночей) должен отклоняться, а не создавать бессмысленную бронь', async () => {
    const { POST } = await import('./route');
    const res = await POST(
      postMail({
        type: 'booking',
        name: 'Иван',
        phone: '+79001112233',
        captchaToken: 'token',
        roomId: 1,
        checkIn: '2026-05-10',
        checkOut: '2026-05-10',
        agreed: true,
      })
    );

    expect(res.status).toBe(400);
    expect(mockDB.bookings.createBooking).not.toHaveBeenCalled();
  });
});
