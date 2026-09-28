/**
 * salesCrmFunnel.service.ts — monthly plan/fact per funnel stage.
 *
 * Every stage is "the first moment this lead reached it", derived from data the
 * CRM and the platform already record, so history counts retroactively:
 *   lead            sales_crm_leads.created_at
 *   attempt         first logged call or operator board move
 *   reached         first answered call or board move into a talked-to stage
 *   presentation    sales_crm_leads.presentation_at (auto + manual)
 *   payment_pending first move to PAYMENT_PENDING (board or call result)
 *   paid            paid_at, or first move to PAID
 *   access          first approved payment / subscription start
 *   first_login     first platform activity day on/after access
 *   support_group   sales_crm_leads.support_group_at (manual)
 * Facts are attributed to the lead's current operator.
 */
import { pool } from '../lib/db.js';
import {
  SALES_FUNNEL_STAGES,
  type SalesFunnelManualStage,
  type SalesFunnelStage,
} from '../../shared/salesCrm.js';
import type { SalesCrmLeadFlow } from './salesCrm.service';

const TZ = 'Asia/Tashkent';

/** Call results that mean the course was explained to the lead. */
const PRESENTATION_CALL_RESULTS = ['interested', 'wants_details', 'thinking', 'ready_to_pay'];
/** Board stages that can only follow a presentation. */
const PRESENTATION_STATUSES = ['THINKING', 'PAYMENT_PENDING', 'FOLLOW_UP'];
/** Board stages an operator can only set after actually talking to the lead. */
const REACHED_STATUSES = ['ANSWERED', 'THINKING', 'PAYMENT_PENDING', 'FOLLOW_UP', 'NOT_INTERESTED', 'PAID'];

/** Constant string list → SQL `('A', 'B')`. Only for the literals above. */
function sqlList(values: readonly string[]): string {
  return `(${values.map((v) => `'${v}'`).join(', ')})`;
}

function requirePool() {
  if (!pool) throw new Error('DATABASE_URL kerak');
  return pool;
}

function flowFilterSql(flow?: SalesCrmLeadFlow | null): string {
  if (flow === 'promo') return `source = 'landing'`;
  if (flow === 'platform') return `coalesce(source, '') IN ('website', 'backfill')`;
  return '1=1';
}

function flowOwnerSql(flow?: SalesCrmLeadFlow | null): string {
  const firstOperator = `(
    SELECT id FROM sales_crm_agents
    WHERE active = true AND role = 'operator'
    ORDER BY id ASC
    LIMIT 1
  )`;
  if (flow === 'promo') return `assigned_operator_id IS DISTINCT FROM ${firstOperator}`;
  if (flow === 'platform') return `assigned_operator_id = ${firstOperator}`;
  return '1=1';
}

