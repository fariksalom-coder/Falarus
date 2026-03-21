import { getRecentAppDateStrings } from './appDate.js';

/**
 * Streak = consecutive calendar days in app TZ with activity, counting backward.
 * If "today" has no row yet, start from yesterday (grace: streak still shows until the day ends).
 * last_7_days: [day-6, ..., today] in app timezone.
 */
export function computeActivityStreakFromDateSet(
  dates: Set<string>,
  formatDay: (d: Date) => string,
  now: Date = new Date()
): { streak_days: number; last_7_days: boolean[] } {
  let streak = 0;
  const d = new Date(now);
  if (!dates.has(formatDay(d))) {
    d.setDate(d.getDate() - 1);
  }
  for (let i = 0; i < 365; i++) {
    const key = formatDay(d);
    if (dates.has(key)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }

  const recentDates = getRecentAppDateStrings(7, now);
  const last7 = recentDates.map((k) => dates.has(k));
  return { streak_days: streak, last_7_days: last7 };
}
