/**
 * Bugun / Bu hafta are derived from test-attempt aggregates (correct answers),
 * while Jami is sum(learned_words). Without clamping, week can exceed total.
 * Enforce: 0 ≤ today ≤ week ≤ total.
 */
export function clampVocabDailyDisplayToTotals(
  totalLearnedWords: number,
  todayWords: number,
  weekWords: number
): { todayWords: number; weekWords: number } {
  const total = Math.max(0, Math.floor(Number(totalLearnedWords) || 0));
  let week = Math.min(Math.max(0, Math.floor(weekWords)), total);
  let today = Math.min(Math.max(0, Math.floor(todayWords)), total);
  if (today > week) today = week;
  return { todayWords: today, weekWords: week };
}
