/**
 * Optional Redis client for caching vocabulary progress.
 * If REDIS_URL is not set, all cache methods no-op.
 */

const REDIS_URL = process.env.REDIS_URL;

let client: import('ioredis').Redis | null = null;

export async function getRedis(): Promise<import('ioredis').Redis | null> {
  if (!REDIS_URL) return null;
  if (client) return client;
  try {
    const { default: Redis } = await import('ioredis');
    client = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 2,
      connectTimeout: 5_000,
      commandTimeout: 4_000,
    });
    client.on('error', () => {});
    return client;
  } catch {
    return null;
  }
}

export const LEADERBOARD_CACHE_KEY = 'leaderboard_top_100';
