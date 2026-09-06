import 'server-only';
import { createMySQLPool } from './connection';
import { MySQLAdapter } from './adapter';
import type { IDatabaseAdapter } from '@/db/repositories/database-adapter';

/**
 * Фабрика для создания MySQL-адаптера.
 */
export function createMySQLAdapter(env = process.env): IDatabaseAdapter {
  const pool = createMySQLPool(env);
  return new MySQLAdapter(pool);
}

export * from './adapter';
export * from './connection';
export * from './repositories/category-repository';
export * from './repositories/room-repository';
export * from './repositories/user-repository';
export * from './repositories/booking-repository';
export * from './repositories/chat-repository';
export * from './repositories/place-repository';
export * from './repositories/site-settings-repository';
export * from './repositories/amenity-repository';
export * from './repositories/place-category-repository';
export * from './repositories/unanswered-query-repository';