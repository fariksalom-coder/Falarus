import type { Supabase } from '../types/vocabulary';
import * as repo from '../repositories/vocabularyRepository.js';
import { calculateCappedMatchPoints } from './scoringRules.service.js';
import { formatDateInAppTimezone } from '../lib/appDate.js';
import { buildPeriodicPointsUpdate } from '../../shared/leaderboardPeriods.js';
import { insertPointEvent } from '../../shared/pointEvents.js';

/**
 * Finish match pairs: award points, mark match_completed.
 * learned_words are NOT updated (only from Test).
 */
export async function finishMatch(
  supabase: Supabase,
  userId: number,
  wordGroupId: number,
  correctPairs: number
): Promise<{ success: boolean; points_awarded: number }> {
  const group = await repo.getWordGroupById(supabase, wordGroupId);
  if (!group) throw new Error('Word group not found');

  // Security cap: don't allow awarding more points than total pairs/words in the group.
  const existing = await repo.getOrCreateUserWordGroupProgress(
    supabase,
    userId,
    wordGroupId,
    group.total_words
  );
  const alreadyCompleted = existing?.match_completed === true;
  const pointsAwarded = calculateCappedMatchPoints(
    alreadyCompleted,
    correctPairs,
    group.total_words
  );

  await repo.upsertUserWordGroupProgress(supabase, userId, wordGroupId, {
    match_completed: true,
  });

  if (pointsAwarded > 0) {
    const today = formatDateInAppTimezone(new Date());
    const pointEventStatus = await insertPointEvent(supabase, {
      userId,
      points: pointsAwarded,
      source: 'vocabulary_match',
      sourceRef: `word_group:${wordGroupId}`,
      eventKey: `vocabulary_match:${userId}:${wordGroupId}:complete`,
      eventType: 'award',
      activityDate: today,
    });
    if (pointEventStatus !== 'duplicate') {
      const { data: user } = await supabase
        .from('users')
        .select('points, points_date, weekly_points, weekly_points_week_start, monthly_points, total_points')
        .eq('id', userId)
        .single();
      if (user) {
        const nextPoints = buildPeriodicPointsUpdate(user, pointsAwarded, today);
        await supabase
          .from('users')
          .update(nextPoints)
          .eq('id', userId);
        const leaderboardService = await import('./leaderboard.service.js');
        const leaderboardCache = await import('./leaderboardCache.service.js');
        await leaderboardService.ensureUserInLeaderboard(supabase, userId);
        await leaderboardService.updateUserPoints(supabase, userId, nextPoints.total_points);
        await leaderboardCache.invalidateLeaderboardCache();
      }
    }
  }

  return { success: true, points_awarded: pointsAwarded };
}
