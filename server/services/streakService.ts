import type { Supabase } from '../types/progress';
import { computeActivityStreakFromDateSet } from '../../shared/activityStreakCompute.js';
import { formatDateInAppTimezone } from '../lib/appDate.js';

const TABLE = 'user_activity_dates';

/**
 * Record activity for the current calendar day in app TZ (idempotent).
 */
export async function recordActivity(supabase: Supabase, userId: number): Promise<void> {
  const activityDate = formatDateInAppTimezone(new Date());
  const { error } = await supabase.from(TABLE).insert({ user_id: userId, activity_date: activityDate });
  if (error && error.code !== '23505') console.error('[streakService.recordActivity]', error.message);
}

export type StreakResult = {
  streak_days: number;
  last_7_days: boolean[];
};

/**
 * Get streak (consecutive days with activity) and last 7 days activity flags.
 * last_7_days: [day-6, day-5, ..., today] in app timezone.
 */
export async function getStreak(supabase: Supabase, userId: number): Promise<StreakResult> {
  const { data: rows, error } = await supabase
    .from(TABLE)
    .select('activity_date')
    .eq('user_id', userId)
    .order('activity_date', { ascending: false })
    .limit(365);
  if (error) {
    console.error('[streakService.getStreak]', error.message);
    return { streak_days: 0, last_7_days: [false, false, false, false, false, false, false] };
  }
  const dates = new Set((rows ?? []).map((r: { activity_date: string }) => r.activity_date));
  return computeActivityStreakFromDateSet(dates, formatDateInAppTimezone, new Date());
}
