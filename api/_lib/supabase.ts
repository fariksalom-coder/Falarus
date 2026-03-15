import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Singleton Supabase client for serverless (Vercel).
 * Uses globalThis so the same instance is reused across warm invocations
 * and we avoid creating a new client per request.
 */
declare global {
  // eslint-disable-next-line no-var
  var __supabaseClient: SupabaseClient | undefined;
}

function getSupabaseClient(): SupabaseClient {
  if (globalThis.__supabaseClient) return globalThis.__supabaseClient;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    const msg = 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment';
    console.error('[Supabase]', msg);
    throw new Error(msg);
  }
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  globalThis.__supabaseClient = client;
  return client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const client = getSupabaseClient() as unknown as Record<string, unknown>;
    const value = client[prop as string];
    return typeof value === 'function' ? (value as Function).bind(getSupabaseClient()) : value;
  },
});