/** Per-lead stage timestamps. `$1` filters leads, see callers. */
function milestonesSql(leadFilter: string): string {
  return `
    WITH l AS (
      SELECT id, user_id, assigned_operator_id AS op, created_at, presentation_at, support_group_at, paid_at
      FROM sales_crm_leads
      WHERE ${leadFilter}
    ),
    calls AS (
      SELECT c.lead_id,
             min(c.called_at) AS attempt_at,
             min(c.called_at) FILTER (WHERE c.answered) AS reached_at
      FROM sales_crm_calls c JOIN l ON l.id = c.lead_id
      GROUP BY c.lead_id
    ),
    moves AS (
      SELECT e.lead_id,
             min(e.created_at) FILTER (
               WHERE coalesce(e.payload->>'to', e.payload->>'status') = 'PAYMENT_PENDING'
             ) AS pending_at,
             min(e.created_at) FILTER (
               WHERE e.event_type = 'paid' OR coalesce(e.payload->>'to', e.payload->>'status') = 'PAID'
             ) AS paid_at,
             -- Operators often move cards on the board without logging a call.
             min(e.created_at) FILTER (
               WHERE e.event_type = 'status_changed' AND e.actor_id IS NOT NULL
                 AND e.payload->>'to' NOT IN ('NEW', 'TO_CALL', 'ARCHIVED')
             ) AS attempt_at,
             min(e.created_at) FILTER (
               WHERE e.event_type = 'status_changed' AND e.actor_id IS NOT NULL
                 AND e.payload->>'to' IN ${sqlList(REACHED_STATUSES)}
             ) AS reached_at
      FROM sales_crm_events e JOIN l ON l.id = e.lead_id
      WHERE e.event_type IN ('status_changed', 'call_logged', 'paid')
      GROUP BY e.lead_id
    ),
    access AS (
      SELECT l.id AS lead_id, min(x.at) AS access_at
      FROM l
      JOIN LATERAL (
        SELECT coalesce(p.approved_at, p.payment_time, p.created_at) AS at
        FROM payments p WHERE p.user_id = l.user_id AND p.status = 'approved'
        UNION ALL
        SELECT s.started_at FROM subscriptions s WHERE s.user_id = l.user_id
      ) x ON x.at IS NOT NULL
      GROUP BY l.id
    ),
    -- Activity is stored per day. On the access day itself only activity recorded
    -- after the payment counts (user_daily_time.updated_at); later days count whole.
    login AS (
      SELECT a.lead_id, min(x.at) AS first_login_at
      FROM access a
      JOIN l ON l.id = a.lead_id
      JOIN LATERAL (
        SELECT (d.activity_date::timestamp AT TIME ZONE '${TZ}') AS at
        FROM user_activity_dates d
        WHERE d.user_id = l.user_id
          AND d.activity_date > (a.access_at AT TIME ZONE '${TZ}')::date
        UNION ALL
        SELECT t.updated_at
        FROM user_daily_time t
        WHERE t.user_id = l.user_id
          AND t.activity_date = (a.access_at AT TIME ZONE '${TZ}')::date
          AND t.updated_at > a.access_at
      ) x ON true
      GROUP BY a.lead_id
    ),
    m AS (
      SELECT l.id AS lead_id, l.op,
             l.created_at            AS lead,
             least(calls.attempt_at, moves.attempt_at) AS attempt,
             least(calls.reached_at, moves.reached_at) AS reached,
             l.presentation_at       AS presentation,
             moves.pending_at        AS payment_pending,
             least(l.paid_at, moves.paid_at) AS paid,
             access.access_at        AS access,
             login.first_login_at    AS first_login,
             l.support_group_at      AS support_group
      FROM l
      LEFT JOIN calls  ON calls.lead_id  = l.id
      LEFT JOIN moves  ON moves.lead_id  = l.id
      LEFT JOIN access ON access.lead_id = l.id
      LEFT JOIN login  ON login.lead_id  = l.id
    )`;
}

const UNPIVOT = `
  CROSS JOIN LATERAL (VALUES
    ('lead', m.lead), ('attempt', m.attempt), ('reached', m.reached),
    ('presentation', m.presentation), ('payment_pending', m.payment_pending),
    ('paid', m.paid), ('access', m.access), ('first_login', m.first_login),
    ('support_group', m.support_group)
  ) v(stage, at)`;

export type FunnelStageFact = {
  key: SalesFunnelStage;
  plan: number | null;
  fact: number;
  daily: number[];
};

export type FunnelReport = {
  month: string;
  days: number;
  /** Day of month "today" in Tashkent when viewing the current month, else null. */
  today: number | null;
  operatorId: number | null;
  flow: SalesCrmLeadFlow | null;
  stages: FunnelStageFact[];
  operators: {
    id: number;
    name: string;
    active: boolean;
    stages: Record<SalesFunnelStage, { plan: number | null; fact: number }>;
  }[];
};

/** "YYYY-MM" → validated month string; defaults to the current Tashkent month. */
export function normalizeMonth(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(s)) return s;
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function emptyStageMap(): Record<SalesFunnelStage, { plan: number | null; fact: number }> {
  return Object.fromEntries(
    SALES_FUNNEL_STAGES.map((s) => [s.key, { plan: null, fact: 0 }]),
  ) as Record<SalesFunnelStage, { plan: number | null; fact: number }>;
}

