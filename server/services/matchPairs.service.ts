import type { Supabase } from '../types/vocabulary';
import * as repo from '../repositories/vocabularyRepository';

/**
 * Finish match pairs: award points, mark match_completed.
 * learned_words are NOT updated (only from Test).
 */
export async function finishMatch(
  supabase: Supabase,
  userId: number,
  wordGroupId: number,
  pointsAwarded: number
): Promise<{ success: boolean; points_awarded: number }> {
  const group = await repo.getWordGroupById(supabase, wordGroupId);
  if (!group) throw new Error('Word group not found');

  await repo.getOrCreateUserWordGroupProgress(supabase, userId, wordGroupId, group.total_words);
  await repo.upsertUserWordGroupProgress(supabase, userId, wordGroupId, {
    match_completed: true,
  });

  if (pointsAwarded > 0) {
    const { data: user } = await supabase
      .from('users')
      .select('points, weekly_points, monthly_points, total_points')
      .eq('id', userId)
      .single();
    if (user) {
      await supabase
        .from('users')
        .update({
          points: (user.points ?? 0) + pointsAwarded,
          weekly_points: (user.weekly_points ?? 0) + pointsAwarded,
          monthly_points: (user.monthly_points ?? 0) + pointsAwarded,
          total_points: (user.total_points ?? 0) + pointsAwarded,
        })
        .eq('id', userId);
    }
  }

  return { success: true, points_awarded: pointsAwarded };
}
