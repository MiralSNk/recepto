import type { MetadataRoute } from 'next';
import { getSiteSettings } from '@/lib/server/seo';
import { getPalette } from '@/lib/server/palette';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const [settings, palette] = await Promise.all([getSiteSettings(), getPalette()]);
  const hotelName = settings.hotel_name || 'Название вашего отеля';

  return {
    name: hotelName,
    short_name: hotelName.replace(/^Отель\s*/i, '').replace(/[«»]/g, ''),
    description: settings.site_description || 'Уютный отель: комфортные номера и внимательный сервис.',
    start_url: '/',
    display: 'standalone',
    background_color: palette['color-pr-warm'] || '#F5F0E8',
    theme_color: palette['color-pr-brown'] || '#173f35',
    lang: 'ru',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
