import type { Supabase } from '../types/vocabulary';
import * as repo from '../repositories/vocabularyRepository';
import * as progressCache from './progressCache.service';

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

  const previousLearned = (row?.learned_words ?? 0);
  const newLearned = Math.max(previousLearned, Math.min(correctAnswers, group.total_words));
  const testBestCorrect = Math.max(row?.test_best_correct ?? 0, correctAnswers);
  const matchUnlocked = (testBestCorrect / group.total_words) * 100 >= MATCH_UNLOCK_PERCENT;

  await repo.upsertUserWordGroupProgress(supabase, userId, wordGroupId, {
    learned_words: newLearned,
    total_words: group.total_words,
    test_best_correct: testBestCorrect,
    progress_percent: group.total_words > 0 ? (newLearned / group.total_words) * 100 : 0,
  });

  await progressCache.updateSubtopicProgress(supabase, userId, group.subtopic_id);
  const subtopicRow = await supabase
    .from('vocabulary_subtopics')
    .select('topic_id')
    .eq('id', group.subtopic_id)
    .single();
  if (subtopicRow?.data?.topic_id) {
    await progressCache.updateTopicProgress(supabase, userId, subtopicRow.data.topic_id);
  }

  const pointsAwarded = correctAnswers;
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
      const leaderboardService = await import('./leaderboard.service');
      const leaderboardCache = await import('./leaderboardCache.service');
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
