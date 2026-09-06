import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { getDB } from '@/db';
import { buildSafe } from './build-safe';

// Тег 'rooms' — admin-роуты amenities/* инвалидируют именно его (не заводили
// отдельный тег 'amenities'), поэтому кэшируем под тем же тегом.
export const getAllAmenities = cache(
  unstable_cache(
    async () => buildSafe(() => getDB().amenities.getAllAmenities(), []),
    ['all-amenities'],
    { tags: ['rooms'] }
  )
);