export async function getFunnelReport(params: {
  month: string;
  operatorId: number | null;
  flow?: SalesCrmLeadFlow | null;
}): Promise<FunnelReport> {
  const db = requirePool();
  const month = normalizeMonth(params.month);
  const [y, mo] = month.split('-').map(Number);
  const days = new Date(y, mo, 0).getDate();
  const current = normalizeMonth(null);
  const today =
    month === current
      ? Number(new Date().toLocaleString('en-US', { timeZone: TZ, day: 'numeric' }))
      : null;
  const agentFlowWhere =
    params.flow === 'promo'
      ? `AND id IS DISTINCT FROM (
          SELECT id FROM sales_crm_agents
          WHERE active = true AND role = 'operator'
          ORDER BY id ASC
          LIMIT 1
        )`
      : params.flow === 'platform'
        ? `AND id = (
            SELECT id FROM sales_crm_agents
            WHERE active = true AND role = 'operator'
            ORDER BY id ASC
            LIMIT 1
          )`
        : '';

  const [{ rows: facts }, { rows: plans }, { rows: agents }] = await Promise.all([
    db.query<{ op: number | null; stage: SalesFunnelStage; day: number; n: number }>(
      `${milestonesSql(`created_at < (($1::date + interval '1 month')::timestamp AT TIME ZONE '${TZ}') AND ${flowFilterSql(params.flow)} AND ${flowOwnerSql(params.flow)}`)}
       SELECT m.op, v.stage, extract(day FROM v.at AT TIME ZONE '${TZ}')::int AS day, count(*)::int AS n
       FROM m ${UNPIVOT}
       WHERE v.at >= ($1::date::timestamp AT TIME ZONE '${TZ}')
         AND v.at <  (($1::date + interval '1 month')::timestamp AT TIME ZONE '${TZ}')
       GROUP BY 1, 2, 3`,
      [`${month}-01`],
    ),
    db.query<{ stage: SalesFunnelStage; operator_id: string; target: number }>(
      `SELECT stage, operator_id, target FROM sales_crm_plans WHERE month = $1::date`,
      [`${month}-01`],
    ),
    db.query<{ id: number; name: string; active: boolean }>(
      `SELECT id, name, active FROM sales_crm_agents WHERE role = 'operator' ${agentFlowWhere} ORDER BY name ASC`,
    ),
  ]);

  const opPlan = new Map<string, number>();
  const teamPlan = new Map<SalesFunnelStage, number>();
  for (const p of plans) {
    const opId = Number(p.operator_id);
    if (opId === 0) teamPlan.set(p.stage, Number(p.target));
    else opPlan.set(`${opId}:${p.stage}`, Number(p.target));
  }

  const operators = agents.map((a) => ({
    id: Number(a.id),
    name: a.name,
    active: a.active,
    stages: emptyStageMap(),
  }));
  const opById = new Map(operators.map((o) => [o.id, o]));
  for (const o of operators) {
    for (const s of SALES_FUNNEL_STAGES) {
      o.stages[s.key].plan = opPlan.get(`${o.id}:${s.key}`) ?? null;
    }
  }

  const stages: FunnelStageFact[] = SALES_FUNNEL_STAGES.map((s) => ({
    key: s.key,
    plan: null,
    fact: 0,
    daily: Array.from({ length: days }, () => 0),
  }));
  const stageByKey = new Map(stages.map((s) => [s.key, s]));

  for (const r of facts) {
    const op = r.op == null ? null : Number(r.op);
    const n = Number(r.n);
    const opRow = op != null ? opById.get(op) : undefined;
    if (opRow) opRow.stages[r.stage].fact += n;
    if (params.operatorId != null && op !== params.operatorId) continue;
    const st = stageByKey.get(r.stage);
    if (!st) continue;
    st.fact += n;
    if (r.day >= 1 && r.day <= days) st.daily[r.day - 1] += n;
  }

  for (const st of stages) {
    if (params.operatorId != null) {
      st.plan = opPlan.get(`${params.operatorId}:${st.key}`) ?? null;
    } else if (teamPlan.has(st.key)) {
      st.plan = teamPlan.get(st.key) ?? null;
    } else {
      // No explicit team plan: fall back to the sum of operator plans, if any.
      const sum = operators.reduce<number | null>((acc, o) => {
        const p = o.stages[st.key].plan;
        return p == null ? acc : (acc ?? 0) + p;
      }, null);
      st.plan = sum;
    }
  }

  return { month, days, today, operatorId: params.operatorId, flow: params.flow ?? null, stages, operators };
}

