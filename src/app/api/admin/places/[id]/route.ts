import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getDB } from '@/db';
import { updatePlaceSchema } from '@/schemas/admin';
import {
  requireAdminSession,
  readJsonBody,
  parseIdParam,
  zodErrorResponse,
  serverError,
  revalidate,
} from '@/lib/server/api-helpers';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError } = await requireAdminSession();
  if (authError) return authError;

  const { id } = await params;
  const numericId = parseIdParam(id);
  if (numericId === null) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const { data: body, error: bodyError } = await readJsonBody(req);
  if (bodyError) return bodyError;

  try {
    const data = updatePlaceSchema.parse(body);
    const db = getDB();
    await db.places.updatePlace(numericId, data);
    revalidate('places');
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) return zodErrorResponse(error);
    return serverError('PUT place error:', error);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError } = await requireAdminSession();
  if (authError) return authError;

  const { id } = await params;
  const numericId = parseIdParam(id);
  if (numericId === null) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  try {
    const db = getDB();
    await db.places.deletePlace(numericId);
    revalidate('places');
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError('DELETE place error:', error);
  }
}
