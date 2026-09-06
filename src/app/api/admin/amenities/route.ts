/**
 * GET  /api/admin/amenities — справочник amenities
 * POST /api/admin/amenities — создать
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

const createSchema = z.object({
  amenity_key: z
    .string()
    .min(1)
    .max(30)
    .regex(/^[a-z0-9_-]+$/i, 'Только латиница, цифры, _ и -'),
  label: z.string().min(1).max(100),
  icon_url: z.string().max(500).nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
});

export async function GET() {
  const { error: authError } = await requireAdminSession();
  if (authError) return authError;

  try {
    const db = getDB();
    const list = await db.amenities.getAllAmenities();
    return NextResponse.json(list);
  } catch (error) {
    return serverError('GET amenities error:', error);
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

    const existing = await db.amenities.getAmenityByKey(data.amenity_key);
    if (existing) {
      return NextResponse.json(
        { error: `Удобство "${data.amenity_key}" уже есть` },
        { status: 409 }
      );
    }

    const { id } = await db.amenities.createAmenity({
      amenity_key: data.amenity_key,
      label: data.label,
      icon_url: data.icon_url ?? null,
      sort_order: data.sort_order ?? 0,
    });

    revalidate('rooms');

    return NextResponse.json(
      {
        id,
        amenity_key: data.amenity_key,
        label: data.label,
        icon_url: data.icon_url ?? null,
        sort_order: data.sort_order ?? 0,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) return zodErrorResponse(error);
    return serverError('POST amenities error:', error);
  }
}
