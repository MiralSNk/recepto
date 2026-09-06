import { NextResponse } from 'next/server';
import { getDB } from '@/db';
import { requireAdminSession, readJsonBody, serverError, revalidate } from '@/lib/server/api-helpers';
import { deleteUploadedFile } from '@/lib/server/file-storage';

const KEYS = ['hero_bg', 'hero_title', 'hero_subtitle', 'logo_full', 'logo_title', 'logo_subtitle'];
// Подмножество KEYS, за которым реально стоит загруженный файл (не текст) —
// при замене/очистке значения старый файл нужно чистить с диска.
const FILE_KEYS = ['hero_bg', 'logo_full', 'logo_title', 'logo_subtitle'];
const MAX_VALUE_LENGTH = 2000;

export async function GET() {
  const { error: authError } = await requireAdminSession();
  if (authError) return authError;

  try {
    const db = getDB();
    const [heroBg, heroTitle, heroSubtitle, logoFull, logoTitle, logoSubtitle] = await Promise.all(
      KEYS.map((key) => db.siteSettings.getSetting(key))
    );

    return NextResponse.json({
      hero_bg: heroBg || '',
      hero_title: heroTitle || '',
      hero_subtitle: heroSubtitle || '',
      logo_full: logoFull || '',
      logo_title: logoTitle || '',
      logo_subtitle: logoSubtitle || '',
    });
  } catch (error) {
    return serverError('GET home settings error:', error);
  }
}

export async function PUT(req: Request) {
  const { error: authError } = await requireAdminSession();
  if (authError) return authError;

  const { data: body, error: bodyError } = await readJsonBody<Record<string, unknown>>(req);
  if (bodyError) return bodyError;

  for (const key of KEYS) {
    if (typeof body[key] === 'string' && (body[key] as string).length > MAX_VALUE_LENGTH) {
      return NextResponse.json({ error: `${key}: слишком длинное значение` }, { status: 400 });
    }
  }

  try {
    const db = getDB();

    // Старые значения файловых ключей — до перезаписи, иначе их будет
    // неоткуда взять для чистки диска (setSetting — чистый upsert).
    const oldFileValues: Record<string, string | null> = {};
    await Promise.all(
      FILE_KEYS.map(async (key) => {
        oldFileValues[key] = await db.siteSettings.getSetting(key);
      })
    );

    for (const key of KEYS) {
      if (typeof body[key] === 'string') {
        await db.siteSettings.setSetting(key, body[key] as string);
      }
    }

    // Заменили на другой файл (или нажали "Удалить" — новое значение '') —
    // старый файл больше ни на что не ссылается. Статичные дефолты (вроде
    // /hero-bg.png) resolveUploadPath сам не тронет — это не /uploads/*.
    for (const key of FILE_KEYS) {
      if (typeof body[key] === 'string' && body[key] !== oldFileValues[key]) {
        await deleteUploadedFile(oldFileValues[key]);
      }
    }

    revalidate('home');
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError('PUT home settings error:', error);
  }
}