/** Upsert (or clear, when target is null) monthly targets for one scope. */
export async function setFunnelPlans(params: {
  month: string;
  operatorId: number | null;
  targets: Partial<Record<SalesFunnelStage, number | null>>;
}): Promise<void> {
  const db = requirePool();
  const monthDate = `${normalizeMonth(params.month)}-01`;
  const opKey = params.operatorId ?? 0;
  for (const s of SALES_FUNNEL_STAGES) {
    if (!(s.key in params.targets)) continue;
    const raw = params.targets[s.key];
    if (raw == null) {
      await db.query(
        `DELETE FROM sales_crm_plans WHERE month = $1::date AND stage = $2 AND operator_id = $3`,
        [monthDate, s.key, opKey],
      );
      continue;
    }
    const target = Math.max(0, Math.min(1_000_000, Math.round(Number(raw))));
    if (!Number.isFinite(target)) continue;
    await db.query(
      `INSERT INTO sales_crm_plans (month, stage, operator_id, target, updated_at)
       VALUES ($1::date, $2, $3, $4, now())
       ON CONFLICT (month, stage, operator_id)
       DO UPDATE SET target = EXCLUDED.target, updated_at = now()`,
      [monthDate, s.key, opKey, target],
    );
  }
}

/** Stage timestamps for one lead (lead card checklist). */
export async function getLeadMilestones(
  leadId: number,
): Promise<Record<SalesFunnelStage, string | null>> {
  const db = requirePool();
  const { rows } = await db.query(
    `${milestonesSql('id = $1')}
     SELECT lead, attempt, reached, presentation, payment_pending, paid, access, first_login, support_group
     FROM m`,
    [leadId],
  );
  const row = (rows[0] ?? {}) as Record<string, Date | string | null>;
  return Object.fromEntries(
    SALES_FUNNEL_STAGES.map((s) => {
      const v = row[s.key];
      return [s.key, v ? new Date(v).toISOString() : null];
    }),
  ) as Record<SalesFunnelStage, string | null>;
}

/** Operator marks/unmarks a manual milestone on a lead. */
export async function setLeadMilestone(params: {
  leadId: number;
  stage: SalesFunnelManualStage;
  done: boolean;
  actorId: number;
  scopeOperatorId?: number | null;
}): Promise<void> {
  const db = requirePool();
  const column = params.stage === 'presentation' ? 'presentation_at' : 'support_group_at';
  const q: unknown[] = [params.leadId];
  let scope = '';
  if (params.scopeOperatorId) {
    q.push(params.scopeOperatorId);
    scope = ` AND assigned_operator_id = $2`;
  }
  const { rows } = await db.query(
    `UPDATE sales_crm_leads
     SET ${column} = ${params.done ? `coalesce(${column}, now())` : 'NULL'},
         last_action_at = now(), updated_at = now()
     WHERE id = $1${scope}
     RETURNING id`,
    q,
  );
  if (!rows[0]) throw Object.assign(new Error('Lead topilmadi'), { status: 404 });
  await db.query(
    `INSERT INTO sales_crm_events (lead_id, actor_id, event_type, payload)
     VALUES ($1, $2, 'milestone', $3::jsonb)`,
    [params.leadId, params.actorId, JSON.stringify({ stage: params.stage, done: params.done })],
  );
}

/** Auto-mark presentation from a call result or board move (first time only). */
export async function markPresentationIfImplied(
  leadId: number,
  signal: { callResult?: string; status?: string },
): Promise<void> {
  const implied =
    (signal.callResult && PRESENTATION_CALL_RESULTS.includes(signal.callResult)) ||
    (signal.status && PRESENTATION_STATUSES.includes(signal.status));
  if (!implied) return;
  await requirePool().query(
    `UPDATE sales_crm_leads SET presentation_at = now()
     WHERE id = $1 AND presentation_at IS NULL`,
    [leadId],
  );
}
