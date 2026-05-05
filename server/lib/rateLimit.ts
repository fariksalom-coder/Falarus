/**
 * Per-key rate limiter (sliding window).
 *
 * Uses Redis when REDIS_URL is set so the limit is enforced across all
 * server instances and Vercel functions. Falls back to an in-memory
 * Map otherwise — fine for local dev, NOT safe in production behind a
 * load balancer because each replica gets its own counter.
 *
 * Algorithm: fixed-second buckets in Redis (`INCR` + `EXPIRE`). Cheap,
 * atomic, no Lua, and good enough for AI/auth abuse protection. We
 * trade off micro-burstiness at bucket boundaries for simplicity.
 */

import { getRedis } from './redis.js';

export type RateLimitResult =
  | { allowed: true; remaining: number; resetMs: number }
  | { allowed: false; retryAfterSec: number };

type MemoryEntry = { count: number; resetAt: number };
const memoryStore = new Map<string, MemoryEntry>();
const MEMORY_MAX_KEYS = 5000;

function memoryEvictIfNeeded(now: number): void {
  if (memoryStore.size < MEMORY_MAX_KEYS) return;
  for (const [k, v] of memoryStore) {
    if (v.resetAt <= now) memoryStore.delete(k);
  }
  if (memoryStore.size < MEMORY_MAX_KEYS) return;
  // still too big — drop oldest (Map iteration is insertion order)
  const dropCount = Math.ceil(MEMORY_MAX_KEYS * 0.1);
  let i = 0;
  for (const k of memoryStore.keys()) {
    if (i++ >= dropCount) break;
    memoryStore.delete(k);
  }
}

function memoryHit(key: string, limit: number, windowSec: number): RateLimitResult {
  const now = Date.now();
  memoryEvictIfNeeded(now);
  const existing = memoryStore.get(key);
  if (!existing || existing.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { allowed: true, remaining: limit - 1, resetMs: windowSec * 1000 };
  }
  existing.count += 1;
  if (existing.count > limit) {
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
  }
  return { allowed: true, remaining: limit - existing.count, resetMs: existing.resetAt - now };
}

export async function rateLimit(
  bucketKey: string,
  limit: number,
  windowSec: number
): Promise<RateLimitResult> {
  const redis = await getRedis();
  if (!redis) return memoryHit(bucketKey, limit, windowSec);

  try {
    const redisKey = `rl:${bucketKey}`;
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, windowSec);
    }
    if (count > limit) {
      const ttl = await redis.ttl(redisKey);
      const retry = ttl > 0 ? ttl : windowSec;
      return { allowed: false, retryAfterSec: retry };
    }
    return { allowed: true, remaining: limit - count, resetMs: windowSec * 1000 };
  } catch {
    // Redis blip — fall back to memory rather than failing open without any cap.
    return memoryHit(bucketKey, limit, windowSec);
  }
}

/**
 * Convenience wrapper for an Express handler. Sets standard headers and
 * returns 429 when over the limit. Caller should NOT continue if `false`
 * is returned.
 *
 *   if (!(await enforceRateLimit(res, `ai:check:${userId}`, 30, 60))) return;
 */
export async function enforceRateLimit(
  res: { status: (code: number) => { json: (body: unknown) => unknown }; setHeader: (k: string, v: string) => void },
  bucketKey: string,
  limit: number,
  windowSec: number,
  message: string = "So'rovlar soni oshib ketdi. Keyinroq qayta urinib ko'ring."
): Promise<boolean> {
  const result = await rateLimit(bucketKey, limit, windowSec);
  res.setHeader('X-RateLimit-Limit', String(limit));
  if (result.allowed === true) {
    res.setHeader('X-RateLimit-Remaining', String(result.remaining));
    return true;
  }
  const retry = result.retryAfterSec;
  res.setHeader('Retry-After', String(retry));
  res.setHeader('X-RateLimit-Remaining', '0');
  res.status(429).json({ error: message, retry_after: retry });
  return false;
}
