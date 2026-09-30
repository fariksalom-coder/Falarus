/**
 * Undo the Google Sheets sync resets (lead sent back to "Yangi" every minute).
 *
 * For each lead that is in NEW now and was reset by the sync AFTER an operator
 * last worked it, restore from the lead's own history:
 *   - status:    the operator's last stage move or call result;
 *   - operator:  whoever did that (if still an active operator);
 *   - next call: the lead's latest open task.
 * Leads worked again after the reset are left alone.
 *
 *   npx tsx server/scripts/restoreResetLeads.ts          — plan only (no writes)
 *   npx tsx server/scripts/restoreResetLeads.ts --apply  — apply in one transaction
 */
import 'dotenv/config';
import { pool } from '../lib/db';
import { SALES_CRM_STATUSES, SALES_CRM_STATUS_LABELS, type SalesCrmStatus } from '../../shared/salesCrm';

const apply = process.argv.includes('--apply');

type Row = {
  id: number;
  name: string;
  assigned_operator_id: number | null;
  restore_status: string;
  actor_id: number;
  worked_at: Date;
  reset_at: Date;
  next_contact_at: Date | null;
};

async function main() {
  if (!pool) throw new Error('DATABASE_URL kerak');
  const db = await pool.connect();
  try {
    const { rows: agents } = await db.query<{ id: number; name: string; role: string; active: boolean }>(
      `SELECT id, name, role, active FROM sales_crm_agents`,
    );
    const operatorName = new Map(agents.map((a) => [Number(a.id), a.name]));
    const activeOperators = new Set(
      agents.filter((a) => a.active && a.role === 'operator').map((a) => Number(a.id)),
    );

    const { rows } = await db.query<Row>(
      `WITH human AS (
         SELECT DISTINCT ON (lead_id)
           lead_id, actor_id, created_at,
           CASE event_type WHEN 'status_changed' THEN payload->>'to' ELSE payload->>'status' END AS status
         FROM sales_crm_events
         WHERE actor_id IS NOT NULL AND event_type IN ('status_changed', 'call_logged')
         ORDER BY lead_id, created_at DESC
       ),
       last_reset AS (
         SELECT lead_id, max(created_at) AS at
         FROM sales_crm_events
         WHERE event_type = 'lead_refreshed' AND payload->>'resurfaced' = 'true'
         GROUP BY lead_id
       ),
       open_task AS (
         SELECT DISTINCT ON (lead_id) lead_id, scheduled_at
         FROM sales_crm_tasks
         WHERE status = 'open'
         ORDER BY lead_id, created_at DESC
       )
       SELECT l.id,
              trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')) AS name,
              l.assigned_operator_id,
              h.status AS restore_status,
              h.actor_id,
              h.created_at AS worked_at,
              r.at AS reset_at,
              t.scheduled_at AS next_contact_at
       FROM sales_crm_leads l
       JOIN users u ON u.id = l.user_id
       JOIN human h ON h.lead_id = l.id
       JOIN last_reset r ON r.lead_id = l.id
       LEFT JOIN open_task t ON t.lead_id = l.id
       WHERE l.status = 'NEW'
         AND h.created_at < r.at
         AND h.status IS NOT NULL
         AND h.status <> 'NEW'
         AND h.status = ANY($1::text[])
       ORDER BY h.created_at`,
      [SALES_CRM_STATUSES as readonly string[]],
    );

    const plan = rows.map((r) => {
      const actor = Number(r.actor_id);
      const toOperator = activeOperators.has(actor) ? actor : r.assigned_operator_id;
      return { ...r, toOperator };
    });

    console.log(`Leads to restore: ${plan.length}\n`);
    for (const p of plan) {
      const label = SALES_CRM_STATUS_LABELS[p.restore_status as SalesCrmStatus] ?? p.restore_status;
      const fromOp = p.assigned_operator_id != null ? operatorName.get(Number(p.assigned_operator_id)) : '—';
      const toOp = p.toOperator != null ? operatorName.get(Number(p.toOperator)) : '—';
      const next = p.next_contact_at ? new Date(p.next_contact_at).toISOString().slice(0, 16) : '—';
      console.log(
        `  #${p.id} ${p.name || 'Nomsiz'}: Yangi → ${label}; operator ${fromOp} → ${toOp}; next ${next} UTC`,
      );
    }
    const byStatus = new Map<string, number>();
    for (const p of plan) byStatus.set(p.restore_status, (byStatus.get(p.restore_status) ?? 0) + 1);
    console.log('\nBy status:', Object.fromEntries(byStatus));

    if (!apply) {
      console.log('\nDry run — nothing changed. Re-run with --apply to write.');
      return;
    }
    if (!plan.length) return;

    await db.query('BEGIN');
    for (const p of plan) {
      await db.query(
        `UPDATE sales_crm_leads
         SET status = $2,
             assigned_operator_id = $3,
             next_contact_at = COALESCE($4::timestamptz, next_contact_at),
             updated_at = now()
         WHERE id = $1 AND status = 'NEW'`,
        [p.id, p.restore_status, p.toOperator, p.next_contact_at],
      );
      if (p.toOperator != null) {
        await db.query(
          `UPDATE sales_crm_tasks SET operator_id = $2 WHERE lead_id = $1 AND status = 'open'`,
          [p.id, p.toOperator],
        );
      }
      await db.query(
        `INSERT INTO sales_crm_events (lead_id, actor_id, event_type, payload)
         VALUES ($1, NULL, 'status_restored', $2::jsonb)`,
        [
          p.id,
          JSON.stringify({
            from: 'NEW',
            to: p.restore_status,
            operator_id: p.toOperator,
            from_operator_id: p.assigned_operator_id,
            reason: 'sheet_sync_reset',
          }),
        ],
      );
    }
    await db.query('COMMIT');
    console.log(`\nApplied: ${plan.length} leads restored.`);
  } catch (e) {
    await db.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    db.release();
  }
}

main()
  .then(() => pool?.end())
  .catch(async (e) => {
    console.error(e instanceof Error ? e.message : e);
    await pool?.end();
    process.exit(1);
  });
