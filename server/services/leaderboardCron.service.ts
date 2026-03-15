import type { SupabaseClient } from '@supabase/supabase-js';
import * as leaderboardService from './leaderboard.service';
import * as leaderboardCache from './leaderboardCache.service';

const CRON_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let cronTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Start cron: every 5 minutes recalculate leaderboard ranks and invalidate cache.
 */
export function startLeaderboardCron(supabase: SupabaseClient): void {
  if (cronTimer != null) return;
  async function tick() {
    try {
      await leaderboardService.recalculateRanks(supabase);
      await leaderboardCache.invalidateLeaderboardCache();
    } catch (e) {
      console.error('[leaderboardCron]', e);
    }
  }
  cronTimer = setInterval(tick, CRON_INTERVAL_MS);
  tick().catch((e) => console.error('[leaderboardCron] initial run', e));
}

/**
 * Stop cron (e.g. for tests or graceful shutdown).
 */
export function stopLeaderboardCron(): void {
  if (cronTimer != null) {
    clearInterval(cronTimer);
    cronTimer = null;
  }
}
