/**
 * PUT    /api/admin/tariffs/:id
 * DELETE /api/admin/tariffs/:id
 */

import { NextResponse } from 'next/server';
import { getDB } from '@/db';
import { z } from 'zod';
import {
  requireAdminSession,
  readJsonBody,
  parseIdParam,
  zodErrorResponse,
  serverError,
  revalidate,
} from '@/lib/server/api-helpers';
import { getSiteSettings } from '@/lib/server/seo';
import { DEFAULT_FORMULA, extractIdentifiers } from '@/lib/shared/formula';

const updateSchema = z.object({
  // tariff_key намеренно не редактируется вообще (ни для builtin, ни для
  // обычных тарифов) — это ещё и идентификатор в формуле калькулятора,
  // переименование тихо сломало бы сохранённую формулу.
  label: z.string().min(1).max(150).optional(),
  price: z.coerce.number().int().min(0).max(1000000).optional(),
  in_calculator: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

async function isReferencedInFormula(tariffKey: string): Promise<boolean> {
  const settings = await getSiteSettings();
  const formula = settings.calculator_formula || DEFAULT_FORMULA;
  return extractIdentifiers(formula).includes(tariffKey);
}

export async function PUT(req: Request, context: Ctx) {
  const { error: authError } = await requireAdminSession();
  if (authError) return authError;

  const { id: idRaw } = await context.params;
  const id = parseIdParam(idRaw);
  if (id === null) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const { data: body, error: bodyError } = await readJsonBody(req);
  if (bodyError) return bodyError;

  try {
    const data = updateSchema.parse(body);
    const db = getDB();

    const tariff = await db.tariffs.getTariffById(id);
    if (!tariff) {
      return NextResponse.json({ error: 'Тариф не найден' }, { status: 404 });
    }

    if (tariff.is_builtin && (data.in_calculator !== undefined || data.sort_order !== undefined)) {
      return NextResponse.json(
        { error: 'У основного тарифа можно менять только название и цену' },
        { status: 400 }
      );
    }

    if (data.in_calculator === false && (await isReferencedInFormula(tariff.tariff_key))) {
      return NextResponse.json(
        {
          error:
            'Этот тариф используется в формуле калькулятора — уберите его из формулы (Тарифы → Конструктор), прежде чем отключать «участвует в калькуляторе».',
        },
        { status: 409 }
      );
    }

    await db.tariffs.updateTariff(id, data);
    revalidate('pricing', 'rooms');
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return zodErrorResponse(error);
    return serverError('PUT tariffs error:', error);
  }
}

export async function DELETE(_req: Request, context: Ctx) {
  const { error: authError } = await requireAdminSession();
  if (authError) return authError;

  const { id: idRaw } = await context.params;
  const id = parseIdParam(idRaw);
  if (id === null) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  try {
    const db = getDB();
    const tariff = await db.tariffs.getTariffById(id);
    if (!tariff) {
      return NextResponse.json({ error: 'Тариф не найден' }, { status: 404 });
    }

    if (tariff.is_builtin) {
      return NextResponse.json({ error: 'Основные тарифы нельзя удалить' }, { status: 403 });
    }

    const usage = await db.tariffs.countRoomTariffUsage(id);
    if (usage > 0) {
      return NextResponse.json(
        { error: `Тариф используется в ${usage} номере(ах) — сначала уберите его в разделе «Номера»` },
        { status: 409 }
      );
    }

    if (await isReferencedInFormula(tariff.tariff_key)) {
      return NextResponse.json(
        {
          error:
            'Этот тариф используется в формуле калькулятора — уберите его из формулы (Тарифы → Конструктор), прежде чем удалять.',
        },
        { status: 409 }
      );
    }

    await db.tariffs.deleteTariff(id);
    revalidate('pricing', 'rooms');
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError('DELETE tariffs error:', error);
  }
}
