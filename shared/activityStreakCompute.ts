import { getRecentAppDateStrings } from './appDate.js';

/**
 * Streak = consecutive calendar days in app TZ with activity, counting backward.
 * If "today" has no row yet, start from yesterday (grace: streak still shows until the day ends).
 * last_7_days: [day-6, ..., today] in app timezone.
 * best_streak_days: longest run of consecutive days ever recorded in `dates`.
 */
export function computeActivityStreakFromDateSet(
  dates: Set<string>,
  formatDay: (d: Date) => string,
  now: Date = new Date()
): { streak_days: number; last_7_days: boolean[]; best_streak_days: number } {
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

  // Best streak — walk through sorted dates and track longest consecutive run.
  const sorted = [...dates].sort();
  let bestStreak = 0;
  let run = 0;
  let prevMs: number | null = null;
  for (const dateStr of sorted) {
    // Expect YYYY-MM-DD; parse as UTC midnight to compare day-diffs safely.
    const t = Date.parse(`${dateStr}T00:00:00Z`);
    if (!Number.isFinite(t)) continue;
    if (prevMs != null && t - prevMs === 24 * 60 * 60 * 1000) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > bestStreak) bestStreak = run;
    prevMs = t;
  }
  // Current live streak may exceed historical best in some edge cases.
  if (streak > bestStreak) bestStreak = streak;

  return { streak_days: streak, last_7_days: last7, best_streak_days: bestStreak };
}
