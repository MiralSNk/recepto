/**
 * Общие хелперы для Route Handlers (admin / public).
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/server/auth';
import { revalidateTag } from 'next/cache';
import { ZodError } from 'zod';

export async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return {
      session: null as null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  return { session, error: null as null };
}

export async function readJsonBody<T = unknown>(
  req: Request
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  try {
    const data = (await req.json()) as T;
    return { data, error: null };
  } catch {
    return {
      data: null,
      error: NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }),
    };
  }
}

export function parseIdParam(id: string): number | null {
  const n = Number(id);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function zodErrorResponse(error: ZodError) {
  return NextResponse.json(
    {
      error: error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; '),
      details: error.issues,
    },
    { status: 400 }
  );
}

export function serverError(context: string, error: unknown) {
  console.error(context, error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

/** Обход бага типов revalidateTag в Next 16 */
export function revalidate(...tags: string[]) {
  for (const tag of tags) {
    // @ts-expect-error Next 16 types
    revalidateTag(tag);
  }
}