import { supabase } from './supabase.js';
import {
  ensureUserInLeaderboard,
  updateUserPoints as updateLeaderboardUserPoints,
} from './leaderboard.js';
import { formatDateInAppTimezone } from './appDate.js';
import { buildPeriodicPointsUpdate } from '../../shared/leaderboardPeriods.js';
import { insertPointEvent } from '../../shared/pointEvents.js';

type AwardUserPointsOptions = {
  source?: string;
  sourceRef?: string | null;
  eventKey?: string | null;
};

/**
 * Add points to users (points, weekly, monthly, total) and sync leaderboard.
 * Used by lesson_task_results delta and anywhere we need the same rules as Express.
 */
export async function awardUserPoints(
  userId: number,
  delta: number,
  options: AwardUserPointsOptions = {}
): Promise<void> {
  if (delta <= 0) return;
  const today = formatDateInAppTimezone(new Date());
  try {
    const pointEventStatus = await insertPointEvent(supabase, {
      userId,
      points: delta,
      source: options.source ?? 'award_user_points',
      sourceRef: options.sourceRef,
      eventKey: options.eventKey,
      eventType: 'award',
      activityDate: today,
    });
    if (pointEventStatus === 'duplicate') return;
  } catch (pointEventError) {
    console.error('[awardUserPoints] point event', pointEventError);
  }
  const { data: user, error } = await supabase
    .from('users')
    .select('points, points_date, weekly_points, weekly_points_week_start, monthly_points, total_points')
    .eq('id', userId)
    .single();
  if (error || !user) {
    console.error('[awardUserPoints] user fetch', error?.message);
    return;
  }
  const nextPoints = buildPeriodicPointsUpdate(user, delta, today);
  const { error: upErr } = await supabase
    .from('users')
    .update(nextPoints)
    .eq('id', userId);
  if (upErr) {
    console.error('[awardUserPoints] update', upErr.message);
    return;
  }
  try {
    await ensureUserInLeaderboard(supabase, userId);
    await updateLeaderboardUserPoints(supabase, userId, nextPoints.total_points);
  } catch (e) {
    console.error('[awardUserPoints] leaderboard', e);
  }
}
