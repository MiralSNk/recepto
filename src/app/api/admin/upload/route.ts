import { NextResponse } from 'next/server';
import { writeFile, mkdir, access, stat } from 'fs/promises';
import { constants } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { getDB } from '@/db';
import { requireAdminSession } from '@/lib/server/api-helpers';
import { applyCurrentColorToSvg } from '@/lib/shared/svg-currentcolor';
import { sanitizeSvg } from '@/lib/shared/svg-sanitize';

// Допустимые типы файлов для номеров (без SVG)
const ROOM_ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Допустимые типы файлов для сайта (включая SVG для логотипов)
const SITE_ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);

const MAX_SIZE = 8 * 1024 * 1024; // 8 MB

export async function POST(req: Request) {
  const { error: authError } = await requireAdminSession();
  if (authError) return authError;

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const roomIdRaw = formData.get('roomId');
    const type = formData.get('type') || 'rooms';
    const fixSvgColor = formData.get('fixSvgColor') === 'true';

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Файл не загружен' }, { status: 400 });
    }

    // ============================
    // Ветка для загрузки фото номеров
    // ============================
    if (type === 'rooms') {
      const roomId = String(roomIdRaw || '');
      const isTmp = roomId === 'tmp';
      if (!isTmp && !/^\d+$/.test(roomId)) {
        return NextResponse.json({ error: 'Некорректный roomId' }, { status: 400 });
      }

      // Проверяем существование номера, если это не временная загрузка
      if (!isTmp) {
        const numericRoomId = Number(roomId);
        if (!Number.isFinite(numericRoomId)) {
          return NextResponse.json({ error: 'Некорректный roomId' }, { status: 400 });
        }
        const room = await getDB().rooms.getAdminRoomById(numericRoomId);
        if (!room) {
          return NextResponse.json({ error: 'Номер не найден' }, { status: 404 });
        }
      }

      if (!ROOM_ALLOWED.has(file.type)) {
        return NextResponse.json(
          { error: 'Только JPG, PNG или WebP' },
          { status: 400 }
        );
      }
      if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: 'Максимум 8 MB' }, { status: 400 });
      }

      const input = Buffer.from(await file.arrayBuffer());
      if (!input.length) {
        return NextResponse.json({ error: 'Пустой файл' }, { status: 400 });
      }

      let optimized: Buffer;
      try {
        optimized = await sharp(input)
          .rotate()
          .resize({
            width: 2000,
            height: 2000,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: 82 })
          .toBuffer();
      } catch (sharpErr) {
        console.error('sharp error:', sharpErr);
        return NextResponse.json(
          { error: 'Не удалось обработать изображение' },
          { status: 400 }
        );
      }

      if (!optimized.length) {
        return NextResponse.json(
          { error: 'После сжатия файл пустой' },
          { status: 500 }
        );
      }

      const filename = `${randomUUID()}.webp`;

      // Только POSIX-сегменты для URL (без path.join в URL)
      const urlFolder = isTmp ? `tmp/${randomUUID().slice(0, 8)}` : roomId;

      const absoluteDir = path.join(
        process.cwd(),
        'public',
        'rooms',
        ...urlFolder.split('/')
      );
      const absoluteFile = path.join(absoluteDir, filename);

      await mkdir(absoluteDir, { recursive: true });
      await writeFile(absoluteFile, optimized);

      // Проверка, что файл реально на диске
      try {
        await access(absoluteFile, constants.R_OK);
        const st = await stat(absoluteFile);
        if (st.size < 100) {
          console.error('Uploaded file too small:', absoluteFile);
          return NextResponse.json(
            { error: 'Файл записан, но слишком маленький' },
            { status: 500 }
          );
        }
      } catch {
        console.error('File missing after write:', absoluteFile);
        return NextResponse.json(
          { error: 'Файл не удалось сохранить на диск' },
          { status: 500 }
        );
      }

      const publicPath = `/rooms/${urlFolder}/${filename}`;

      return NextResponse.json({
        url: publicPath,
        bytes: optimized.length,
      });
    }

    // ============================
    // Ветка для загрузки файлов сайта (Hero, логотипы)
    // ============================
    else if (type === 'site') {
      if (!SITE_ALLOWED.has(file.type)) {
        return NextResponse.json(
          { error: 'Только JPG, PNG, WebP или SVG' },
          { status: 400 }
        );
      }
      if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: 'Максимум 8 MB' }, { status: 400 });
      }

      const input = Buffer.from(await file.arrayBuffer());
      if (!input.length) {
        return NextResponse.json({ error: 'Пустой файл' }, { status: 400 });
      }

      let optimized: Buffer = input;
      let ext = 'svg'; // по умолчанию для SVG

      // SVG показывается на сайте инлайном (не через <img> — иначе
      // fill="currentColor" не работал бы, см. InlineSvgIcon), а значит его
      // содержимое литерально попадает в HTML, который видят все посетители
      // сайта. Чистим от script/обработчиков событий ВСЕГДА, а не только при
      // включённой галочке ниже — это защита, а не косметика.
      if (file.type === 'image/svg+xml') {
        optimized = Buffer.from(sanitizeSvg(input.toString('utf-8')), 'utf-8');
      }

      // По желанию админа (галочка при загрузке) — заменить захардкоженные
      // fill на currentColor, чтобы иконка подхватывала цвет из палитры.
      // Не трогает fill="none"/"transparent" и содержимое defs/mask/clipPath —
      // см. applyCurrentColorToSvg.
      if (file.type === 'image/svg+xml' && fixSvgColor) {
        optimized = Buffer.from(applyCurrentColorToSvg(optimized.toString('utf-8')), 'utf-8');
      }

      // Если это не SVG, конвертируем в WebP
      if (file.type !== 'image/svg+xml') {
        try {
          optimized = await sharp(input)
            .rotate()
            .resize({
              width: 2000,
              height: 2000,
              fit: 'inside',
              withoutEnlargement: true,
            })
            .webp({ quality: 82 })
            .toBuffer();
          ext = 'webp';
        } catch (sharpErr) {
          console.error('sharp error:', sharpErr);
          return NextResponse.json(
            { error: 'Не удалось обработать изображение' },
            { status: 400 }
          );
        }
      }

      const filename = `${randomUUID()}.${ext}`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      await mkdir(uploadDir, { recursive: true });
      const absoluteFile = path.join(uploadDir, filename);

      await writeFile(absoluteFile, optimized);

      // Проверка файла
      try {
        await access(absoluteFile, constants.R_OK);
        const st = await stat(absoluteFile);
        if (st.size < 50) {
          return NextResponse.json(
            { error: 'Файл записан, но слишком маленький' },
            { status: 500 }
          );
        }
      } catch {
        console.error('File missing after write:', absoluteFile);
        return NextResponse.json(
          { error: 'Файл не удалось сохранить на диск' },
          { status: 500 }
        );
      }

      const publicPath = `/uploads/${filename}`;

      return NextResponse.json({
        url: publicPath,
        bytes: optimized.length,
      });
    }

    // Неизвестный тип
    return NextResponse.json({ error: 'Неизвестный тип загрузки' }, { status: 400 });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Ошибка обработки изображения' }, { status: 500 });
  }
}