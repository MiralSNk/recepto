import 'server-only';
import { unstable_cache } from 'next/cache';
import { getDB } from '@/db';
import { buildSafe } from './build-safe';

export const getPalette = unstable_cache(
  async () =>
    buildSafe(async () => {
      const db = getDB();
      const palette = await db.siteSettings.getSetting('palette');
      return palette || {};
    }, {}),
  ['palette'],
  { tags: ['palette'] }
);