/**
 * Give unowned ad (promo) leads to the promo operators (every active operator
 * except the first one), evenly by current load.
 *
 * Only leads from PROMO_LEADS_SINCE on, in a non-final status, whose owner is
 * missing or is not a promo operator. Leads already owned by a promo operator
 * are never moved, so nobody loses work in progress.
 *
 *   npx tsx server/scripts/rebalancePromoLeads.ts          — plan only (no writes)
 *   npx tsx server/scripts/rebalancePromoLeads.ts --apply  — apply in one transaction
 */
import 'dotenv/config';
import { pool } from '../lib/db';
import { PROMO_LEADS_SINCE } from '../services/salesCrm.service';

const FINAL_STATUSES = ['PAID', 'ARCHIVED', 'NOT_INTERESTED', 'INVALID_PHONE', 'LOW_QUALITY'];
const apply = process.argv.includes('--apply');

const PROMO_SINCE_SQL = `
  coalesce(l.source, '') NOT IN ('website', 'backfill', 'payment')
  AND coalesce(l.submitted_at, l.created_at) >= (TIMESTAMP '${PROMO_LEADS_SINCE} 00:00' AT TIME ZONE 'Asia/Tashkent')
  AND l.status <> ALL($1::text[])`;

async function main() {
  if (!pool) throw new Error('DATABASE_URL kerak');
  const db = await pool.connect();
  try {
    const { rows: agents } = await db.query<{ id: number; name: string; login: string; role: string; active: boolean }>(
      `SELECT id, name, login, role, active FROM sales_crm_agents ORDER BY id`,
    );
    console.log('Agents:');
    for (const a of agents) console.log(`  #${a.id} ${a.name} (${a.login}) role=${a.role} active=${a.active}`);

    const operators = agents.filter((a) => a.active && a.role === 'operator');
    const promoOps = operators.slice(1);
    if (!promoOps.length) throw new Error('Promo operator yo‘q (1-operatordan tashqari faol operator kerak)');
    console.log(`\nPromo operators: ${promoOps.map((o) => `#${o.id} ${o.name}`).join(', ')}`);
    console.log(`Ad leads since ${PROMO_LEADS_SINCE} (Asia/Tashkent), final statuses skipped.\n`);

    const { rows: byOwner } = await db.query<{ owner: string; n: number }>(
      `SELECT coalesce(a.name || ' #' || a.id, '— no operator') AS owner, count(*)::int AS n
       FROM sales_crm_leads l
       LEFT JOIN sales_crm_agents a ON a.id = l.assigned_operator_id
       WHERE ${PROMO_SINCE_SQL}
       GROUP BY 1 ORDER BY 2 DESC`,
      [FINAL_STATUSES],
    );
    console.log('Current owners:');
    for (const r of byOwner) console.log(`  ${r.owner}: ${r.n}`);

    const promoIds = promoOps.map((o) => o.id);
    const load = new Map<number, number>(promoIds.map((id) => [id, 0]));
    const { rows: loads } = await db.query<{ id: number; n: number }>(
      `SELECT l.assigned_operator_id AS id, count(*)::int AS n
       FROM sales_crm_leads l
       WHERE ${PROMO_SINCE_SQL} AND l.assigned_operator_id = ANY($2::bigint[])
       GROUP BY 1`,
      [FINAL_STATUSES, promoIds],
    );
    for (const r of loads) load.set(Number(r.id), r.n);

    const { rows: candidates } = await db.query<{ id: number; assigned_operator_id: number | null }>(
      `SELECT l.id, l.assigned_operator_id
       FROM sales_crm_leads l
       WHERE ${PROMO_SINCE_SQL}
         AND (l.assigned_operator_id IS NULL OR NOT (l.assigned_operator_id = ANY($2::bigint[])))
       ORDER BY coalesce(l.submitted_at, l.created_at) ASC, l.id ASC`,
      [FINAL_STATUSES, promoIds],
    );

    const plan = candidates.map((lead) => {
      const target = [...load.entries()].sort((a, b) => a[1] - b[1] || a[0] - b[0])[0][0];
      load.set(target, (load.get(target) ?? 0) + 1);
      return { leadId: Number(lead.id), from: lead.assigned_operator_id, to: target };
    });

    console.log(`\nLeads to assign: ${plan.length}`);
    for (const op of promoOps) {
      const gets = plan.filter((p) => p.to === op.id).length;
      console.log(`  #${op.id} ${op.name}: +${gets} → total ${load.get(op.id)}`);
    }

    if (!apply) {
      console.log('\nDry run — nothing changed. Re-run with --apply to write.');
      return;
    }
    if (!plan.length) return;

    await db.query('BEGIN');
    for (const p of plan) {
      await db.query(
        `UPDATE sales_crm_leads SET assigned_operator_id = $2, updated_at = now() WHERE id = $1`,
        [p.leadId, p.to],
      );
      await db.query(
        `UPDATE sales_crm_tasks SET operator_id = $2 WHERE lead_id = $1 AND status = 'open'`,
        [p.leadId, p.to],
      );
      await db.query(
        `INSERT INTO sales_crm_events (lead_id, actor_id, event_type, payload)
         VALUES ($1, NULL, 'assigned', $2::jsonb)`,
        [p.leadId, JSON.stringify({ operator_id: p.to, from_operator_id: p.from, mode: 'rebalance_promo' })],
      );
    }
    await db.query('COMMIT');
    console.log(`\nApplied: ${plan.length} leads assigned.`);
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
