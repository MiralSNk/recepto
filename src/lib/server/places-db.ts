import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { getDB } from '@/db';
import { buildSafe } from './build-safe';

// Тег 'places' — уже инвалидируют admin-роуты places/place-categories.
export const getPlaces = cache(
  unstable_cache(
    async () => buildSafe(() => getDB().places.getPlaces(), []),
    ['visible-places'],
    { tags: ['places'] }
  )
);
