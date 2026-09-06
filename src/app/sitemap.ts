import type { MetadataRoute } from 'next';
import { getAllRooms } from '@/lib/server/rooms-db';
import { getVisibleCategories } from '@/lib/server/categories-db';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
  'https://example.com';

const LAST_MODIFIED = new Date('2026-08-01T00:00:00.000Z');

/**
 * Генерация sitemap.xml.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, allRooms] = await Promise.all([
    getVisibleCategories(),
    getAllRooms(),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: LAST_MODIFIED,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/contacts`,
      lastModified: LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: LAST_MODIFIED,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  const categoryPages: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${SITE_URL}/${c.key}`,
    lastModified: LAST_MODIFIED,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }));

  const roomPages: MetadataRoute.Sitemap = allRooms.map((room) => ({
    url: `${SITE_URL}/${room.category}/${room.id}`,
    lastModified: LAST_MODIFIED,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...categoryPages, ...roomPages];
}