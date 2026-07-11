/**
 * Achievement catalog — single source of truth for backend + frontend.
 *
 * Two families:
 *   • days_N  — user has finished at least N Kunlik reja days
 *               (each day must satisfy isKunlikDayRowFullyComplete).
 *   • words_N — user has learned at least N unique vocabulary words.
 *
 * Each medal grants XP. Frontend renders the icon; backend just stores the
 * key string and the timestamp of the unlock.
 */

export type AchievementKind = 'days' | 'words';

export type AchievementDef = {
  /** Stable ID persisted in DB (e.g. "streak_10", "words_500"). */
  key: string;
  kind: AchievementKind;
  /** Threshold at which the medal unlocks. */
  threshold: number;
  /** Frontend icon name (lucide) or custom emoji marker used in the UI. */
  icon: 'flame' | 'zap' | 'star' | 'medal' | 'trophy' | 'crown' | 'sparkles' | 'book' | 'library' | 'graduation';
  /** XP reward granted when unlocked. */
  reward: number;
  /** Sort weight within the family (smaller = shown first). */
  order: number;
};

export const DAYS_ACHIEVEMENTS: AchievementDef[] = [
  { key: 'days_3',   kind: 'days', threshold: 3,   icon: 'flame',    reward: 50,   order: 1 },
  { key: 'days_10',  kind: 'days', threshold: 10,  icon: 'zap',      reward: 150,  order: 2 },
  { key: 'days_30',  kind: 'days', threshold: 30,  icon: 'star',     reward: 300,  order: 3 },
  { key: 'days_45',  kind: 'days', threshold: 45,  icon: 'medal',    reward: 450,  order: 4 },
  { key: 'days_60',  kind: 'days', threshold: 60,  icon: 'trophy',   reward: 600,  order: 5 },
  { key: 'days_100', kind: 'days', threshold: 100, icon: 'sparkles', reward: 1000, order: 6 },
  { key: 'days_182', kind: 'days', threshold: 182, icon: 'crown',    reward: 2000, order: 7 },
];

export const WORDS_ACHIEVEMENTS: AchievementDef[] = [
  { key: 'words_10',   kind: 'words', threshold: 10,   icon: 'book',       reward: 30,   order: 1 },
  { key: 'words_20',   kind: 'words', threshold: 20,   icon: 'book',       reward: 50,   order: 2 },
  { key: 'words_50',   kind: 'words', threshold: 50,   icon: 'book',       reward: 100,  order: 3 },
  { key: 'words_100',  kind: 'words', threshold: 100,  icon: 'library',    reward: 200,  order: 4 },
  { key: 'words_200',  kind: 'words', threshold: 200,  icon: 'library',    reward: 350,  order: 5 },
  { key: 'words_500',  kind: 'words', threshold: 500,  icon: 'library',    reward: 700,  order: 6 },
  { key: 'words_1000', kind: 'words', threshold: 1000, icon: 'graduation', reward: 1200, order: 7 },
  { key: 'words_1500', kind: 'words', threshold: 1500, icon: 'graduation', reward: 1600, order: 8 },
  { key: 'words_2000', kind: 'words', threshold: 2000, icon: 'graduation', reward: 2000, order: 9 },
  { key: 'words_3000', kind: 'words', threshold: 3000, icon: 'crown',      reward: 3000, order: 10 },
];

export const ALL_ACHIEVEMENTS: AchievementDef[] = [
  ...DAYS_ACHIEVEMENTS,
  ...WORDS_ACHIEVEMENTS,
];

export const ACHIEVEMENTS_BY_KEY: Record<string, AchievementDef> = ALL_ACHIEVEMENTS.reduce(
  (acc, def) => {
    acc[def.key] = def;
    return acc;
  },
  {} as Record<string, AchievementDef>,
);

/**
 * Given current progress, return the list of achievement keys that should be
 * unlocked. Backend passes this to the service which diffs against
 * user_achievements and inserts the delta.
 *
 *  • completedDays = number of Kunlik reja days fully finished (grammar +
 *    words_match + oqish + speaking prompts all satisfied).
 *  • wordsLearned  = sum of unique words learned across all days.
 */
export function computeQualifyingAchievements(input: {
  completedDays: number;
  wordsLearned: number;
}): string[] {
  const qualifying: string[] = [];
  for (const def of DAYS_ACHIEVEMENTS) {
    if (input.completedDays >= def.threshold) qualifying.push(def.key);
  }
  for (const def of WORDS_ACHIEVEMENTS) {
    if (input.wordsLearned >= def.threshold) qualifying.push(def.key);
  }
  return qualifying;
}

/** Total medals in the catalog. Used for the "N/M MEDAL" pill in the modal. */
export const TOTAL_ACHIEVEMENTS = ALL_ACHIEVEMENTS.length;

/** Next threshold above `value` in a family (for progress bars, if needed). */
export function nextThresholdIn(family: AchievementDef[], value: number): number | null {
  for (const def of family) {
    if (value < def.threshold) return def.threshold;
  }
  return null;
}
