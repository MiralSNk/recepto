import { NextResponse } from 'next/server';
import { bulkPriceSchema } from '@/schemas/admin';
import { getDB } from '@/db';
import { ZodError } from 'zod';
import {
  requireAdminSession,
  readJsonBody,
  zodErrorResponse,
  serverError,
  revalidate,
} from '@/lib/server/api-helpers';

export async function POST(req: Request) {
  const { error: authError } = await requireAdminSession();
  if (authError) return authError;

  const { data: body, error: bodyError } = await readJsonBody(req);
  if (bodyError) return bodyError;

  try {
    const data = bulkPriceSchema.parse(body);
    const { roomIds, categoryKey } = data;
    const db = getDB();

    if (!roomIds?.length && !categoryKey) {
      return NextResponse.json(
        { error: 'Выберите категорию или список номеров' },
        { status: 400 }
      );
    }

    // price ("Цена (основная)", карточки номеров) в массовое обновление
    // намеренно не входит — это умышленно независимое поле, задаётся только
    // по одному номеру в RoomFormModal.tsx.
    const updates: Partial<{ price: number; price_day: number; price_half_day: number; old_price: number | null }> = {};
    if (typeof data.price_half_day === 'number') updates.price_half_day = data.price_half_day;
    if (typeof data.old_price === 'number') updates.old_price = data.old_price;
    if (typeof data.price_day === 'number') updates.price_day = data.price_day;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'Укажите хотя бы одну цену' },
        { status: 400 }
      );
    }

    let ids: number[] = roomIds?.length ? [...roomIds] : [];

    if (!ids.length && categoryKey) {
      const cat = await db.categories.getCategoryByKey(categoryKey);
      if (!cat) {
        return NextResponse.json(
          { error: `Категория "${categoryKey}" не найдена` },
          { status: 404 }
        );
      }
      const rooms = await db.rooms.getRoomsByCategory(categoryKey);
      ids = rooms.map((r) => r.id);
    }

    if (!ids.length) {
      return NextResponse.json(
        { error: 'Нет номеров для обновления' },
        { status: 400 }
      );
    }

    const updatedCount = await db.rooms.bulkUpdatePrices(ids, updates);

    revalidate('rooms');

    const sample = await Promise.all(
      ids.slice(0, 5).map((id) => db.rooms.getAdminRoomById(id))
    );

    return NextResponse.json({
      ok: true,
      updated: updatedCount,
      ids,
      sample,
    });
  } catch (error) {
    if (error instanceof ZodError) return zodErrorResponse(error);
    return serverError('Bulk-price error:', error);
  }
}
