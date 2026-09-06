/**
 * GET  /api/admin/rooms?category=&q=
 * POST /api/admin/rooms — создание номера
 */

import { NextResponse } from 'next/server';
import { createRoomSchema } from '@/schemas/admin';
import { getDB } from '@/db';
import { ZodError } from 'zod';
import type { AmenityKey } from '@/types';
import {
  requireAdminSession,
  readJsonBody,
  zodErrorResponse,
  serverError,
  revalidate,
} from '@/lib/server/api-helpers';

export async function GET(req: Request) {
  const { error: authError } = await requireAdminSession();
  if (authError) return authError;

  const url = new URL(req.url);
  const category = url.searchParams.get('category') || undefined;
  const q = url.searchParams.get('q') || undefined;

  try {
    const db = getDB();
    const rooms = await db.rooms.getAdminRooms({ category, search: q });
    return NextResponse.json(rooms);
  } catch (error) {
    return serverError('GET rooms error:', error);
  }
}

export async function POST(req: Request) {
  const { error: authError } = await requireAdminSession();
  if (authError) return authError;

  const { data: body, error: bodyError } = await readJsonBody(req);
  if (bodyError) return bodyError;

  try {
    const data = createRoomSchema.parse(body);
    const db = getDB();

    const category = await db.categories.getCategoryByKey(data.category_key);
    if (!category) {
      return NextResponse.json(
        { error: `Категория с ключом "${data.category_key}" не найдена` },
        { status: 404 }
      );
    }

    // Явный маппинг: AdminRoomCreate не принимает undefined.
    const newRoom = await db.rooms.createRoom({
      name: data.name,
      category_key: data.category_key,
      price: data.price,
      old_price: data.old_price ?? null,
      price_day: data.price_day,
      price_half_day: data.price_half_day ?? null,
      price_label: data.price_label ?? null,
      price_day_label: data.price_day_label ?? null,
      price_half_day_label: data.price_half_day_label ?? null,
      area: data.area ?? null,
      guests: data.guests ?? null,
      extra_guest_capacity: data.extra_guest_capacity ?? 0,
      description: data.description,
      full_description: data.full_description,
      is_published: data.is_published ?? true,
      sort_order: data.sort_order ?? 0,
      amenities: (data.amenities ?? []) as AmenityKey[],
      extras: data.extras ?? [],
      images: data.images ?? [],
    });

    revalidate('rooms', 'categories');

    return NextResponse.json(newRoom, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return zodErrorResponse(error);
    return serverError('POST room error:', error);
  }
}
