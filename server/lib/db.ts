/**
 * PostgreSQL клиент через Kysely/node-postgres. Backend работает только через
 * DATABASE_URL вашей БД.
 *
 * Типы таблиц генерируем через kysely-codegen (см. README ниже в файле).
 */
import { Kysely, PostgresDialect } from 'kysely';
import { Pool, types as pgTypes } from 'pg';

/**
 * Подстраиваем pg parsers под форму данных, которую ожидает текущий API facade:
 *   • TIMESTAMP / TIMESTAMPTZ → строки (ISO), а не Date — иначе сломаются
 *     лексические сравнения вида `row.created_at > now.toISOString()`.
 *   • BIGINT (int8) → number — иначе сломаются `user1_id === userId`.
 *     Безопасно пока ID не превысят Number.MAX_SAFE_INTEGER (9e15);
 *     для масштаба этого приложения — с огромным запасом.
 *   • NUMERIC → number — для денежных значений и баллов.
 */
pgTypes.setTypeParser(pgTypes.builtins.INT8, (val: string) => parseInt(val, 10));
pgTypes.setTypeParser(pgTypes.builtins.TIMESTAMP, (val: string) => val);
pgTypes.setTypeParser(pgTypes.builtins.TIMESTAMPTZ, (val: string) => val);
pgTypes.setTypeParser(pgTypes.builtins.NUMERIC, (val: string) => parseFloat(val));

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
  console.error('[db] DATABASE_URL not set — PostgreSQL connection is disabled');
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
