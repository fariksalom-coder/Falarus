import type { Supabase } from '../types/progress';

const TABLE = 'user_activity_dates';

function todayDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Record activity for the current day (idempotent). Call when user completes a task, vocabulary test, etc.
 */
export async function recordActivity(
  supabase: Supabase,
  userId: number
): Promise<void> {
  const activityDate = todayDateString();
  const { error } = await supabase.from(TABLE).insert({ user_id: userId, activity_date: activityDate });
  if (error && error.code !== '23505') console.error('[streakService.recordActivity]', error.message);
}

export type StreakResult = {
  streak_days: number;
  last_7_days: boolean[];
};

/**
 * Get streak (consecutive days including today) and last 7 days activity flags.
 * last_7_days: [day-6, day-5, ..., today] — true if user had activity that day.
 */
export async function getStreak(
  supabase: Supabase,
  userId: number
): Promise<StreakResult> {
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

  const today = todayDateString();
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (dates.has(key)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
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
