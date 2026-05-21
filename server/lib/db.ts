/**
 * Локальный PostgreSQL клиент через Kysely. Активируется, когда задан DATABASE_URL.
 * Когда DATABASE_URL не задан — экспорты `db` и `pool` равны `null`, и весь код
 * продолжает работать через `supabaseClient.ts` (старый путь).
 *
 * Это намеренный feature-flag на время миграции Supabase → локальная PG:
 *   - На проде сначала добавляем DATABASE_URL в .env, но шим ещё не задействован → ничего не меняется.
 *   - На следующем шаге пишем shim, который проверяет `hasLocalDb` и маршрутизирует запросы сюда.
 *   - После проверки — удаляем supabase-js полностью.
 *
 * Типы таблиц генерируем через kysely-codegen (см. README ниже в файле).
 */
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

/**
 * Интерфейс схемы БД. Пока — placeholder. Сгенерировать актуальные типы:
 *
 *   DATABASE_URL=postgresql://falarus:PASSWORD@localhost:5432/falarus_db \
 *     npx kysely-codegen --dialect postgres --out-file server/lib/db-types.ts
 *
 * И заменить этот интерфейс на:
 *   export type { DB as Database } from './db-types';
 */
export interface Database {
  [tableName: string]: Record<string, unknown>;
}

const connectionString = process.env.DATABASE_URL?.trim();

export const pool: Pool | null = connectionString
  ? new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    })
  : null;

pool?.on('error', (err) => {
  console.error('[db] pg pool error:', err);
});

export const db: Kysely<Database> | null = pool
  ? new Kysely<Database>({ dialect: new PostgresDialect({ pool }) })
  : null;

export const hasLocalDb = db !== null;

if (hasLocalDb) {
  console.log('[db] Local PostgreSQL pool initialized via DATABASE_URL');
} else {
  console.log('[db] DATABASE_URL not set — local DB disabled, using Supabase only');
}

async function shutdown() {
  if (db) {
    try {
      await db.destroy();
    } catch (err) {
      console.error('[db] error during pool shutdown:', err);
    }
  }
}

process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
