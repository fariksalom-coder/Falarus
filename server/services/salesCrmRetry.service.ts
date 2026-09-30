import { pool } from '../lib/db.js';

/** One atomic batch; SKIP LOCKED also allows multiple app processes safely. */
export async function returnDueNoAnswerLeads(): Promise<number> {
  if (!pool) return 0;
  const { rows } = await pool.query<{ id: number }>(`
    WITH due AS (
      SELECT id, no_answer_retry_at AS due_at FROM sales_crm_leads
      WHERE status = 'NO_ANSWER' AND no_answer_retry_at <= now()
      ORDER BY no_answer_retry_at, id
      LIMIT 500 FOR UPDATE SKIP LOCKED
    ), returned AS (
      UPDATE sales_crm_leads l
      SET status = 'NEW', next_contact_at = now(),
          last_action_at = now(), updated_at = now()
      FROM due WHERE l.id = due.id
      RETURNING l.id, l.assigned_operator_id, l.no_answer_attempts, due.due_at
    ), events AS (
      INSERT INTO sales_crm_events (lead_id, event_type, payload)
      SELECT id, 'no_answer_returned', jsonb_build_object(
        'from', 'NO_ANSWER', 'to', 'NEW', 'attempt', no_answer_attempts,
        'scheduled_at', due_at) FROM returned
    ), tasks AS (
      INSERT INTO sales_crm_tasks (lead_id, operator_id, task_type, scheduled_at, note)
      SELECT id, assigned_operator_id, 'call', now(),
        'Qayta qo‘ng‘iroq: ' || (no_answer_attempts + 1)::text || '-urinish'
      FROM returned WHERE assigned_operator_id IS NOT NULL
    ) SELECT id FROM returned
  `);
  return rows.length;
}

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

export function startSalesCrmRetryWorker(): boolean {
  if (timer) return true;
  // Local development may share the production DB through an SSH tunnel.
  const enabled = process.env.SALES_CRM_RETRY_ENABLED ?? String(process.env.NODE_ENV === 'production');
  if (enabled !== 'true' || !pool) return false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const returned = await returnDueNoAnswerLeads();
      if (returned) console.log('[sales-crm-retry]', { returned });
    } catch (error) {
      console.error('[sales-crm-retry] failed', { code: (error as { code?: string }).code || 'unknown' });
    } finally {
      running = false;
    }
  };
  timer = setInterval(run, 30_000);
  timer.unref();
  void run();
  console.log('[sales-crm-retry] scheduled every 30s');
  return true;
}
