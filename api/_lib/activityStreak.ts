import type { SupabaseClient } from '@supabase/supabase-js';
import { computeActivityStreakFromDateSet } from '../../shared/activityStreakCompute.js';
import { formatDateInAppTimezone } from './appDate.js';
import { supabase } from './supabase.js';

/** Idempotent: one row per (user, calendar day) in app timezone. */
export async function recordUserActivityDate(userId: number): Promise<void> {
  const activityDate = formatDateInAppTimezone(new Date());
  const { error } = await supabase
    .from('user_activity_dates')
    .insert({ user_id: userId, activity_date: activityDate });
  if (error && error.code !== '23505') {
    console.error('[recordUserActivityDate]', error.message);
  }
}

/** Shared by api/streak.ts and api/[...path].ts */
export async function getActivityStreakPayload(
  supabaseClient: SupabaseClient,
  userId: number
): Promise<{ streak_days: number; last_7_days: boolean[] }> {
  const { data: rows, error } = await supabaseClient
    .from('user_activity_dates')
    .select('activity_date')
    .eq('user_id', userId)
    .order('activity_date', { ascending: false })
    .limit(365);

  if (error) {
    console.error('[activity/streak]', error.message);
    return { streak_days: 0, last_7_days: [false, false, false, false, false, false, false] };
  }

  const dates = new Set((rows ?? []).map((r: { activity_date: string }) => r.activity_date));
  return computeActivityStreakFromDateSet(dates, formatDateInAppTimezone, new Date());
}
