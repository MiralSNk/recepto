import { ImageResponse } from 'next/og';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { OG_SIZE, getOgColors, getHotelInitial, isAbsoluteImageUrl, loadFont, getCategoryLabel, getSiteSettings } from '@/lib/index.server';

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

interface Props {
  params: Promise<{ category: string }>;
}

export default async function Image({ params }: Props) {
  const { category: raw } = await params;
  const [label, settings, OG_COLORS] = await Promise.all([
    getCategoryLabel(raw),
    getSiteSettings(),
    getOgColors(),
  ]);

  const titleLogoSrc =
    (settings.logo_title ? await loadCustomLogo(settings.logo_title) : null) ||
    (await loadSvgAsDataUri('brand-title.svg')) ||
    '';
  const subtitleLogoSrc =
    (settings.logo_subtitle ? await loadCustomLogo(settings.logo_subtitle) : null) ||
    (await loadSvgAsDataUri('brand-subtitle.svg')) ||
    '';

  const hotelName = settings.hotel_name || 'Название вашего отеля';
  const hotelAddress = settings.hotel_address || 'Адрес вашего отеля';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/^https?:\/\//, '') || 'ваш-домен.ru';
  const ogImage = isAbsoluteImageUrl(settings.og_home_image) ? settings.og_home_image : '';

  const [fontRegular, fontBold] = await Promise.all([
    loadFont('Garamond.ttf'),
    loadFont('Garamond-Bold.ttf'),
  ]);

  const hasImage = !!ogImage;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          backgroundColor: OG_COLORS.cream,
          padding: '60px 70px',
          fontFamily: 'Garamond',
        }}
      >
        {hasImage && (
          <img
            src={ogImage}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
        {hasImage && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.45), rgba(0,0,0,0.8))',
            }}
          />
        )}

        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            height: '100%',
            color: hasImage ? '#ffffff' : OG_COLORS.text,
            textShadow: hasImage ? '0 2px 8px rgba(0,0,0,0.7)' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: OG_COLORS.brown,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '22px',
                fontWeight: 700,
              }}
            >
              {getHotelInitial(hotelName)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {titleLogoSrc && <img src={titleLogoSrc} style={{ height: '36px', objectFit: 'contain' }} />}
              {subtitleLogoSrc && <img src={subtitleLogoSrc} style={{ height: '16px', objectFit: 'contain', opacity: 0.9 }} />}
              {!titleLogoSrc && <span style={{ fontSize: '28px' }}>{hotelName}</span>}
              {!subtitleLogoSrc && <span style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{hotelAddress}</span>}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              backgroundColor: 'rgba(0,0,0,0.55)',
              padding: '16px 20px',
              borderRadius: 12,
            }}
          >
            <div style={{ fontSize: '22px', color: OG_COLORS.gold, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              Категория
            </div>
            <div style={{ fontSize: '72px', fontWeight: 700, lineHeight: 1.1 }}>
              {label}
            </div>
            <div style={{ fontSize: '26px', maxWidth: '800px', opacity: 0.95 }}>
              Выберите номер и забронируйте онлайн
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `2px solid ${OG_COLORS.gold}`, paddingTop: '24px', fontSize: '18px', opacity: 0.9 }}>
            <span>{siteUrl}</span>
            <span>/{raw}</span>
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