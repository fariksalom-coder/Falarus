import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_FETCH_TIMEOUT_MS = 12_000;

/**
 * Server Supabase client with bounded HTTP timeouts so nginx does not sit on
 * 504 while PostgREST/undici waits ~30s+ for headers.
 */
export function createSupabaseServer(url: string, serviceRoleKey: string): SupabaseClient {
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
