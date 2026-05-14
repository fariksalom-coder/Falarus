/**
 * In-process cron via node-cron, with a Redis-backed distributed lock so
 * it stays safe under horizontal scaling.
 *
 * Background: cron jobs used to be triggered by `vercel.json` cron entries
 * that fired the HTTP endpoints `/api/cron/click-auto-pay` and
 * `/api/cron/click-fiscal-retry`. After dropping Vercel there is no
 * external scheduler, so payments were not auto-renewing and fiscalization
 * retries were not running.
 *
 * Why this design:
 *   - **In-process** so there's no extra Railway/Render service to provision.
 *   - **Off by default** — gated on `ENABLE_INTERNAL_CRON=1` so test/dev
 *     runs don't spam payment retries against prod data.
 *   - **Redis lock** — every replica fires the schedule, but only the
 *     replica that wins the `SET NX EX` race actually runs the job. No
 *     Redis = assume single replica and just run.
 *   - **Independent failures** — one job throwing must not crash Express.
 */

import cron from 'node-cron';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getRedis } from './redis.js';
import { logError, logInfo } from './logger.js';
import { runClickAutoRenewalCron } from '../services/clickCardToken.service.js';
import { runClickFiscalRetryCron } from '../services/clickFiscal.service.js';

type JobName = 'click-auto-pay' | 'click-fiscal-retry';

/**
 * Try to acquire a distributed lock. Returns true if WE own the slot for
 * the next `ttlSec`. Falls back to true when Redis isn't configured —
 * the assumption is single-replica dev.
 */
async function tryAcquireLock(name: JobName, ttlSec: number): Promise<boolean> {
  const redis = await getRedis();
  if (!redis) return true;
  try {
    const key = `cron-lock:${name}`;
    const got = await redis.set(key, '1', 'EX', ttlSec, 'NX');
    return got === 'OK';
  } catch (err) {
    // If Redis fails, prefer running the job over silently skipping —
    // payments retry job is idempotent (status-guarded inside service).
    logError('cron.lock_failed', err as Error, { job: name });
    return true;
  }
}

async function runJobSafely(
  name: JobName,
  ttlSec: number,
  run: () => Promise<unknown>
): Promise<void> {
  const start = Date.now();
  const owns = await tryAcquireLock(name, ttlSec);
  if (!owns) {
    logInfo('cron.skipped', { job: name, reason: 'lock_taken' });
    return;
  }
  try {
    const result = await run();
    logInfo('cron.ok', { job: name, durationMs: Date.now() - start, result });
  } catch (err) {
    logError('cron.failed', err as Error, { job: name, durationMs: Date.now() - start });
  }
}

/**
 * Start the internal scheduler. Idempotent — safe to call once during
 * server bootstrap. Returns `true` if scheduling was activated, `false`
 * if disabled by env (so caller can log it).
 */
export function startInternalCron(supabase: SupabaseClient): boolean {
  if (process.env.ENABLE_INTERNAL_CRON !== '1') return false;

  // Click auto-renewal — every 15 minutes (matches the old vercel.json
  // schedule `15 * * * *` semantics, but in standard cron that means
  // "at minute 15 of every hour". The previous Vercel cron actually
  // used "*/15 * * * *" per docs; we follow the docs.)
  cron.schedule('*/15 * * * *', () => {
    void runJobSafely('click-auto-pay', 10 * 60, () => runClickAutoRenewalCron(supabase));
  });

  // Click fiscal retry — every hour at :45 (same as vercel.json).
  cron.schedule('45 * * * *', () => {
    void runJobSafely('click-fiscal-retry', 30 * 60, () => runClickFiscalRetryCron(supabase));
  });

  return true;
}
