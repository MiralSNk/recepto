import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockDB } from '@/test/mocks/db';

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

describe('POST /api/mail', () => {
  beforeEach(() => {
    process.env.YANDEX_CAPTCHA_SERVERKEY = 'secret';
    vi.clearAllMocks();
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok' }),
    } as Response);
    // Лимитер запросов — модульный singleton, живёт в замыкании route.ts;
    // без сброса модуля все тесты в файле делят один счётчик (один и тот же
    // IP 'unknown' у всех testовых Request) и упираются в лимит на 6-м тесте.
    vi.resetModules();
  });

  it('booking: пишет заявку в БД и отправляет письмо', async () => {
    const { POST } = await import('./route');
    const res = await POST(
      postMail({
        type: 'booking',
        name: 'Иван',
        phone: '+79001112233',
        captchaToken: 'token',
        roomId: 1,
        agreed: true,
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockDB.bookings.createBooking).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Иван', phone: '+79001112233' })
    );
  });

  // Регрессия: гость выбирает возраст каждого ребёнка select'ом в форме
  // (BookingFormFields), но в письмо/БД раньше уходило только количество
  // детей — сам возраст (от которого зависит, бесплатен ребёнок или
  // платящий гость) нигде не был виден администратору.
  it('booking: возраст детей, введённый гостем, попадает в письмо', async () => {
    const { POST } = await import('./route');
    const { sendMail } = await import('@/lib/index.server');
    const res = await POST(
      postMail({
        type: 'booking',
        name: 'Иван',
        phone: '+79001112233',
        captchaToken: 'token',
        roomId: 1,
        children: '2',
        childAges: [5, 11],
        agreed: true,
      })
    );
    expect(res.status).toBe(200);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('Дети: 2 (возраст: 5 лет, 11 лет)'),
      })
    );
  });

  it('booking: мусор в childAges (не число/вне диапазона) отфильтровывается, а не ломает запрос', async () => {
    const { POST } = await import('./route');
    const { sendMail } = await import('@/lib/index.server');
    const res = await POST(
      postMail({
        type: 'booking',
        name: 'Иван',
        phone: '+79001112233',
        captchaToken: 'token',
        roomId: 1,
        childAges: [5, 'abc', -1, 999, 0],
        agreed: true,
      })
    );
    expect(res.status).toBe(200);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('Дети: 2 (возраст: 5 лет, до 1 года)'),
      })
    );
  });

  it('booking: 400 без имени/телефона', async () => {
    const { POST } = await import('./route');
    const res = await POST(postMail({ type: 'booking', captchaToken: 'token' }));
    expect(res.status).toBe(400);
    expect(mockDB.bookings.createBooking).not.toHaveBeenCalled();
  });

  it('booking: 400 при провале капчи', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'failed' }),
    } as Response);
    const { POST } = await import('./route');
    const res = await POST(
      postMail({ type: 'booking', name: 'Иван', phone: '+79001112233', captchaToken: 'bad' })
    );
    expect(res.status).toBe(400);
    expect(mockDB.bookings.createBooking).not.toHaveBeenCalled();
  });

  it('contact: отправляет письмо без записи в БД', async () => {
    const { POST } = await import('./route');
    const res = await POST(
      postMail({
        type: 'contact',
        name: 'Мария',
        email: 'maria@example.com',
        message: 'Вопрос про номера',
        captchaToken: 'token',
        agreed: true,
      })
    );
    expect(res.status).toBe(200);
    expect(mockDB.bookings.createBooking).not.toHaveBeenCalled();
  });

  // Регрессия: согласие на обработку персональных данных раньше проверялось
  // только на клиенте — прямой запрос к API мог его обойти полностью.
  it('contact: 400 без согласия на обработку персональных данных', async () => {
    const { POST } = await import('./route');
    const res = await POST(
      postMail({
        type: 'contact',
        name: 'Мария',
        email: 'maria@example.com',
        message: 'Вопрос про номера',
        captchaToken: 'token',
      })
    );
    expect(res.status).toBe(400);
  });

  it('booking: 400 без согласия на обработку персональных данных', async () => {
    const { POST } = await import('./route');
    const res = await POST(
      postMail({
        type: 'booking',
        name: 'Иван',
        phone: '+79001112233',
        captchaToken: 'token',
        roomId: 1,
        agreed: false,
      })
    );
    expect(res.status).toBe(400);
    expect(mockDB.bookings.createBooking).not.toHaveBeenCalled();
  });

  it('contact: 400 при некорректном email', async () => {
    const { POST } = await import('./route');
    const res = await POST(
      postMail({
        type: 'contact',
        name: 'Мария',
        email: 'not-an-email',
        message: 'Привет',
        captchaToken: 'token',
        agreed: true,
      })
    );
    expect(res.status).toBe(400);
  });
});
