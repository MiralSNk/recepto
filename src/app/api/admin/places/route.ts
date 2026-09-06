import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getDB } from '@/db';
import { createPlaceSchema } from '@/schemas/admin';
import {
  requireAdminSession,
  readJsonBody,
  zodErrorResponse,
  serverError,
  revalidate,
} from '@/lib/server/api-helpers';

export async function GET() {
  const { error: authError } = await requireAdminSession();
  if (authError) return authError;

  try {
    const db = getDB();
    const places = await db.places.getAllPlaces();
    return NextResponse.json(places);
  } catch (error) {
    return serverError('GET places error:', error);
  }
}

export async function POST(req: Request) {
  const { error: authError } = await requireAdminSession();
  if (authError) return authError;

  const { data: body, error: bodyError } = await readJsonBody(req);
  if (bodyError) return bodyError;

  try {
    const data = createPlaceSchema.parse(body);
    const db = getDB();
    const newPlace = await db.places.createPlace(data);
    revalidate('places');

    return NextResponse.json(newPlace, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return zodErrorResponse(error);
    return serverError('POST place error:', error);
  }
}
