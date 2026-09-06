import { NextResponse } from 'next/server';
import { createCategorySchema } from '@/schemas/admin';
import { getDB } from '@/db';
import { ZodError } from 'zod';
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
    const categories = await db.categories.getAllCategories();
    return NextResponse.json(categories);
  } catch (error) {
    return serverError('GET categories error:', error);
  }
}

export async function POST(req: Request) {
  const { error: authError } = await requireAdminSession();
  if (authError) return authError;

  const { data: body, error: bodyError } = await readJsonBody(req);
  if (bodyError) return bodyError;

  try {
    const data = createCategorySchema.parse(body);
    const db = getDB();

    const existing = await db.categories.getCategoryByKey(data.key);
    if (existing) {
      return NextResponse.json(
        { error: `Категория с ключом "${data.key}" уже существует` },
        { status: 409 }
      );
    }

    const newCategory = await db.categories.createCategory({
      key: data.key,
      label: data.label,
      sort_order: data.sort_order,
      is_visible: data.is_visible,
    });

    revalidate('categories', 'rooms');

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return zodErrorResponse(error);
    return serverError('POST category error:', error);
  }
}
