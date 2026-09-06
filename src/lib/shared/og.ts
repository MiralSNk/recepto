import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getPalette } from '@/lib/server/palette';

export const OG_SIZE = {
  width: 1200,
  height: 630,
} as const;

const OG_COLOR_DEFAULTS = {
  cream: '#F5F0E8',
  brown: '#173f35',
  gold: '#89754f',
  text: '#111111',
  muted: '#555555',
  white: '#FFFFFF',
} as const;

export type OgColors = typeof OG_COLOR_DEFAULTS;

/**
 * Цвета для OG-превью берутся из редактируемой в админке палитры
 * (/admin/palette), а не зашиты статично — иначе смена фирменных цветов
 * сайта не отражалась бы на превью в соцсетях.
 */
export async function getOgColors(): Promise<OgColors> {
  const palette = await getPalette();
  return {
    cream: palette['color-pr-warm'] || OG_COLOR_DEFAULTS.cream,
    brown: palette['color-pr-brown'] || OG_COLOR_DEFAULTS.brown,
    gold: palette['color-pr-gold'] || OG_COLOR_DEFAULTS.gold,
    text: palette['color-text-primary'] || OG_COLOR_DEFAULTS.text,
    muted: palette['color-text-muted'] || OG_COLOR_DEFAULTS.muted,
    white: palette['color-white'] || OG_COLOR_DEFAULTS.white,
  };
}

/**
 * next/og требует, чтобы <img src> внутри ImageResponse был абсолютным URL
 * (http(s):// или data:) — относительный путь роняет ВЕСЬ прод-билд на
 * этапе пререндера OG-страниц (не просто одну страницу — `next build`
 * целиком завершается ошибкой). Админ мог сохранить относительный путь в
 * og_*_image (например «/photo.jpg»), а до фикса чтения site_settings это
 * поле вообще не читалось и опасность была не видна. Проверяем формат перед
 * использованием — некорректное значение просто трактуем как «не задано» и
 * идём по ветке автогенерации, а не роняем сборку.
 */
export function isAbsoluteImageUrl(url: string | undefined | null): url is string {
  if (!url) return false;
  return /^(https?:\/\/|data:)/i.test(url);
}

/** Буква для круглого бейджа на OG-превью — первая буква названия отеля, без родового слова «Отель»/«Гостиница» и кавычек. */
export function getHotelInitial(hotelName: string): string {
  const cleaned = hotelName.replace(/^(отель|гостиница|hotel)\s*/i, '').replace(/[«»"]/g, '').trim();
  return (cleaned || hotelName).charAt(0).toUpperCase() || 'H';
}

/** Загрузка шрифта для ImageResponse */
export async function loadFont(filename: string): Promise<ArrayBuffer> {
  const path = join(process.cwd(), 'public', 'fonts', filename);
  const buffer = await readFile(path);
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  );
}