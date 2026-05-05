import type { Supabase } from '../types/progress';
import { formatDateInAppTimezone } from './appDate.js';
import * as streakService from '../services/streakService.js';

/** Bir kunlik kun birinchi marta to‘liq tugaganda: streak sanasi + kunlik kurs hisobi (+1). */
export async function applyKunlikDayCompletionSideEffects(
  supabase: Supabase,
  userId: number,
  wasFullyComplete: boolean,
  nowFullyComplete: boolean,
): Promise<void> {
  if (!nowFullyComplete) return;

  await streakService.recordActivity(supabase, userId);

  if (wasFullyComplete) return;

  const today = formatDateInAppTimezone(new Date());
  const { data: existing } = await supabase
    .from('user_course_daily_activity')
    .select('course_days_completed')
    .eq('user_id', userId)
    .eq('activity_date', today)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('user_course_daily_activity')
      .update({ course_days_completed: (existing.course_days_completed as number) + 1 })
      .eq('user_id', userId)
      .eq('activity_date', today);
  } else {
    await supabase
      .from('user_course_daily_activity')
      .insert({ user_id: userId, activity_date: today, course_days_completed: 1 });
  }
}
