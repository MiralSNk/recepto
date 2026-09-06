/**
 * Список неотвеченных запросов (и с готовыми ответами).
 * Доступ только через middleware /admin.
 */

import 'server-only';
import { NextResponse } from 'next/server';
import { getDB } from '@/db';
import { requireAdminSession, serverError } from '@/lib/server/api-helpers';

export async function GET() {
  const { error: authError } = await requireAdminSession();
  if (authError) return authError;

  try {
    const db = getDB();
    const queries = await db.unansweredQueries.getUnansweredQueries();
    return NextResponse.json(queries);
  } catch (error) {
    return serverError('GET unanswered-queries error:', error);
  }
}
