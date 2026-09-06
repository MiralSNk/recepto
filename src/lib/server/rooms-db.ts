import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { getDB } from '@/db';
import type { Room } from '@/types';
import { buildSafe } from './build-safe';

// unstable_cache — межзапросный кэш, инвалидируется тегом 'rooms' из admin-роутов
// (rooms/categories/amenities CRUD), поэтому правки применяются сразу после
// сохранения, а не по таймауту. cache() поверх — дедупликация в рамках одного
// рендера (generateMetadata + тело страницы иначе делают одинаковый запрос дважды).
export const getRoomsByCategory = cache(
  unstable_cache(
    async (category: string, minGuest = 0): Promise<Room[]> =>
      buildSafe(() => getDB().rooms.getRoomsByCategory(category, minGuest), []),
    ['rooms-by-category'],
    { tags: ['rooms'] }
  )
);

export const getRoomById = cache(
  unstable_cache(
    async (id: number): Promise<Room | undefined> =>
      buildSafe(() => getDB().rooms.getRoomById(id), undefined),
    ['room-by-id'],
    { tags: ['rooms'] }
  )
);

export const getAllRooms = cache(
  unstable_cache(
    async (): Promise<Room[]> => buildSafe(() => getDB().rooms.getAllRooms(), []),
    ['all-rooms'],
    { tags: ['rooms'] }
  )
);
