import type { DbClient } from '../types/dbClient';
import { pool as localPgPool } from './db';
import { createPostgresFacade, type PostgresFacade } from './postgresFacade';

/**
 * Возвращает PostgREST-совместимый facade поверх нашего PostgreSQL.
 */
export function createDatabaseClient(): DbClient {
  if (!localPgPool) {
    throw new Error('DATABASE_URL kerak: backend faqat sizning PostgreSQL bazangiz bilan ishlaydi');
  }
  console.log('[db] PostgreSQL API facade initialized via DATABASE_URL');
  return createPostgresFacade(localPgPool) as unknown as DbClient;
}

export type { PostgresFacade };

export function isDatabaseTimeoutError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const name = 'name' in err ? String((err as { name?: unknown }).name) : '';
  const message = 'message' in err ? String((err as { message?: unknown }).message) : '';
  return (
    name === 'TimeoutError' ||
    name === 'AbortError' ||
    message.includes('timeout') ||
    message.includes('Headers Timeout') ||
    message.includes('UND_ERR_HEADERS_TIMEOUT')
  );
}
