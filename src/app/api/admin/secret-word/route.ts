import { NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import bcrypt from 'bcryptjs';
import { getDB } from '@/db';
import { requireAdminSession, readJsonBody, zodErrorResponse, serverError } from '@/lib/server/api-helpers';

const setSecretWordSchema = z.object({
  currentPassword: z.string().min(1, 'Введите текущий пароль'),
  secretWord: z.string().min(4, 'Секретное слово должно быть не короче 4 символов').max(100),
});

/**
 * Задать/сменить секретное слово для восстановления пароля — зеркало
 * /api/admin/change-password. Требует текущий пароль (та же логика: активная
 * сессия не должна давать право менять его без повторного подтверждения).
 */
export async function PUT(req: Request) {
  const { session, error: authError } = await requireAdminSession();
  if (authError) return authError;

  const { data: body, error: bodyError } = await readJsonBody(req);
  if (bodyError) return bodyError;

  try {
    const { currentPassword, secretWord } = setSecretWordSchema.parse(body);

    const db = getDB();
    const user = await db.users.findByEmail(session!.user.email);
    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Текущий пароль неверен' }, { status: 400 });
    }

    const hash = await bcrypt.hash(secretWord, 12);
    await db.users.updateSecretWord(user.id, hash);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) return zodErrorResponse(error);
    return serverError('PUT secret-word error:', error);
  }
}
