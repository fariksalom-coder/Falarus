import type { SupabaseClient } from '@supabase/supabase-js';

/** Shared by api/activity/streak.ts and api/[...path].ts */
export async function getActivityStreakPayload(
  supabase: SupabaseClient,
  userId: number
): Promise<{ streak_days: number; last_7_days: boolean[] }> {
  const { data: rows, error } = await supabase
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
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (dates.has(key)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }

  const last7: boolean[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    last7.push(dates.has(key));
  }

  return { streak_days: streak, last_7_days: last7 };
}
