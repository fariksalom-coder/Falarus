import type { DatabaseClient } from '../types/progress';
import {
  ACHIEVEMENTS_BY_KEY,
  ALL_ACHIEVEMENTS,
  computeQualifyingAchievements,
  TOTAL_ACHIEVEMENTS,
  type AchievementDef,
} from '../../shared/achievements.js';
import { isKunlikDayRowFullyComplete } from '../../shared/kunlikDayCompletion.js';

/**
 * A single user achievement row shape as we exchange it with the client.
 * `unlocked_at` is a raw ISO string; `notified` tracks whether the client has
 * seen the celebration modal for this unlock yet.
 */
export type UserAchievementRow = {
  achievement_key: string;
  unlocked_at: string;
  notified: boolean;
};

/**
 * Fetch the two inputs the achievement engine cares about:
 *   • completedDays = fully-finished Kunlik reja days
 *   • wordsLearned  = sum of words_learned across all kunlik rows
 *
 * Exposed so /api/achievements can reuse the same computation for the
 * progress display without a second round-trip.
 */
export async function computeUserProgress(
  supabase: DatabaseClient,
  userId: number,
): Promise<{ completedDays: number; wordsLearned: number }> {
  const [{ data: kunlik }, { data: prompts }] = await Promise.all([
    supabase
      .from('user_kunlik_day_progress')
      .select(
        'day_number, grammar_1, grammar_2, grammar_3, words_learned, words_match, oqish_done, speaking_level',
      )
      .eq('user_id', userId),
    supabase.from('daily_practice_prompts').select('day_number'),
  ]);

  const promptCountByDay = new Map<number, number>();
  for (const row of prompts ?? []) {
    const d = (row as { day_number: number }).day_number;
    promptCountByDay.set(d, (promptCountByDay.get(d) ?? 0) + 1);
  }

  let completedDays = 0;
  let wordsLearned = 0;
  for (const r of (kunlik ?? []) as Array<{
    day_number: number;
    grammar_1: boolean | null;
    grammar_2: boolean | null;
    grammar_3: boolean | null;
    words_learned: number | null;
    words_match: boolean | null;
    oqish_done: boolean | null;
    speaking_level: number | null;
  }>) {
    wordsLearned += Math.max(0, Number(r.words_learned ?? 0));
    const done = isKunlikDayRowFullyComplete(
      {
        day_number: r.day_number,
        grammar_1: !!r.grammar_1,
        grammar_2: !!r.grammar_2,
        grammar_3: !!r.grammar_3,
        words_match: !!r.words_match,
        oqish_done: !!r.oqish_done,
        speaking_level: r.speaking_level,
      },
      promptCountByDay,
    );
    if (done) completedDays += 1;
  }

  return { completedDays, wordsLearned };
}

/**
 * Read all inputs the achievement engine needs and diff qualifying keys
 * against what's already stored. Returns the newly-inserted rows so the
 * caller can push them to the client as toast/modals.
 */
export async function evaluateAndUnlockAchievements(
  supabase: DatabaseClient,
  userId: number,
): Promise<AchievementDef[]> {
  const progress = await computeUserProgress(supabase, userId);

  const qualifying = computeQualifyingAchievements({
    completedDays: progress.completedDays,
    wordsLearned: progress.wordsLearned,
  });
  if (qualifying.length === 0) return [];

  // Fetch already-unlocked keys.
  const { data: existing } = await supabase
    .from('user_achievements')
    .select('achievement_key')
    .eq('user_id', userId);
  const existingSet = new Set<string>(
    (existing ?? []).map((r: { achievement_key: string }) => r.achievement_key),
  );

  const newlyUnlocked = qualifying.filter((k) => !existingSet.has(k));
  if (newlyUnlocked.length === 0) return [];

  // Insert new rows in bulk (notified = false so the client can drain them).
  const rows = newlyUnlocked.map((key) => ({
    user_id: userId,
    achievement_key: key,
    notified: false,
  }));
  const { error: insErr } = await supabase.from('user_achievements').insert(rows);
  if (insErr) {
    // Race-safe: someone else already inserted these — that's fine.
    console.warn('[achievements] insert warning', insErr);
  }

  return newlyUnlocked
    .map((k) => ACHIEVEMENTS_BY_KEY[k])
    .filter((d): d is AchievementDef => Boolean(d));
}

/** Full list of unlocked medals (used for the Statistika grid). */
export async function listUserAchievements(
  supabase: DatabaseClient,
  userId: number,
): Promise<UserAchievementRow[]> {
  const { data } = await supabase
    .from('user_achievements')
    .select('achievement_key, unlocked_at, notified')
    .eq('user_id', userId);
  return (data ?? []) as UserAchievementRow[];
}

/**
 * Mark a set of achievements as notified so we don't fire the modal twice
 * after a reload. Called by the client after it drains a batch.
 */
export async function markAchievementsNotified(
  supabase: DatabaseClient,
  userId: number,
  keys: string[],
): Promise<void> {
  if (keys.length === 0) return;
  await supabase
    .from('user_achievements')
    .update({ notified: true })
    .eq('user_id', userId)
    .in('achievement_key', keys);
}

/** Convenience: total catalog size — mirrors the shared constant. */
export function getTotalAchievementsCount(): number {
  return TOTAL_ACHIEVEMENTS;
}

/** Convenience: full ordered catalog (used by the grid). */
export function getCatalog(): AchievementDef[] {
  return ALL_ACHIEVEMENTS;
}
