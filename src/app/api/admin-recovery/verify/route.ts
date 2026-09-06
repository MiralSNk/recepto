/**
 * POST /api/admin-recovery/verify
 * Первый шаг восстановления пароля админки без email — проверка секретного
 * слова. Намеренно ВНЕ /api/admin/* — миддлварь (middleware.ts) требует
 * валидную сессию для всего /api/admin/*, а этот роут обязан быть доступен
 * именно разлогиненному админу.
 */
import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { getDB } from '@/db';
import { readJsonBody, zodErrorResponse, serverError } from '@/lib/server/api-helpers';
import { checkAdminRecoveryRateLimit } from '@/lib/server/admin-recovery-rate-limit';
import { compareOrDummy } from '@/lib/server/constant-time-compare';

const verifySchema = z.object({
  secretWord: z.string().min(1),
});

// Одно и то же сообщение для «слово не задано вообще» и «слово неверно» —
// иначе ответ сам по себе раскрывает, включена ли функция восстановления.
const GENERIC_ERROR = 'Неверное секретное слово';

export async function POST(req: Request) {
  if (!checkAdminRecoveryRateLimit()) {
    return NextResponse.json({ error: 'Слишком много попыток. Попробуйте позже.' }, { status: 429 });
  }

  const { data: body, error: bodyError } = await readJsonBody(req);
  if (bodyError) return bodyError;

  try {
    const { secretWord } = verifySchema.parse(body);

    const db = getDB();
    const admin = await db.users.findFirstAdmin();
    // compareOrDummy всегда платит стоимость bcrypt.compare, даже если
    // secret_word_hash не задан — иначе время ответа само раскрывает,
    // включена ли функция восстановления (то, что одинаковый текст ошибки
    // как раз должен скрывать).
    const isValid = await compareOrDummy(secretWord, admin?.secret_word_hash);
    if (!isValid) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) return zodErrorResponse(error);
    return serverError('POST admin-recovery/verify error:', error);
  }
}
