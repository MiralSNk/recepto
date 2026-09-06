/**
 * PUT    /api/admin/place-categories/:id
 * DELETE /api/admin/place-categories/:id
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

const updateSchema = z.object({
  category_key: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9_-]+$/i)
    .optional(),
  label: z.string().min(1).max(100).optional(),
  sort_order: z.number().int().min(0).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, context: Ctx) {
  const { error: authError } = await requireAdminSession();
  if (authError) return authError;

  const { id: idRaw } = await context.params;
  const id = parseIdParam(idRaw);
  if (id === null) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const { data: body, error: bodyError } = await readJsonBody<Record<string, unknown>>(req);
  if (bodyError) return bodyError;

  try {
    if (body.key && !body.category_key) body.category_key = body.key;

    const data = updateSchema.parse(body);
    const db = getDB();
    await db.placeCategories.updatePlaceCategory(id, data);

    revalidate('places');

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return zodErrorResponse(error);
    return serverError('PUT place-categories error:', error);
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
    await db.placeCategories.deletePlaceCategory(id);

    revalidate('places');

    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError('DELETE place-categories error:', error);
  }
}
