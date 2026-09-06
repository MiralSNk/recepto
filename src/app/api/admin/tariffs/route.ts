/**
 * GET  /api/admin/tariffs — справочник тарифов (основные + дополнительные)
 * POST /api/admin/tariffs — создать дополнительный тариф
 */

import { NextResponse } from 'next/server';
import { getDB } from '@/db';
import { z } from 'zod';
import {
  requireAdminSession,
  readJsonBody,
  zodErrorResponse,
  serverError,
  revalidate,
} from '@/lib/server/api-helpers';
import { RESERVED_CARD_KEYS } from '@/lib/shared/formula';

const createSchema = z.object({
  tariff_key: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z][a-z0-9_]*$/, 'Латиница со строчной буквы, цифры, _ (без дефиса)'),
  label: z.string().min(1).max(150),
  price: z.coerce.number().int().min(0).max(1000000),
  in_calculator: z.boolean().optional().default(false),
  sort_order: z.number().int().min(0).optional(),
});

export async function GET() {
  const { error: authError } = await requireAdminSession();
  if (authError) return authError;

  try {
    const db = getDB();
    const list = await db.tariffs.getAllTariffs();
    return NextResponse.json(list);
  } catch (error) {
    return serverError('GET tariffs error:', error);
  }
}

export async function POST(req: Request) {
  const { error: authError } = await requireAdminSession();
  if (authError) return authError;

  const { data: body, error: bodyError } = await readJsonBody(req);
  if (bodyError) return bodyError;

  try {
    const data = createSchema.parse(body);
    const db = getDB();

    if ((RESERVED_CARD_KEYS as readonly string[]).includes(data.tariff_key)) {
      return NextResponse.json(
        { error: `"${data.tariff_key}" — зарезервированный ключ, выберите другой` },
        { status: 400 }
      );
    }

    const existing = await db.tariffs.getTariffByKey(data.tariff_key);
    if (existing) {
      return NextResponse.json(
        { error: `Тариф "${data.tariff_key}" уже есть` },
        { status: 409 }
      );
    }

    // is_builtin никогда не принимается от клиента — только сидируется миграцией.
    const { id } = await db.tariffs.createTariff({
      tariff_key: data.tariff_key,
      label: data.label,
      price: data.price,
      is_builtin: false,
      in_calculator: data.in_calculator,
      sort_order: data.sort_order ?? 0,
    });

    revalidate('pricing', 'rooms');

    return NextResponse.json(
      {
        id,
        tariff_key: data.tariff_key,
        label: data.label,
        price: data.price,
        is_builtin: false,
        in_calculator: data.in_calculator,
        sort_order: data.sort_order ?? 0,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) return zodErrorResponse(error);
    return serverError('POST tariffs error:', error);
  }
}
