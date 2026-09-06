/**
 * PUT  /api/admin/unanswered-queries/:id  — сохранить или сбросить ответ
 * DELETE /api/admin/unanswered-queries/:id — удалить запись
 *
 * Body PUT:
 *   { "answer": "текст" }  — сохранить
 *   { "answer": null }     — сбросить
 */

import 'server-only';
import { NextResponse } from 'next/server';
import { getDB } from '@/db';
import { requireAdminSession, readJsonBody, parseIdParam, serverError } from '@/lib/server/api-helpers';

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, context: Ctx) {
  const { error: authError } = await requireAdminSession();
  if (authError) return authError;

  const { id: idRaw } = await context.params;
  const id = parseIdParam(idRaw);
  if (id === null) {
    return NextResponse.json({ error: 'Некорректный id' }, { status: 400 });
  }

  const { data: body, error: bodyError } = await readJsonBody<{ answer?: string | null }>(req);
  if (bodyError) return bodyError;

  try {
    const db = getDB();

    if (body.answer === null || body.answer === undefined) {
      await db.unansweredQueries.clearAnswer(id);
      return NextResponse.json({ ok: true, answer: null });
    }

    const text = String(body.answer).trim();
    if (!text) {
      return NextResponse.json({ error: 'Пустой ответ' }, { status: 400 });
    }

    await db.unansweredQueries.setAnswer(id, text);
    return NextResponse.json({ ok: true, answer: text });
  } catch (error) {
    return serverError('PUT unanswered-queries error:', error);
  }
}

export async function DELETE(_req: Request, context: Ctx) {
  const { error: authError } = await requireAdminSession();
  if (authError) return authError;

  const { id: idRaw } = await context.params;
  const id = parseIdParam(idRaw);
  if (id === null) {
    return NextResponse.json({ error: 'Некорректный id' }, { status: 400 });
  }

  try {
    const db = getDB();
    await db.unansweredQueries.deleteUnansweredQuery(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError('DELETE unanswered-queries error:', error);
  }
}
