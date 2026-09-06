/**
 * POST /api/admin-recovery/reset
 * Второй (и единственный state-changing) шаг восстановления пароля — заново
 * проверяет секретное слово (никогда не доверяет тому, что клиент уже прошёл
 * /verify — второй экран UI не равнозначен серверной авторизации) и,
 * если оно верное, ставит новый пароль. Как и /verify — намеренно ВНЕ
 * /api/admin/*, чтобы миддлварь не резала разлогиненного админа.
 */
import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import bcrypt from 'bcryptjs';
import { getDB } from '@/db';
import { readJsonBody, zodErrorResponse, serverError } from '@/lib/server/api-helpers';
import { checkAdminRecoveryRateLimit } from '@/lib/server/admin-recovery-rate-limit';
import { compareOrDummy } from '@/lib/server/constant-time-compare';

const resetSchema = z.object({
  secretWord: z.string().min(1),
  newPassword: z.string().min(8, 'Новый пароль должен быть не короче 8 символов'),
});

const GENERIC_ERROR = 'Неверное секретное слово';

export async function POST(req: Request) {
  if (!checkAdminRecoveryRateLimit()) {
    return NextResponse.json({ error: 'Слишком много попыток. Попробуйте позже.' }, { status: 429 });
  }

  const { data: body, error: bodyError } = await readJsonBody(req);
  if (bodyError) return bodyError;

  try {
    const { secretWord, newPassword } = resetSchema.parse(body);

    const db = getDB();
    const admin = await db.users.findFirstAdmin();
    // compareOrDummy всегда платит стоимость bcrypt.compare, даже если
    // secret_word_hash не задан — см. комментарий в verify/route.ts.
    const isValid = await compareOrDummy(secretWord, admin?.secret_word_hash);
    if (!admin || !isValid) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await db.users.updatePassword(admin.id, newHash);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) return zodErrorResponse(error);
    return serverError('POST admin-recovery/reset error:', error);
  }
}
