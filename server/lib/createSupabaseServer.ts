import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { pool as localPgPool } from './db';
import { createSupabaseShim, type SupabaseShim } from './supabaseShim';

const DEFAULT_FETCH_TIMEOUT_MS = 12_000;

/**
 * Возвращает Supabase-совместимый клиент. Если в env задан DATABASE_URL и pg pool
 * успешно создан — возвращается локальный shim (запросы идут в локальную PG через
 * node-postgres, .storage всё ещё проксируется на настоящий supabase-js). Иначе —
 * настоящий supabase-js client с ограниченным fetch timeout, чтобы nginx не висел
 * на 504 пока undici ждёт 30+ секунд.
 */
export function createSupabaseServer(url: string, serviceRoleKey: string): SupabaseClient {
  if (localPgPool) {
    console.log('[Supabase] createSupabaseServer → local PG shim (DATABASE_URL is set)');
    return createSupabaseShim(localPgPool) as unknown as SupabaseClient;
  }

  const timeoutMs = Math.max(
    3_000,
    Number(process.env.SUPABASE_FETCH_TIMEOUT_MS || DEFAULT_FETCH_TIMEOUT_MS)
  );

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (input, init) => {
        const signal =
          init?.signal ??
          AbortSignal.timeout(timeoutMs);
        return fetch(input, { ...init, signal });
      },
    },
  });
}

export type { SupabaseShim };

export function isSupabaseTimeoutError(err: unknown): boolean {
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
