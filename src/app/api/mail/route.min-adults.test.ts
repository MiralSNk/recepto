import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockDB } from '@/test/mocks/db';

// Регрессионный тест: POST /api/mail (type: booking) с adults: 0.
// Клиентский <input type="number" min={1}> в BookingFormFields ничего не
// гарантирует для прямого запроса к API — min/max на <input> не блокируют
// программную отправку значения. Раньше toInt(body.adults, 1) принимал 0 как
// валидное число, а отдельной проверки "adults >= 1" в маршруте не было —
// заявка на проживание без единого взрослого (например, только с детьми)
// сохранялась в БД и уходила письмом администратору как обычная бронь.
// route.ts теперь явно проверяет adults < 1 перед сохранением.
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

describe('POST /api/mail — booking должен требовать хотя бы одного взрослого', () => {
  beforeEach(() => {
    process.env.YANDEX_CAPTCHA_SERVERKEY = 'secret';
    vi.clearAllMocks();
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok' }),
    } as Response);
    vi.resetModules();
  });

  it('adults: 0 должен отклоняться (400), а не создавать бронь без единого взрослого', async () => {
    const { POST } = await import('./route');
    const res = await POST(
      postMail({
        type: 'booking',
        name: 'Иван',
        phone: '+79001112233',
        captchaToken: 'token',
        roomId: 1,
        adults: 0,
        childAges: [5],
        agreed: true,
      })
    );

    expect(res.status).toBe(400);
    expect(mockDB.bookings.createBooking).not.toHaveBeenCalled();
  });

  it('adults: "0" (строкой) — тот же случай, тоже должен отклоняться', async () => {
    const { POST } = await import('./route');
    const res = await POST(
      postMail({
        type: 'booking',
        name: 'Иван',
        phone: '+79001112233',
        captchaToken: 'token',
        roomId: 1,
        adults: '0',
        agreed: true,
      })
    );

    expect(res.status).toBe(400);
    expect(mockDB.bookings.createBooking).not.toHaveBeenCalled();
  });
});
