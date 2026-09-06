import { NextResponse } from 'next/server';
import { getDB } from '@/db';
import { requireAdminSession, readJsonBody, serverError, revalidate } from '@/lib/server/api-helpers';
import { DEFAULT_FORMULA, parseFormula } from '@/lib/shared/formula';

const NUMBER_KEYS = ['child_free_age_limit', 'max_guests_absolute'] as const;

const TEXT_KEYS = [
  'room_capacity_heading',
  'room_price_note',
  'booking_total_label',
  'booking_price_hint',
] as const;

const ALL_KEYS = [...NUMBER_KEYS, ...TEXT_KEYS, 'calculator_formula'];

const DESCRIPTIONS: Record<string, string> = {
  child_free_age_limit:
    'Дети младше этого возраста проживают бесплатно и не считаются гостем. С этого возраста ребёнок считается платящим гостем наравне со взрослым.',
  max_guests_absolute: 'Общий максимум гостей в одном бронировании (если номер ещё не выбран).',
  room_capacity_heading: 'Заголовок над строкой вместимости в карточке номера.',
  room_price_note: 'Пояснение под строкой вместимости в карточке номера.',
  booking_total_label: 'Название итоговой строки в сводке цены формы бронирования.',
  booking_price_hint: 'Пояснение под сводкой цены в форме бронирования.',
};

const DEFAULTS: Record<string, string> = {
  child_free_age_limit: '7',
  max_guests_absolute: '10',
  room_capacity_heading: 'Допустимое размещение',
  room_price_note: 'Цена указана за проживание без доп. мест.',
  booking_total_label: 'Итого',
  booking_price_hint: 'Итоговая цена уже учитывает доплату за дополнительных гостей за все ночи проживания.',
  calculator_formula: DEFAULT_FORMULA,
};

export async function GET() {
  const { error: authError } = await requireAdminSession();
  if (authError) return authError;

  try {
    const db = getDB();
    const raw = await db.siteSettings.getSettings(ALL_KEYS);
    const result: Record<string, { value: string; description: string }> = {};
    for (const key of ALL_KEYS) {
      result[key] = {
        value: raw[key] || DEFAULTS[key],
        description: DESCRIPTIONS[key] || '',
      };
    }
    return NextResponse.json(result);
  } catch (error) {
    return serverError('GET pricing settings error:', error);
  }
}

export async function PUT(req: Request) {
  const { error: authError } = await requireAdminSession();
  if (authError) return authError;

  const { data: body, error: bodyError } = await readJsonBody<Record<string, string>>(req);
  if (bodyError) return bodyError;

  const updates: Record<string, string> = {};

  for (const key of NUMBER_KEYS) {
    const raw = body[key];
    if (typeof raw !== 'string') continue;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > 100000) {
      return NextResponse.json({ error: `${key}: некорректное значение` }, { status: 400 });
    }
    updates[key] = String(Math.round(n));
  }

  for (const key of TEXT_KEYS) {
    const raw = body[key];
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (!trimmed || trimmed.length > 300) {
      return NextResponse.json({ error: `${key}: текст должен быть от 1 до 300 символов` }, { status: 400 });
    }
    updates[key] = trimmed;
  }

  if (typeof body.calculator_formula === 'string') {
    const db = getDB();
    const tariffs = await db.tariffs.getAllTariffs();
    const knownCardKeys = [
      'base',
      'days',
      ...tariffs.filter((t) => t.is_builtin || t.in_calculator).map((t) => t.tariff_key),
    ];
    const parsed = parseFormula(body.calculator_formula, knownCardKeys);
    if ('error' in parsed) {
      return NextResponse.json({ error: `calculator_formula: ${parsed.error}` }, { status: 400 });
    }
    updates.calculator_formula = body.calculator_formula.trim();
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Нет данных для обновления' }, { status: 400 });
  }

  try {
    const db = getDB();
    for (const [key, value] of Object.entries(updates)) {
      await db.siteSettings.setSetting(key, value);
    }
    revalidate('seo', 'home', 'pricing');
    return NextResponse.json({ ok: true, message: 'Тарифные настройки сохранены.' });
  } catch (error) {
    return serverError('PUT pricing settings error:', error);
  }
}
