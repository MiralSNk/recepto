/**
 * Удаляет папки public/rooms/tmp/{uuid}/... старше 24 часов.
 *
 * Фото нового (ещё не сохранённого) номера грузятся в public/rooms/tmp/{uuid}
 * до создания самой записи в БД — если админ закрыл модалку не сохранив,
 * эти файлы вообще ни на что не ссылаются и не почистятся общим механизмом
 * удаления (тот чистит файлы при замене/удалении существующей ссылки в БД,
 * а тут ссылки в БД никогда и не было). Отдельный лёгкий standalone-скрипт,
 * без зависимости от запущенного приложения — под cron:
 *
 *   0 3 * * * cd /var/www/app && node scripts/cleanup-tmp-uploads.mjs
 */
import { readdir, stat, rm } from 'node:fs/promises';
import path from 'node:path';

const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const TMP_DIR = path.join(process.cwd(), 'public', 'rooms', 'tmp');

async function main() {
  let entries;
  try {
    entries = await readdir(TMP_DIR, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('public/rooms/tmp не существует — чистить нечего.');
      return;
    }
    throw error;
  }

  const now = Date.now();
  let removed = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const fullPath = path.join(TMP_DIR, entry.name);
    const info = await stat(fullPath);
    if (now - info.mtimeMs > MAX_AGE_MS) {
      await rm(fullPath, { recursive: true, force: true });
      removed++;
      console.log(`Удалено: ${fullPath}`);
    }
  }

  console.log(`Готово: удалено папок — ${removed}.`);
}

main().catch((error) => {
  console.error('cleanup-tmp-uploads error:', error);
  process.exit(1);
});
