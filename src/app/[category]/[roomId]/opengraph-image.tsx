import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { OG_SIZE, getOgColors, loadFont } from '@/lib/shared/og';
import { getRoomForOG, getSiteSettings } from '@/lib/index.server';
import { notFound } from 'next/navigation';

export const size = OG_SIZE;
export const contentType = 'image/png';

async function loadSvgAsDataUri(fileName: string): Promise<string | null> {
  const fullPath = join(process.cwd(), 'src', 'assets', 'icons', fileName);
  if (!existsSync(fullPath)) return null;
  const data = await readFile(fullPath);
  return `data:image/svg+xml;base64,${data.toString('base64')}`;
}

async function loadCustomLogo(url: string): Promise<string | null> {
  if (!url) return null;
  const fullPath = join(process.cwd(), 'public', url.replace(/^\//, ''));
  if (!existsSync(fullPath)) return null;
  const data = await readFile(fullPath);
  const ext = url.split('.').pop()?.toLowerCase();
  const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'png' ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${data.toString('base64')}`;
}

async function loadRoomCoverBase64(roomId: number): Promise<string | null> {
  const dir = join(process.cwd(), 'public', 'rooms', String(roomId));
  if (!existsSync(dir)) return null;

  const { readdirSync } = await import('node:fs');
  const files = readdirSync(dir)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .sort();
  if (!files.length) return null;

  const filePath = join(dir, files[0]);
  const data = await readFile(filePath);
  const ext = files[0].toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
  return `data:image/${ext};base64,${data.toString('base64')}`;
}

interface Props {
  params: Promise<{ category: string; roomId: string }>;
}

export default async function Image({ params }: Props) {
  const { roomId } = await params;
  const id = Number(roomId);

  // Если ID некорректный — сразу 404, без SQL-запроса
  if (!Number.isFinite(id)) {
    notFound();
  }

  const [room, settings, OG_COLORS] = await Promise.all([
    getRoomForOG(id),
    getSiteSettings(),
    getOgColors(),
  ]);

  const title = room?.name ?? 'Номер';
  const price = room?.price_day;
  const priceText = price ? `от ${price.toLocaleString('ru-RU')} ₽ / сутки` : '';
  const hotelName = settings.hotel_name || 'Название вашего отеля';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/^https?:\/\//, '') || 'ваш-домен.ru';

  const titleLogoSrc =
    (settings.logo_title ? await loadCustomLogo(settings.logo_title) : null) ||
    (await loadSvgAsDataUri('brand-title.svg')) ||
    '';
  const subtitleLogoSrc =
    (settings.logo_subtitle ? await loadCustomLogo(settings.logo_subtitle) : null) ||
    (await loadSvgAsDataUri('brand-subtitle.svg')) ||
    '';

  const [fontRegular, fontBold, cover] = await Promise.all([
    loadFont('Garamond.ttf'),
    loadFont('Garamond-Bold.ttf'),
    loadRoomCoverBase64(id),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          backgroundColor: OG_COLORS.cream,
          fontFamily: 'Garamond',
        }}
      >
        {cover && (
          <img
            src={cover}
            width={1200}
            height={630}
            style={{ position: 'absolute', inset: 0, objectFit: 'cover' }}
          />
        )}

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.5) 100%)',
          }}
        />

        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            height: '100%',
            padding: '56px 64px',
            color: '#ffffff',
            textShadow: '0 2px 12px rgba(0,0,0,0.9)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {titleLogoSrc ? (
                <img src={titleLogoSrc} style={{ height: '40px', objectFit: 'contain' }} />
              ) : (
                <span style={{ fontSize: 28, fontWeight: 700 }}>{hotelName}</span>
              )}
              {subtitleLogoSrc ? (
                <img src={subtitleLogoSrc} style={{ height: '14px', objectFit: 'contain', opacity: 0.9 }} />
              ) : (
                <span style={{ fontSize: 14, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {settings.hotel_address || 'Адрес вашего отеля'}
                </span>
              )}
            </div>
            {priceText && (
              <div style={{ padding: '10px 18px', backgroundColor: OG_COLORS.gold, color: '#ffffff', borderRadius: 8, fontSize: 18 }}>
                {priceText}
              </div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              backgroundColor: 'rgba(0,0,0,0.55)',
              padding: '16px 20px',
              borderRadius: 12,
            }}
          >
            <div style={{ fontSize: 52, fontWeight: 700, lineHeight: 1.15, maxWidth: 1000 }}>{title}</div>
            {room?.description && (
              <div style={{ fontSize: 22, opacity: 0.95, maxWidth: 860, lineHeight: 1.35 }}>
                {room.description.length > 110 ? room.description.slice(0, 107) + '…' : room.description}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `2px solid ${OG_COLORS.gold}`, paddingTop: 20, fontSize: 18, opacity: 0.95 }}>
            <span>{siteUrl}</span>
            <span>Забронировать онлайн</span>
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: 'Garamond', data: fontRegular, style: 'normal', weight: 400 },
        { name: 'VremenaGrotesk', data: fontBold, style: 'normal', weight: 700 },
      ],
    }
  );
}