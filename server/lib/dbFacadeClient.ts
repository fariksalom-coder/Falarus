import type { DbClient } from '../types/dbClient';
import { pool as localPgPool } from './db';
import { createPostgresFacade, type PostgresFacade } from './postgresFacade';

/**
 * Унифицированный экспорт PostgREST-совместимого API для backend-кода.
 * .from(), .rpc() и .storage работают через PostgreSQL + локальную папку uploads/storage.
 */

declare global {
  // eslint-disable-next-line no-var
  var __dbFacadeClient: DbClient | PostgresFacade | undefined;
}

function getClient(): DbClient | PostgresFacade {
  if (globalThis.__dbFacadeClient) return globalThis.__dbFacadeClient;
  if (!localPgPool) {
    throw new Error('DATABASE_URL kerak: backend faqat sizning PostgreSQL bazangiz bilan ishlaydi');
  }
  console.log('[db] Using PostgreSQL API facade (DATABASE_URL is set)');
  globalThis.__dbFacadeClient = createPostgresFacade(localPgPool);
  return globalThis.__dbFacadeClient;
}

export const supabase = new Proxy({} as DbClient, {
  get(_, prop) {
    const client = getClient() as unknown as Record<string, unknown>;
    const value = client[prop as string];
    return typeof value === 'function' ? (value as Function).bind(client) : value;
  },
});
