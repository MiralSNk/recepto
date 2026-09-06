import { NextResponse } from 'next/server';
import { updateRoomSchema } from '@/schemas/admin';
import { getDB } from '@/db';
import { ZodError } from 'zod';
import type { AmenityKey } from '@/types';
import {
  requireAdminSession,
  readJsonBody,
  parseIdParam,
  zodErrorResponse,
  serverError,
  revalidate,
} from '@/lib/server/api-helpers';
import { deleteUploadedFiles } from '@/lib/server/file-storage';

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
    const data = updateRoomSchema.parse(body);
    const db = getDB();

    const existing = await db.rooms.getAdminRoomById(numericId);
    if (!existing) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (data.category_key) {
      const category = await db.categories.getCategoryByKey(data.category_key);
      if (!category) {
        return NextResponse.json(
          { error: `Категория с ключом "${data.category_key}" не найдена` },
          { status: 404 }
        );
      }
    }

    const updateData = {
      ...data,
      amenities: data.amenities as AmenityKey[] | undefined,
    };
    const updated = await db.rooms.updateRoom(numericId, updateData);
    if (!updated) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

    // Фото, пропавшие из нового списка (заменены/удалены в форме), больше
    // ни на что не ссылаются — чистим с диска. Только реально пропавшие,
    // а не весь старый список, и только если images вообще пришли в этом
    // запросе (иначе они просто не менялись).
    if (data.images !== undefined) {
      const removedImages = existing.images.filter((url) => !data.images!.includes(url));
      await deleteUploadedFiles(removedImages);
    }

    revalidate('rooms', 'categories');

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof ZodError) return zodErrorResponse(error);
    return serverError('PUT room error:', error);
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
    const existing = await db.rooms.getAdminRoomById(numericId);
    if (!existing) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    await db.rooms.deleteRoom(numericId);
    // Каскад в БД (ON DELETE CASCADE) убирает только строки room_images —
    // сами файлы на диске каскад не трогает, чистим отдельно.
    await deleteUploadedFiles(existing.images);

    revalidate('rooms');

    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError('DELETE room error:', error);
  }
}
