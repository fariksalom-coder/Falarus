import { supabase } from './supabase.js';

/**
 * Add points to users (points, weekly, monthly, total) and sync leaderboard.
 * Used by lesson_task_results delta and anywhere we need the same rules as Express.
 */
export async function awardUserPoints(userId: number, delta: number): Promise<void> {
  if (delta <= 0) return;
  const { data: user, error } = await supabase
    .from('users')
    .select('points, weekly_points, monthly_points, total_points')
    .eq('id', userId)
    .single();
  if (error || !user) {
    console.error('[awardUserPoints] user fetch', error?.message);
    return;
  }
  const newTotal = (user.total_points ?? 0) + delta;
  const { error: upErr } = await supabase
    .from('users')
    .update({
      points: (user.points ?? 0) + delta,
      weekly_points: (user.weekly_points ?? 0) + delta,
      monthly_points: (user.monthly_points ?? 0) + delta,
      total_points: newTotal,
    })
    .eq('id', userId);
  if (upErr) {
    console.error('[awardUserPoints] update', upErr.message);
    return;
  }
  try {
    const leaderboardService = await import('../../server/services/leaderboard.service.js');
    const leaderboardCache = await import('../../server/services/leaderboardCache.service.js');
    await leaderboardService.ensureUserInLeaderboard(supabase, userId);
    await leaderboardService.updateUserPoints(supabase, userId, newTotal);
    await leaderboardCache.invalidateLeaderboardCache();
  } catch (e) {
    console.error('[awardUserPoints] leaderboard', e);
  }
}
