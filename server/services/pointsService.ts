import type { Supabase } from '../types/progress';
import * as leaderboardService from './leaderboard.service';
import * as leaderboardCache from './leaderboardCache.service';

const USERS = 'users';

/**
 * Points = correct_answers (one point per correct answer).
 */
export function calculatePoints(correctAnswers: number): number {
  return Math.max(0, Math.floor(correctAnswers));
}

/**
 * Add points to user's total_points and sync leaderboard table + invalidate cache.
 */
export async function updateUserTotalPoints(
  supabase: Supabase,
  userId: number,
  pointsToAdd: number
): Promise<void> {
  if (pointsToAdd <= 0) return;
  const { data: user, error: fetchErr } = await supabase
    .from(USERS)
    .select('total_points')
    .eq('id', userId)
    .single();
  if (fetchErr || user == null) throw new Error('User not found');
  const newTotal = (user.total_points ?? 0) + pointsToAdd;
  const { error: updateErr } = await supabase
    .from(USERS)
    .update({ total_points: newTotal })
    .eq('id', userId);
  if (updateErr) throw updateErr;
  await leaderboardService.ensureUserInLeaderboard(supabase, userId);
  await leaderboardService.updateUserPoints(supabase, userId, newTotal);
  await leaderboardCache.invalidateLeaderboardCache();
}
