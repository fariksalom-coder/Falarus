/**
 * Single source of truth for XP scoring.
 *
 * A finished day of Kunlik Reja is worth up to ~200 XP:
 *   grammar_1 / grammar_2 / grammar_3   → 15 XP each        (max 45)
 *   words_learned                       → 2  XP × count      (cap 30)
 *   words_correct                       → 3  XP × count      (cap 40)
 *   words_match (juftlik done)          → 20 XP              (max 20)
 *   oqish_done                          → 30 XP              (max 30)
 *   speaking_level                      → 20 XP × level      (cap 40)
 *
 * On top of that:
 *   +5 XP × min(streak_days, 20)                             (max 100)
 *   +1 XP × min(minutes_today / 10, 30)                      (max 30)
 *
 * Level: `level = floor(total_points / 500) + 1`.
 *
 * All caps prevent farming (e.g. spamming vocab tests) while still rewarding
 * the natural progression of a day's plan.
 */

export type KunlikDayRowForXp = {
  grammar_1?: boolean | null;
  grammar_2?: boolean | null;
  grammar_3?: boolean | null;
  words_learned?: number | null;
  words_correct?: number | null;
  words_match?: boolean | null;
  oqish_done?: boolean | null;
  speaking_level?: number | null;
};

const CAP_WORDS_LEARNED = 30;
const CAP_WORDS_CORRECT = 40;
const CAP_SPEAKING_LEVEL = 2; // → 40 XP max
const CAP_STREAK_DAYS = 20;
const CAP_TIME_MINUTES = 300; // 5h/day contributes to XP (then flat)

export const XP_PER_LEVEL = 500;

export function calculateXpForKunlikDay(row: KunlikDayRowForXp): number {
  let xp = 0;
  if (row.grammar_1) xp += 15;
  if (row.grammar_2) xp += 15;
  if (row.grammar_3) xp += 15;

  const wordsLearned = Math.min(Math.max(row.words_learned ?? 0, 0), CAP_WORDS_LEARNED);
  const wordsCorrect = Math.min(Math.max(row.words_correct ?? 0, 0), CAP_WORDS_CORRECT);
  xp += 2 * wordsLearned;
  xp += 3 * wordsCorrect;

  if (row.words_match) xp += 20;
  if (row.oqish_done) xp += 30;

  const speaking = Math.min(Math.max(row.speaking_level ?? 0, 0), CAP_SPEAKING_LEVEL);
  xp += 20 * speaking;

  return xp;
}

export function calculateStreakBonus(streakDays: number): number {
  const days = Math.min(Math.max(streakDays, 0), CAP_STREAK_DAYS);
  return 5 * days;
}

export function calculateTimeBonus(minutesToday: number): number {
  const minutes = Math.min(Math.max(minutesToday, 0), CAP_TIME_MINUTES);
  return Math.floor(minutes / 10);
}

export function calculateTotalXp(input: {
  kunlikRows: KunlikDayRowForXp[];
  streakDays: number;
  minutesToday: number;
}): number {
  const daysXp = input.kunlikRows.reduce((sum, r) => sum + calculateXpForKunlikDay(r), 0);
  const streakBonus = calculateStreakBonus(input.streakDays);
  const timeBonus = calculateTimeBonus(input.minutesToday);
  return daysXp + streakBonus + timeBonus;
}

export function levelFromXp(xp: number): { level: number; toNext: number; pctInLevel: number } {
  const safe = Math.max(0, Math.floor(xp));
  const level = Math.floor(safe / XP_PER_LEVEL) + 1;
  const inLevel = safe % XP_PER_LEVEL;
  const toNext = XP_PER_LEVEL - inLevel;
  const pctInLevel = Math.round((inLevel / XP_PER_LEVEL) * 100);
  return { level, toNext, pctInLevel };
}
