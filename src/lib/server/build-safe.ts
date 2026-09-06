import 'server-only';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';

/**
 * Оборачивает чтение БД для мест, где оно может выполняться во время
 * статической генерации (next build) без реально запущенной рядом БД —
 * Docker-сборка (см. Dockerfile/DOCKER.md) или сборка "в другом месте" из
 * DEPLOY.md. Вместо падения ВСЕЙ сборки на первой недоступной таблице
 * отдаём fallback (пустой массив/объект — тот же смысл, что и "ещё не
 * настроено в БД", который остальной код уже умеет показывать generic-
 * плейсхолдерами).
 *
 * На реальном рантайме (next start) ошибку НЕ глотаем — если БД недоступна
 * не во время сборки, это должно быть видно, а не тихо подменяться пустым
 * результатом.
 */
export async function buildSafe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) {
      console.warn('[buildSafe] БД недоступна во время сборки — использую fallback:', error);
      return fallback;
    }
    throw error;
  }
}
