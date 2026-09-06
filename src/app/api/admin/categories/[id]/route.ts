import { NextResponse } from 'next/server';
import { updateCategorySchema } from '@/schemas/admin';
import { getDB } from '@/db';
import { ZodError } from 'zod';
import {
  requireAdminSession,
  readJsonBody,
  parseIdParam,
  zodErrorResponse,
  serverError,
  revalidate,
} from '@/lib/server/api-helpers';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error: authError } = await requireAdminSession();
  if (authError) return authError;

  const { id } = await params;
  const numericId = parseIdParam(id);
  if (numericId === null) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const { data: body, error: bodyError } = await readJsonBody(req);
  if (bodyError) return bodyError;

  try {
    const data = updateCategorySchema.parse(body);
    const db = getDB();

    const existing = await db.categories.getCategoryById(numericId);
    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Если меняется ключ, проверяем дубликат
    if (data.key && data.key !== existing.key) {
      const duplicate = await db.categories.getCategoryByKey(data.key);
      if (duplicate && duplicate.id !== numericId) {
        return NextResponse.json(
          { error: `Категория с ключом "${data.key}" уже существует` },
          { status: 409 }
        );
      }
    }

    const updated = await db.categories.updateCategory(numericId, data);
    if (!updated) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

    revalidate('rooms', 'categories');

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof ZodError) return zodErrorResponse(error);
    return serverError('PUT category error:', error);
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
    const category = await db.categories.getCategoryById(numericId);
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const roomsCount = await db.categories.countRoomsInCategory(category.key);
    if (roomsCount > 0) {
      return NextResponse.json(
        { error: 'Нельзя удалить категорию с номерами. Сначала удалите или перенесите номера.' },
        { status: 409 }
      );
    }

    await db.categories.deleteCategory(numericId);
    revalidate('rooms', 'categories');

    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError('DELETE category error:', error);
  }
}
