import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { pool as localPgPool } from './db';
import { createSupabaseShim, type SupabaseShim } from './supabaseShim';

/**
 * Унифицированный экспорт `supabase` для backend-кода. Под капотом — два режима:
 *
 *   1. Локальный PostgreSQL через shim (когда задан DATABASE_URL).
 *      .from(), .rpc() идут в локальную БД через node-postgres pool.
 *      .storage всё ещё проксируется на настоящий supabase-js, потому что
 *      бакеты `payment-proofs` и `help-chat-media` пока живут в Supabase.
 *
 *   2. Настоящий supabase-js (когда DATABASE_URL не задан).
 *      Старый путь — всё через Supabase Cloud. Используется как fallback.
 *
 * Переключение — только переменной окружения, никаких изменений в вызывающем коде.
 * Чтобы откатить: убрать DATABASE_URL из .env и сделать pm2 restart --update-env.
 */

declare global {
  // eslint-disable-next-line no-var
  var __supabaseClient: SupabaseClient | SupabaseShim | undefined;
}

function buildRealClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    const msg = 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment';
    console.error('[Supabase]', msg);
    throw new Error(msg);
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function getClient(): SupabaseClient | SupabaseShim {
  if (globalThis.__supabaseClient) return globalThis.__supabaseClient;
  if (localPgPool) {
    console.log('[Supabase] Using local PostgreSQL shim (DATABASE_URL is set)');
    globalThis.__supabaseClient = createSupabaseShim(localPgPool);
  } else {
    console.log('[Supabase] Using real Supabase client (DATABASE_URL not set)');
    globalThis.__supabaseClient = buildRealClient();
  }
  return globalThis.__supabaseClient;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const client = getClient() as unknown as Record<string, unknown>;
    const value = client[prop as string];
    return typeof value === 'function' ? (value as Function).bind(client) : value;
  },
});
