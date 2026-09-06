import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockDB } from '@/test/mocks/db';

// Регрессионный тест: POST /api/mail (type: booking) с абсурдным числом
// гостей. Ограничение вместимости (resolveMaxGuests: вместимость номера →
// лимит категории → сайтовый максимум) раньше было реализовано только на
// клиенте — BookingFormFields блокирует кнопку "+ Добавить ребёнка" и
// ставит max={maxGuests} на <input type="number"> взрослых, но ни то, ни
// другое не мешало прямому POST-запросу к /api/mail: маршрут вообще не
// импортировал resolveMaxGuests/getPricingRules и не проверял вместимость
// выбранного номера. route.ts теперь делает db.rooms.getRoomById и
// сравнивает adults + children с resolveMaxGuests перед сохранением.
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

describe('POST /api/mail — booking должен ограничивать число гостей разумным максимумом', () => {
  beforeEach(() => {
    process.env.YANDEX_CAPTCHA_SERVERKEY = 'secret';
    vi.clearAllMocks();
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok' }),
    } as Response);
    vi.resetModules();
  });

  it('adults: 1000000 для конкретного номера должно отклоняться, а не приниматься без проверки вместимости', async () => {
    const { POST } = await import('./route');
    const res = await POST(
      postMail({
        type: 'booking',
        name: 'Иван',
        phone: '+79001112233',
        captchaToken: 'token',
        roomId: 1,
        adults: 1_000_000,
        agreed: true,
      })
    );

    expect(res.status).toBe(400);
    expect(mockDB.bookings.createBooking).not.toHaveBeenCalled();
  });
});
