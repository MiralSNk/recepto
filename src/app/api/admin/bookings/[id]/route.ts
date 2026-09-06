/**
 * GET  /api/admin/bookings/:id
 * PUT  /api/admin/bookings/:id — смена status
 * DELETE — нет в схеме как soft-delete; при необходимости можно добавить позже
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
} from '@/lib/server/api-helpers';

const statusSchema = z.object({
  status: z.enum(['new', 'processed', 'confirmed', 'cancelled']),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: Ctx) {
  const { error: authError } = await requireAdminSession();
  if (authError) return authError;

  const { id: idRaw } = await context.params;
  const id = parseIdParam(idRaw);
  if (id === null) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  try {
    const db = getDB();
    const row = await db.bookings.getBookingById(id);
    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(row);
  } catch (error) {
    return serverError('GET booking error:', error);
  }
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
    const { status } = statusSchema.parse(body);
    const db = getDB();
    const existing = await db.bookings.getBookingById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    await db.bookings.updateBookingStatus(id, status);
    return NextResponse.json({ ok: true, status });
  } catch (error) {
    if (error instanceof z.ZodError) return zodErrorResponse(error);
    return serverError('PUT booking error:', error);
  }
}
