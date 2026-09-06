/**
 * POST /api/mail
 * contact | booking + captcha + rate limit
 * booking дополнительно пишет строку в таблицу bookings
 */

import { NextResponse } from 'next/server';
import { sendMail } from '@/lib/index.server';
import { getDB } from '@/db';
import { createRateLimiter } from '@/lib/server/rate-limit';
import { getPricingRules } from '@/lib/server/pricing';
import { resolveMaxGuests } from '@/lib/shared/guest-limits';

// Капча (verifyCaptcha ниже) проверяется на сервере против секретного ключа —
// это единственная реальная защита от спама, лимитер ниже тривиально
// обходится подменой x-forwarded-for.
const checkRateLimit = createRateLimiter(5, 60_000);

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function verifyCaptcha(token: string, ip: string): Promise<boolean> {
  const secret = process.env.YANDEX_CAPTCHA_SERVERKEY;
  if (!secret) {
    console.error('YANDEX_CAPTCHA_SERVERKEY is not set');
    return false;
  }
  const params = new URLSearchParams({ secret, token, ip });
  try {
    const res = await fetch('https://smartcaptcha.yandexcloud.net/validate', {
      method: 'POST',
      body: params,
    });
    const data = await res.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}

type ContactPayload = {
  type: 'contact';
  name: string;
  email: string;
  message: string;
  captchaToken: string;
  agreed?: boolean;
};

type BookingPayload = {
  type: 'booking';
  name: string;
  phone: string;
  email?: string;
  roomName?: string;
  roomId?: number;
  checkIn?: string;
  checkOut?: string;
  adults?: string | number;
  children?: string | number;
  childAges?: unknown;
  comment?: string;
  captchaToken: string;
  agreed?: boolean;
};

type Payload = ContactPayload | BookingPayload;

function toInt(v: string | number | undefined, fallback: number): number {
  if (v === undefined || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

// Гость выбирает возраст каждого ребёнка select'ом 0-17 лет
// (BookingFormFields) — вход всё равно untrusted (прямой запрос к API мог бы
// прислать что угодно), поэтому фильтруем/ограничиваем на сервере, а не
// доверяем форме клиента.
function toChildAges(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((age) => Number(age))
    .filter((age) => Number.isInteger(age) && age >= 0 && age <= 17)
    .slice(0, 20);
}

export async function POST(req: Request) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429 }
    );
  }

  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Некорректный JSON' }, { status: 400 });
  }

  if (!body.captchaToken) {
    return NextResponse.json({ error: 'Требуется капча' }, { status: 400 });
  }
  if (!(await verifyCaptcha(body.captchaToken, ip))) {
    return NextResponse.json(
      { error: 'Проверка капчи не пройдена' },
      { status: 400 }
    );
  }
  // Согласие на обработку персональных данных раньше проверялось только на
  // клиенте — прямой запрос к API мог его обойти полностью.
  if (body.agreed !== true) {
    return NextResponse.json(
      { error: 'Нужно согласие на обработку персональных данных' },
      { status: 400 }
    );
  }

  // ---------- CONTACT ----------
  if (body.type === 'contact') {
    const name = body.name?.trim().slice(0, 100);
    const email = body.email?.trim().slice(0, 120);
    const message = body.message?.trim().slice(0, 2000);

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Заполните все поля' }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Некорректный email' }, { status: 400 });
    }

    try {
      await sendMail({
        replyTo: email,
        subject: `Обратная связь: ${name}`,
        text: `Имя: ${name}\nEmail: ${email}\n\n${message}`,
      });
      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error('SMTP contact error:', error);
      return NextResponse.json({ error: 'Не удалось отправить' }, { status: 502 });
    }
  }

  // ---------- BOOKING ----------
  if (body.type === 'booking') {
    const name = body.name?.trim().slice(0, 100);
    const phone = body.phone?.trim().slice(0, 30);
    const email = body.email?.trim().slice(0, 120) || undefined;
    const roomName = body.roomName?.trim().slice(0, 120);
    const comment = body.comment?.trim().slice(0, 1000) || '';
    const adults = toInt(body.adults, 1);
    const childAges = toChildAges(body.childAges);
    const children = childAges.length > 0 ? childAges.length : toInt(body.children, 0);
    const roomId =
      typeof body.roomId === 'number' && body.roomId > 0 ? body.roomId : null;
    const checkIn = body.checkIn?.trim() || null;
    const checkOut = body.checkOut?.trim() || null;

    if (!name || !phone) {
      return NextResponse.json(
        { error: 'Укажите имя и телефон' },
        { status: 400 }
      );
    }
    if (email && !isValidEmail(email)) {
      return NextResponse.json({ error: 'Некорректный email' }, { status: 400 });
    }
    // Клиентский <input type="number" min={1}> ничего не гарантирует для
    // прямого запроса к API — без этой проверки проходила бронь без единого
    // взрослого (например, только с детьми).
    if (adults < 1) {
      return NextResponse.json(
        { error: 'Укажите хотя бы одного взрослого' },
        { status: 400 }
      );
    }
    if (checkIn && checkOut) {
      const inDate = new Date(checkIn);
      const outDate = new Date(checkOut);
      if (
        Number.isNaN(inDate.getTime()) ||
        Number.isNaN(outDate.getTime()) ||
        outDate <= inDate
      ) {
        return NextResponse.json(
          { error: 'Некорректные даты заезда/выезда' },
          { status: 400 }
        );
      }
    }

    const db = getDB();

    // Вместимость (номер → категория → сайтовый максимум, resolveMaxGuests)
    // раньше проверялась только на клиенте (BookingFormFields) — прямой
    // запрос к API мог указать любое число гостей для любого номера.
    const room = roomId ? await db.rooms.getRoomById(roomId) : undefined;
    const pricingRules = await getPricingRules();
    const effectiveMaxGuests = resolveMaxGuests({
      roomGuests: room?.guests,
      roomExtraCapacity: room?.extraGuestCapacity,
      categoryMaxGuests: room?.categoryMaxGuests,
      siteMaxGuestsAbsolute: pricingRules.maxGuestsAbsolute,
    });
    if (adults + children > effectiveMaxGuests) {
      return NextResponse.json(
        { error: 'Превышена вместимость номера' },
        { status: 400 }
      );
    }

    const lines = [
      `Имя: ${name}`,
      `Телефон: ${phone}`,
      email ? `Email: ${email}` : null,
      roomName ? `Номер: ${roomName}` : null,
      roomId ? `ID номера: ${roomId}` : null,
      checkIn ? `Заезд: ${checkIn}` : null,
      checkOut ? `Выезд: ${checkOut}` : null,
      `Взрослые: ${adults}`,
      childAges.length > 0
        ? `Дети: ${children} (возраст: ${childAges.map((age) => (age === 0 ? 'до 1 года' : `${age} лет`)).join(', ')})`
        : `Дети: ${children}`,
      comment ? `\nКомментарий:\n${comment}` : null,
    ].filter(Boolean);

    try {
      // 1) БД
      const { id: bookingId } = await db.bookings.createBooking({
        room_id: roomId,
        name,
        phone,
        email: email ?? null,
        check_in: checkIn,
        check_out: checkOut,
        adults,
        children,
        comment: comment || (roomName ? `Номер: ${roomName}` : null),
      });

      // 2) Почта (ошибка SMTP не откатывает заявку — заявка уже в БД)
      try {
        await sendMail({
          replyTo: email,
          subject: `Бронь #${bookingId}: ${roomName || 'заявка'} — ${name}`,
          text: [`ID заявки: ${bookingId}`, ...lines].join('\n'),
        });
      } catch (mailErr) {
        console.error('SMTP booking error (DB saved):', mailErr);
      }

      return NextResponse.json({ ok: true, bookingId });
    } catch (error) {
      console.error('Booking create error:', error);
      return NextResponse.json(
        { error: 'Не удалось сохранить заявку' },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({ error: 'Неизвестный тип' }, { status: 400 });
}