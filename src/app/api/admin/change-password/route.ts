import { NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import bcrypt from 'bcryptjs';
import { getDB } from '@/db';
import { requireAdminSession, readJsonBody, zodErrorResponse, serverError } from '@/lib/server/api-helpers';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Введите текущий пароль'),
  newPassword: z.string().min(8, 'Новый пароль должен быть не короче 8 символов'),
});

export async function PUT(req: Request) {
  const { session, error: authError } = await requireAdminSession();
  if (authError) return authError;

  const { data: body, error: bodyError } = await readJsonBody(req);
  if (bodyError) return bodyError;

  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(body);

    const db = getDB();
    const user = await db.users.findByEmail(session!.user.email);
    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Текущий пароль неверен' }, { status: 400 });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await db.users.updatePassword(user.id, newHash);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) return zodErrorResponse(error);
    return serverError('PUT change-password error:', error);
  }
}
