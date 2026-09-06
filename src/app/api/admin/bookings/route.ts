/**
 * GET /api/admin/bookings?status=&from=&to=
 * Список заявок из таблицы bookings
 */

import { NextResponse } from 'next/server';
import { getDB } from '@/db';
import { requireAdminSession, serverError } from '@/lib/server/api-helpers';

export async function GET(req: Request) {
  const { error: authError } = await requireAdminSession();
  if (authError) return authError;

  const url = new URL(req.url);
  const status = url.searchParams.get('status') || undefined;
  const from = url.searchParams.get('from') || undefined;
  const to = url.searchParams.get('to') || undefined;

  try {
    const db = getDB();
    const rows = await db.bookings.getBookings({ status, from, to });
    return NextResponse.json(rows);
  } catch (error) {
    return serverError('GET bookings error:', error);
  }
}
