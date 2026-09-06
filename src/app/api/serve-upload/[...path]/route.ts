/**
 * Отдаёт файлы, загруженные через /api/admin/upload (public/rooms/**,
 * public/uploads/**), напрямую с диска — а не через штатную статику
 * Next.js.
 *
 * Почему: next start строит список статических файлов из public/ во время
 * pnpm build. Файл, записанный на диск ПОСЛЕ сборки (а именно так и
 * работает загрузка фото/иконок через админку — сайт не пересобирается на
 * каждую загрузку), Next не находит через обычную раздачу статики — запрос
 * проваливается в App Router и подхватывается динамическим маршрутом
 * /[category]/[roomId] (вернёт страницу «Номер не найден»), а не файлом.
 * Свежезагруженные фото номеров, лого, фон и иконки удобств были биты
 * именно поэтому — до следующего pnpm build + деплоя.
 *
 * См. next.config.ts → rewrites(): /rooms/* и /uploads/* переписаны сюда
 * ДО проверки статики (beforeFiles), поэтому этот обработчик видит вообще
 * все запросы к загруженным файлам — и старые (из прошлых сборок), и новые.
 */
import { NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
};

const PUBLIC_DIR = path.join(process.cwd(), 'public');

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(_req: Request, context: Ctx) {
  const { path: segments } = await context.params;

  if (!segments?.length || segments.some((s) => s.includes('..') || s.includes('\0'))) {
    return NextResponse.json({ error: 'Некорректный путь' }, { status: 400 });
  }

  // Разрешаем отдавать только из тех же папок, куда пишет /api/admin/upload.
  if (segments[0] !== 'rooms' && segments[0] !== 'uploads') {
    return NextResponse.json({ error: 'Не найдено' }, { status: 404 });
  }

  const ext = path.extname(segments[segments.length - 1]).toLowerCase();
  const contentType = MIME_TYPES[ext];
  if (!contentType) {
    return NextResponse.json({ error: 'Не найдено' }, { status: 404 });
  }

  const filePath = path.join(PUBLIC_DIR, ...segments);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    return NextResponse.json({ error: 'Некорректный путь' }, { status: 400 });
  }

  try {
    const st = await stat(filePath);
    if (!st.isFile()) throw new Error('not a file');
    const data = await readFile(filePath);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': contentType,
        // Имена файлов — случайный UUID, содержимое по одному URL не меняется.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Файл не найден' }, { status: 404 });
  }
}
