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

export async function invalidateUserVocabularyCache(userId: number): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;
  try {
    await redis.del(cacheKeyTopics(userId));
    const subtopicKeys = await redis.keys(`user_subtopics_progress:${userId}:*`);
    const wordGroupKeys = await redis.keys(`user_wordgroups_progress:${userId}:*`);
    if (subtopicKeys.length + wordGroupKeys.length > 0) {
      await redis.del(...subtopicKeys, ...wordGroupKeys);
    }
  } catch {}
}
