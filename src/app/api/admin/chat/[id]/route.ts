import { NextResponse } from 'next/server';
import { getDB } from '@/db';
import { z } from 'zod';
import {
  requireAdminSession,
  readJsonBody,
  parseIdParam,
  zodErrorResponse,
  serverError,
  revalidate,
} from '@/lib/server/api-helpers';

const updateQuickReplySchema = z.object({
  label: z.string().min(1).optional(),
  action: z.string().min(1).optional(),
  sort_order: z.number().int().min(0).optional(),
  is_visible: z.boolean().optional(),
});

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
    await db.chat.deleteQuickReply(numericId);
    revalidate('chat');
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError('DELETE quick reply error:', error);
  }
}

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
    const data = updateQuickReplySchema.parse(body);
    const db = getDB();
    await db.chat.updateQuickReply(numericId, data);
    revalidate('chat');
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return zodErrorResponse(error);
    return serverError('PUT quick reply error:', error);
  }
}
