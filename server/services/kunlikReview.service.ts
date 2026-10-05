import type { DbClient } from '../types/dbClient';
import { isValidDailyCourseDay } from '../../shared/dailyCourseDay';

/** Only server-recorded completions grant retained access; browser progress cannot grant it. */
export async function getKunlikReviewDays(db: DbClient, userId: number): Promise<number[]> {
  const { data, error } = await db.from('user_kunlik_day_progress')
    .select('day_number').eq('user_id', userId).eq('review_unlocked', true).order('day_number');
  if (error) throw error;
  return [...new Set((data ?? []).map(row => Number(row.day_number)))]
    .filter(day => day > 0 && isValidDailyCourseDay(day)).sort((a,b) => a-b);
}

export async function recordKunlikReviewDay(db: DbClient, userId: number, day: number): Promise<void> {
  if (day <= 0 || !isValidDailyCourseDay(day)) return;
  const { error } = await db.from('user_kunlik_day_progress').update({ review_unlocked: true })
    .eq('user_id', userId).eq('day_number', day);
  if (error) throw error;
}
