import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { getDB } from '@/db';
import type { AdminCategory } from '@/types';
import { buildSafe } from './build-safe';

// См. комментарий в rooms-db.ts: unstable_cache (тег 'categories', тот же, что
// уже инвалидируют admin-роуты категорий/номеров) + cache() для дедупликации
// внутри одного рендера.
export const getVisibleCategories = cache(
  unstable_cache(
    async (): Promise<Pick<AdminCategory, 'key' | 'label' | 'sort_order' | 'max_guests'>[]> =>
      buildSafe(() => getDB().categories.getVisibleCategories(), []),
    ['visible-categories'],
    { tags: ['categories'] }
  )
);

export const isValidCategory = cache(
  unstable_cache(
    async (key: string): Promise<boolean> =>
      buildSafe(() => getDB().categories.isValidCategory(key), false),
    ['is-valid-category'],
    { tags: ['categories'] }
  )
);

export const getCategoryLabel = cache(
  unstable_cache(
    async (key: string): Promise<string> =>
      buildSafe(() => getDB().categories.getCategoryLabel(key), ''),
    ['category-label'],
    { tags: ['categories'] }
  )
);
