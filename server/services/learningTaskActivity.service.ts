import { completedKunlikTaskKeys } from '../../shared/supportCrmCalendar.js';
import { pool } from '../lib/db.js';

/** Record explicit completions including repetitions whose best progress did not change. */
export async function recordKunlikTaskActivity(userId: number, day: number, patch: Record<string,unknown>): Promise<void> {
  const keys=completedKunlikTaskKeys(day,patch);
  if(!keys.length||!pool)return;
  await pool.query(`INSERT INTO learning_task_completions(user_id,task_key)
    SELECT $1,unnest($2::text[]) ON CONFLICT DO NOTHING`,[userId,keys]);
}
