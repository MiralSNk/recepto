import 'server-only';
import bcrypt from 'bcryptjs';

// Один и тот же dummy-хеш для любого сравнения, где реального hash может не
// быть (несуществующий email при логине, ещё не заданное секретное слово
// восстановления) — вычисляется один раз при старте процесса. bcrypt.compare
// с ним стоит по времени ровно столько же, сколько сравнение с настоящим
// hash, поэтому ветка "сравнивать не с чем" не отвечает заметно быстрее и не
// раскрывает по времени ответа то, что должен скрывать одинаковый текст
// ошибки (существует ли такой email, настроено ли восстановление пароля).
const DUMMY_HASH = bcrypt.hashSync('constant-time-dummy-password', 12);

/**
 * true только если hash реально задан И value ему соответствует по bcrypt.
 * Всегда платит стоимость одного bcrypt.compare, даже когда hash отсутствует
 * (сравнивает с фиксированным dummy-хешем — результат в этом случае значения
 * не имеет, Boolean(hash) всё равно даёт false).
 */
export async function compareOrDummy(
  value: string,
  hash: string | null | undefined
): Promise<boolean> {
  const isValid = await bcrypt.compare(value, hash ?? DUMMY_HASH);
  return Boolean(hash) && isValid;
}
