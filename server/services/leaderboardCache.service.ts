import type { SupabaseClient } from '@supabase/supabase-js';
import { getCached, setCached, getRedis, LEADERBOARD_CACHE_KEY, LEADERBOARD_CACHE_TTL_SEC } from '../lib/redis.js';
import * as leaderboardService from './leaderboard.service.js';

/**
 * Get top 100 leaderboard: from Redis if present, else from PostgreSQL and cache 60s.
 */
export async function getTop100Cached(
  supabase: SupabaseClient
): Promise<leaderboardService.LeaderboardEntry[]> {
  const cached = await getCached<leaderboardService.LeaderboardEntry[]>(LEADERBOARD_CACHE_KEY);
  if (cached != null) return cached;
  const list = await leaderboardService.getTop100(supabase);
  await setCached(LEADERBOARD_CACHE_KEY, list, LEADERBOARD_CACHE_TTL_SEC);
  return list;
}

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
