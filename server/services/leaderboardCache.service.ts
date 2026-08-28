import { getRedis, LEADERBOARD_CACHE_KEY } from '../lib/redis.js';

/**
 * Invalidate leaderboard cache (e.g. after rank recalc or after points update).
 */
export async function invalidateLeaderboardCache(): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;
  try {
    await redis.del(LEADERBOARD_CACHE_KEY);
  } catch {}
}
