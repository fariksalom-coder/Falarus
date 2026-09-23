import { pool } from '../lib/db.js';
import { computeActivityStreakFromDateSet } from '../../shared/activityStreakCompute.js';
import { formatDateInAppTimezone } from '../lib/appDate.js';
import type { PraiseProfile } from './liveLessonPraise.js';

export async function loadPraiseProfile(userId: number): Promise<PraiseProfile> {
  if (!pool) throw new Error('Praise history database is unavailable');
  const [profile, history, activity] = await Promise.all([
    pool.query(`SELECT first_name AS name, gender, age_group,
      to_jsonb(users)->>'learning_goal' AS learning_goal FROM users WHERE id = $1`, [userId]),
    pool.query(`SELECT phrase FROM live_lesson_praise_usage
      WHERE user_id = $1 AND used_at > now() - interval '7 days'`, [userId]),
    pool.query(`SELECT activity_date FROM user_activity_dates
      WHERE user_id = $1 ORDER BY activity_date DESC LIMIT 365`, [userId]),
  ]);
  const dates = new Set<string>(activity.rows.map(row => String(row.activity_date)));
  return {
    ...profile.rows[0],
    streak_days: computeActivityStreakFromDateSet(dates, formatDateInAppTimezone).streak_days,
    used_praise_phrases: history.rows.map(row => row.phrase),
  };
}

export async function saveUsedPraise(userId: number, phrases: string[]): Promise<void> {
  if (!phrases.length) return;
  if (!pool) throw new Error('Praise history database is unavailable');
  await pool.query(`INSERT INTO live_lesson_praise_usage (user_id, phrase)
    SELECT $1, unnest($2::text[])
    ON CONFLICT (user_id, phrase) DO UPDATE SET used_at = now()`, [userId, phrases]);
}
