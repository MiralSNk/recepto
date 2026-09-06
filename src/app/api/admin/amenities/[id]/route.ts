/**
 * PUT    /api/admin/amenities/:id
 * DELETE /api/admin/amenities/:id
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
import { deleteUploadedFile } from '@/lib/server/file-storage';

const updateSchema = z.object({
  amenity_key: z
    .string()
    .min(1)
    .max(30)
    .regex(/^[a-z0-9_-]+$/i)
    .optional(),
  label: z.string().min(1).max(100).optional(),
  icon_url: z.string().max(500).nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

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
    const existing = await db.amenities.getAmenityById(id);
    await db.amenities.updateAmenity(id, data);

    // Иконку заменили на другую (или сняли) — старый файл больше ни на что
    // не ссылается, чистим с диска.
    if (data.icon_url !== undefined && existing?.icon_url && existing.icon_url !== data.icon_url) {
      await deleteUploadedFile(existing.icon_url);
    }

    revalidate('rooms');
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return zodErrorResponse(error);
    return serverError('PUT amenities error:', error);
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
    const existing = await db.amenities.getAmenityById(id);
    await db.amenities.deleteAmenity(id);
    await deleteUploadedFile(existing?.icon_url);
    revalidate('rooms');
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError('DELETE amenities error:', error);
  }
}
