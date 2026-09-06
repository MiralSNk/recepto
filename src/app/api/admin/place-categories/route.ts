/**
 * GET  /api/admin/place-categories — список (place_categories)
 * POST /api/admin/place-categories — создать
 *
 * Ответ совместим с ChatAdminClient: key = category_key
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
  category_key: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9_-]+$/i, 'Только латиница, цифры, _ и -'),
  label: z.string().min(1).max(100),
  sort_order: z.number().int().min(0).optional(),
});

function toClient(row: {
  id: number;
  category_key: string;
  label: string;
  sort_order: number;
}) {
  return {
    id: row.id,
    category_key: row.category_key,
    key: row.category_key,
    label: row.label,
    sort_order: row.sort_order,
  };
}

export async function GET() {
  const { error: authError } = await requireAdminSession();
  if (authError) return authError;

  try {
    const db = getDB();
    const rows = await db.placeCategories.getAllPlaceCategories();
    return NextResponse.json(rows.map(toClient));
  } catch (error) {
    return serverError('GET place-categories error:', error);
  }
}

export async function POST(req: Request) {
  const { error: authError } = await requireAdminSession();
  if (authError) return authError;

  const { data: body, error: bodyError } = await readJsonBody<Record<string, unknown>>(req);
  if (bodyError) return bodyError;

  try {
    // поддержка { key } из старого UI
    if (body.key && !body.category_key) body.category_key = body.key;

    const data = createSchema.parse(body);
    const db = getDB();
    const { id } = await db.placeCategories.createPlaceCategory({
      category_key: data.category_key,
      label: data.label,
      sort_order: data.sort_order ?? 0,
    });

    revalidate('places');

    return NextResponse.json(
      toClient({
        id,
        category_key: data.category_key,
        label: data.label,
        sort_order: data.sort_order ?? 0,
      }),
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) return zodErrorResponse(error);
    return serverError('POST place-categories error:', error);
  }
}
