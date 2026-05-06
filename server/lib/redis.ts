/**
 * Optional Redis client for caching vocabulary progress.
 * If REDIS_URL is not set, all cache methods no-op.
 */

const REDIS_URL = process.env.REDIS_URL;
const CACHE_TTL_SEC = 5 * 60; // 5 minutes

let client: import('ioredis').Redis | null = null;

export async function getRedis(): Promise<import('ioredis').Redis | null> {
  if (!REDIS_URL) return null;
  if (client) return client;
  try {
    const { default: Redis } = await import('ioredis');
    client = new Redis(REDIS_URL, { maxRetriesPerRequest: 2 });
    client.on('error', () => {});
    return client;
  } catch {
    return null;
  }
}

export function cacheKeyTopics(userId: number): string {
  return `user_topics_progress:${userId}`;
}

export function cacheKeySubtopics(userId: number, topicId: string): string {
  return `user_subtopics_progress:${userId}:${topicId}`;
}

export function cacheKeyWordGroups(userId: number, subtopicId: string): string {
  return `user_wordgroups_progress:${userId}:${subtopicId}`;
}

export const LEADERBOARD_CACHE_KEY = 'leaderboard_top_100';
export const LEADERBOARD_CACHE_TTL_SEC = 60;

export async function getCached<T>(key: string): Promise<T | null> {
  const redis = await getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setCached(key: string, value: unknown, ttlSec: number = CACHE_TTL_SEC): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;
  try {
    await redis.setex(key, ttlSec, JSON.stringify(value));
  } catch {}
}

/**
 * Cursor-based scan that does NOT block Redis. Equivalent to KEYS but
 * iterates in O(N) chunks of `count` keys (default 200) instead of
 * scanning the entire keyspace in a single blocking call.
 *
 * Why this matters: with 100k active users we expect ~100k * a few
 * vocab subtopics in Redis. A naive `KEYS user_subtopics_progress:*`
 * blocks the Redis event loop for hundreds of milliseconds, freezing
 * every other operation (rate limit checks, cached leaderboard, etc).
 */
async function scanKeys(
  redis: import('ioredis').Redis,
  pattern: string,
  count = 200
): Promise<string[]> {
  const keys: string[] = [];
  let cursor = '0';
  do {
    const [next, batch] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', count);
    cursor = next;
    if (batch.length) keys.push(...batch);
  } while (cursor !== '0');
  return keys;
}

export async function invalidateUserVocabularyCache(userId: number): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;
  try {
    await redis.del(cacheKeyTopics(userId));
    const subtopicKeys = await scanKeys(redis, `user_subtopics_progress:${userId}:*`);
    const wordGroupKeys = await scanKeys(redis, `user_wordgroups_progress:${userId}:*`);
    if (subtopicKeys.length + wordGroupKeys.length > 0) {
      // Single user's keys fit comfortably in one DEL call (a handful of
      // subtopics * tens of word groups = tens to low hundreds of keys).
      await redis.del(...subtopicKeys, ...wordGroupKeys);
    }
  } catch {}
}
