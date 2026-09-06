import 'server-only';
import { getDB } from '@/db';
import type { Room } from '@/types';
import { buildSafe } from './build-safe';

export async function getRoomForOG(id: number): Promise<Room | null> {
  return buildSafe(async () => {
    const db = getDB();
    const room = await db.rooms.getRoomById(id); // используем публичный метод
    return room ?? null;
  }, null);
}