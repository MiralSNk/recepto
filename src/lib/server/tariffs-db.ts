import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { getDB } from '@/db';
import { buildSafe } from './build-safe';

// Тег 'pricing' — admin-роуты /api/admin/tariffs и /api/admin/pricing
// инвалидируют его при любой мутации тарифов/формулы.
export const getAllTariffs = cache(
  unstable_cache(
    async () => buildSafe(() => getDB().tariffs.getAllTariffs(), []),
    ['all-tariffs'],
    { tags: ['pricing'] }
  )
);
