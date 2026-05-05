import type { VercelResponse } from '@vercel/node';
import type { DailyCourseDayBundle } from '../../shared/dailyCourseDay.js';
import { DAILY_COURSE_DAY_MAX, DAILY_COURSE_DAY_MIN, isValidDailyCourseDay } from '../../shared/dailyCourseDay.js';
import { supabase } from './supabase.js';
import { fetchDailyCourseDayBundle } from '../../server/services/dailyCourseBundle.service.js';

export async function handleDailyCourseDayGet(dayRaw: string, res: VercelResponse): Promise<VercelResponse> {
  const dayNumber = Number(dayRaw);
  if (!isValidDailyCourseDay(dayNumber)) {
    return res
      .status(400)
      .json({ error: `Kun raqami ${DAILY_COURSE_DAY_MIN}–${DAILY_COURSE_DAY_MAX} oralig‘ida bo‘lishi kerak` });
  }

  const result = await fetchDailyCourseDayBundle(supabase, dayNumber);
  if (result.ok === false) return res.status(500).json({ error: result.error });

  const bundle: DailyCourseDayBundle = result.bundle;
  return res.status(200).json(bundle);
}
