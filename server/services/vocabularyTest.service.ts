import type { Supabase } from '../types/vocabulary';
import * as repo from '../repositories/vocabularyRepository.js';
import { calculateImprovementDelta } from './scoringRules.service.js';

const MATCH_UNLOCK_PERCENT = 80;

/**
 * Finish test: update learned_words (only increase, never decrease),
 * award points, unlock match if percentage >= 80%.
 * Then recalc word group, subtopic, topic progress.
 */
export async function finishTest(
  supabase: Supabase,
  userId: number,
  wordGroupId: number,
  correctAnswers: number,
  totalQuestions: number
): Promise<{
  learned_words: number;
  percentage: number;
  points_awarded: number;
  match_unlocked: boolean;
}> {
  const group = await repo.getWordGroupById(supabase, wordGroupId);
  if (!group) throw new Error('Word group not found');

  const total = totalQuestions > 0 ? totalQuestions : group.total_words;
  const percentage = total > 0 ? (correctAnswers / total) * 100 : 0;

  let row = await repo.getProgressRowForWordGroup(supabase, userId, wordGroupId);
  if (!row) {
    await repo.getOrCreateUserWordGroupProgress(supabase, userId, wordGroupId, group.total_words);
    row = await repo.getProgressRowForWordGroup(supabase, userId, wordGroupId);
  }

  const previousLearned = row?.learned_words ?? 0;
  const previousBestCorrect = row?.test_best_correct ?? 0;
  const previousPassed = row?.test_passed ?? false;
  const testBestCorrect = Math.max(previousBestCorrect, correctAnswers);
  const newLearned = Math.max(previousLearned, Math.min(testBestCorrect, group.total_words));
  const matchUnlocked = (testBestCorrect / group.total_words) * 100 >= MATCH_UNLOCK_PERCENT;

  await repo.upsertUserWordGroupProgress(supabase, userId, wordGroupId, {
    learned_words: newLearned,
    total_words: group.total_words,
    test_best_correct: testBestCorrect,
    test_last_correct: Math.max(0, correctAnswers),
    test_last_incorrect: Math.max(0, total - correctAnswers),
    test_last_percentage: percentage,
    test_passed: previousPassed || percentage >= MATCH_UNLOCK_PERCENT,
    progress_percent: group.total_words > 0 ? (newLearned / group.total_words) * 100 : 0,
  });

  const pointsAwarded = calculateImprovementDelta(previousBestCorrect, testBestCorrect);
  if (pointsAwarded > 0) {
    const { data: user } = await supabase
      .from('users')
      .select('points, weekly_points, monthly_points, total_points')
      .eq('id', userId)
      .single();
    if (user) {
      const newTotal = (user.total_points ?? 0) + pointsAwarded;
      await supabase
        .from('users')
        .update({
          points: (user.points ?? 0) + pointsAwarded,
          weekly_points: (user.weekly_points ?? 0) + pointsAwarded,
          monthly_points: (user.monthly_points ?? 0) + pointsAwarded,
          total_points: newTotal,
        })
        .eq('id', userId);
      const leaderboardService = await import('./leaderboard.service.js');
      const leaderboardCache = await import('./leaderboardCache.service.js');
      await leaderboardService.ensureUserInLeaderboard(supabase, userId);
      await leaderboardService.updateUserPoints(supabase, userId, newTotal);
      await leaderboardCache.invalidateLeaderboardCache();
    }
  }

  return {
    learned_words: newLearned,
    percentage,
    points_awarded: pointsAwarded,
    match_unlocked: matchUnlocked,
  };
}
