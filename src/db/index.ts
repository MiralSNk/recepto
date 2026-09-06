import 'server-only';
import { createMySQLAdapter } from './mysql';
import type { IDatabaseAdapter } from './repositories/database-adapter';

let adapter: IDatabaseAdapter | null = null;

/**
 * Получить единственный экземпляр адаптера БД.
 */
export function getDB(): IDatabaseAdapter {
  if (!adapter) {
    adapter = createMySQLAdapter();
  }
  return adapter;
}

export * from './repositories';
export { createMySQLAdapter } from './mysql';