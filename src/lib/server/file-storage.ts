import 'server-only';
import { unlink } from 'node:fs/promises';
import path from 'node:path';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const ALLOWED_PREFIXES = ['uploads', 'rooms'];

/**
 * Обращает URL загруженного файла (/uploads/x.webp, /rooms/12/x.webp) в
 * абсолютный путь на диске — та же проверка, что уже есть в serve-upload
 * (src/app/api/serve-upload/[...path]/route.ts), намеренно живёт в одном
 * месте, чтобы не разъезжалась с ней. Возвращает null для всего, что не
 * похоже на реально загруженный файл (статичные ассеты вроде /hero-bg.png,
 * пустая строка, внешний URL, попытка выйти за пределы public/) —
 * вызывающий код должен трактовать null как "удалять нечего", а не ошибку.
 */
export function resolveUploadPath(url: string): string | null {
  if (!url) return null;
  const clean = url.split('?')[0].split('#')[0];
  if (!clean.startsWith('/')) return null;

  const segments = clean.slice(1).split('/');
  if (segments.length === 0) return null;
  if (segments.some((s) => s === '' || s === '..' || s.includes('\0'))) return null;
  if (!ALLOWED_PREFIXES.includes(segments[0])) return null;

  const filePath = path.join(PUBLIC_DIR, ...segments);
  if (!filePath.startsWith(PUBLIC_DIR)) return null;
  return filePath;
}

/**
 * Best-effort удаление — НИКОГДА не бросает исключение: чистка файла не
 * должна ронять основную операцию (удаление номера, замену иконки и т.д.),
 * если файла уже нет или он недоступен. ENOENT тихо игнорируется (уже
 * удалён кем-то другим/вручную), остальные ошибки — логируются, но не
 * пробрасываются.
 */
export async function deleteUploadedFile(url: string | null | undefined): Promise<void> {
  if (!url) return;
  const filePath = resolveUploadPath(url);
  if (!filePath) return;

  try {
    await unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      console.error('deleteUploadedFile error:', url, error);
    }
  }
}

export async function deleteUploadedFiles(urls: (string | null | undefined)[]): Promise<void> {
  await Promise.all(urls.map((url) => deleteUploadedFile(url)));
}
