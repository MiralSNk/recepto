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

const settingSchema = z.object({
  setting_key: z.string().min(1),
  value: z.string(),
});

const quickReplySchema = z.object({
  label: z.string().min(1),
  action: z.string().min(1),
  sort_order: z.number().int().min(0),
});

export async function GET() {
  const { error: authError } = await requireAdminSession();
  if (authError) return authError;

  try {
    const db = getDB();
    const [capabilities, cancelBooking, quickReplies] = await Promise.all([
      db.chat.getSetting('capabilities_text'),
      db.chat.getSetting('cancel_booking_text'),
      db.chat.getQuickReplies(),
    ]);

    return NextResponse.json({
      settings: {
        capabilities: capabilities || '',
        cancelBooking: cancelBooking || '',
      },
      quickReplies,
    });
  } catch (error) {
    return serverError('GET admin chat error:', error);
  }
}

export async function POST(req: Request) {
  const { error: authError } = await requireAdminSession();
  if (authError) return authError;

  const { data: body, error: bodyError } = await readJsonBody(req);
  if (bodyError) return bodyError;

  try {
    const db = getDB();
    const data = quickReplySchema.parse(body);
    const result = await db.chat.createQuickReply(data);

    revalidate('chat');

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return zodErrorResponse(error);
    return serverError('POST admin chat error:', error);
  }
}

export async function PUT(req: Request) {
  const { error: authError } = await requireAdminSession();
  if (authError) return authError;

  const { data: body, error: bodyError } = await readJsonBody(req);
  if (bodyError) return bodyError;

  try {
    const db = getDB();
    const { setting_key, value } = settingSchema.parse(body);
    await db.chat.setSetting(setting_key, value);

    revalidate('chat');

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return zodErrorResponse(error);
    return serverError('PUT admin chat error:', error);
  }
}
