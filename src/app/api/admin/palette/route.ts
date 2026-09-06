import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getDB } from '@/db';
import { paletteSchema } from '@/schemas/admin';
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
    const palette = await db.siteSettings.getSetting('palette');
    return NextResponse.json(palette || {});
  } catch (error) {
    return serverError('GET palette error:', error);
  }
}

export async function PUT(req: Request) {
  const { error: authError } = await requireAdminSession();
  if (authError) return authError;

  const { data: body, error: bodyError } = await readJsonBody(req);
  if (bodyError) return bodyError;

  try {
    // Значения попадают без экранирования в инлайновый <style> в
    // src/app/layout.tsx на каждой странице сайта — валидируем строго
    // (hex-цвет/CSS-размер), чтобы компрометация админ-сессии не превращалась
    // в site-wide XSS. См. AUDIT.md.
    const palette = paletteSchema.parse(body);

    const db = getDB();
    await db.siteSettings.setSetting('palette', palette);
    revalidate('palette');

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) return zodErrorResponse(error);
    return serverError('PUT palette error:', error);
  }
}