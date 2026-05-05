import { formatDateInAppTimezone } from './appDate.js';
import { supabase } from './supabase.js';

/** Bir kunlik kun ilk bor to‘liq tugaganda — shu kalendar kuni uchun `course_days_completed` +1 (Vercel API). */
export async function incrementCourseDailyActivityCount(userId: number): Promise<void> {
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
    await supabase.from('user_course_daily_activity').insert({
      user_id: userId,
      activity_date: today,
      course_days_completed: 1,
    });
  }
}
