import { apiUrl } from '../api';
import type { DailyCourseDayBundle } from '../../shared/dailyCourseDay';

export async function getDailyCourseDay(token: string, dayNumber: number): Promise<DailyCourseDayBundle> {
  const res = await fetch(apiUrl(`/api/daily-course/day/${dayNumber}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as { error?: string })?.error || 'Kunlik materiallar yuklanmadi');
  }
  return body as DailyCourseDayBundle;
}
