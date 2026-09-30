/**
 * salesCrm.service.ts — inbound lead pipeline (isolated from Support CRM).
 * Source of truth for identity: users. Pipeline state: sales_crm_*.
 */
import type { Pool } from 'pg';
import { salesLeadSearch } from './salesCrmSearch';
import { pool } from '../lib/db.js';
import {
  digitsOnlyPhone,
  isSalesCrmStatus,
  stageMoveRequirements,
  statusAfterCallResult,
  type SalesCrmCallResult,
  type SalesCrmStatus,
} from '../../shared/salesCrm.js';
import { markPresentationIfImplied } from './salesCrmFunnel.service';

function requirePool() {
  if (!pool) throw new Error('DATABASE_URL kerak');
  return pool;
}

export type SalesCrmAgentRole = 'admin' | 'operator';
export type SalesCrmLeadFlow = 'promo' | 'platform';

const SALES_CRM_TERMINAL_STATUSES = ['PAID', 'ARCHIVED', 'NOT_INTERESTED', 'INVALID_PHONE'] as const;

function leadFlowSql(flow?: SalesCrmLeadFlow | null, alias = ''): string {
  const p = alias ? `${alias}.` : '';
  if (flow === 'promo') return `coalesce(${p}source, '') NOT IN ('website', 'backfill', 'payment')`;
  if (flow === 'platform') return `coalesce(${p}source, '') IN ('website', 'backfill')`;
  return '1=1';
}

function leadFlowOwnerSql(flow?: SalesCrmLeadFlow | null, alias = ''): string {
  const p = alias ? `${alias}.` : '';
  const firstOperator = `(
    SELECT id FROM sales_crm_agents
    WHERE active = true AND role = 'operator'
    ORDER BY id ASC
    LIMIT 1
  )`;
  if (flow === 'promo') return `${p}assigned_operator_id IS DISTINCT FROM ${firstOperator}`;
  if (flow === 'platform') return `${p}assigned_operator_id = ${firstOperator}`;
  return '1=1';
}

/** Ad leads that arrived before this day (Asia/Tashkent) are no longer worked. */
export const PROMO_LEADS_SINCE = '2026-09-25';

/** Platform leads are always shown; ad leads only from PROMO_LEADS_SINCE on. */
function operatorVisibleLeadSql(alias = ''): string {
  const p = alias ? `${alias}.` : '';
  return `(
    coalesce(${p}source, '') IN ('website', 'backfill', 'payment')
    OR coalesce(${p}submitted_at, ${p}created_at) >= (TIMESTAMP '${PROMO_LEADS_SINCE} 00:00' AT TIME ZONE 'Asia/Tashkent')
  )`;
}

export type LeadListFilters = {
  status?: SalesCrmStatus | SalesCrmStatus[];
  operatorId?: number | null;
  flow?: SalesCrmLeadFlow | null;
  q?: string;
  createdFrom?: string | null;
  createdTo?: string | null;
  nextContact?: 'overdue' | 'today' | 'tomorrow' | 'none' | null;
  page?: number;
  pageSize?: number;
  /** When set, operators only see their leads. */
  scopeOperatorId?: number | null;
};

function normalizePhoneKey(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const d = digitsOnlyPhone(phone);
  return d.length >= 9 ? d : null;
}

async function addEvent(
  leadId: number,
  actorId: number | null,
  eventType: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  const db = requirePool();
  await db.query(
    `INSERT INTO sales_crm_events (lead_id, actor_id, event_type, payload)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [leadId, actorId, eventType, JSON.stringify(payload)],
  );
}

async function getSetting(key: string): Promise<string> {
  const db = requirePool();
  const { rows } = await db.query<{ value: string }>(
    `SELECT value FROM sales_crm_settings WHERE key = $1`,
    [key],
  );
  return rows[0]?.value ?? '';
}

async function setSetting(key: string, value: string): Promise<void> {
  const db = requirePool();
  await db.query(
    `INSERT INTO sales_crm_settings (key, value, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, value],
  );
}

async function pickRoundRobinOperator(): Promise<number | null> {
  const db = requirePool();
  const { rows: ops } = await db.query<{ id: number }>(
    `SELECT id FROM sales_crm_agents
     WHERE active = true AND role = 'operator'
     ORDER BY id ASC`,
  );
  if (!ops.length) return null;
  const cursor = Number(await getSetting('round_robin_cursor')) || 0;
  const idx = Math.abs(cursor) % ops.length;
  const chosen = ops[idx].id;
  await setSetting('round_robin_cursor', String(cursor + 1));
  return chosen;
}

async function pickFirstOperator(): Promise<number | null> {
  const db = requirePool();
  const { rows } = await db.query<{ id: number }>(
    `SELECT id FROM sales_crm_agents
     WHERE active = true AND role = 'operator'
     ORDER BY id ASC
     LIMIT 1`,
  );
  return rows[0]?.id ?? null;
}

async function pickPromoOperator(): Promise<number | null> {
  const db = requirePool();
  const firstOperatorId = await pickFirstOperator();
  const { rows: ops } = await db.query<{ id: number }>(
    `SELECT id FROM sales_crm_agents
     WHERE active = true
       AND role = 'operator'
       AND ($1::bigint IS NULL OR id <> $1)
     ORDER BY id ASC`,
    [firstOperatorId],
  );
  if (!ops.length) return firstOperatorId;
  const cursor = Number(await getSetting('promo_round_robin_cursor')) || 0;
  const idx = Math.abs(cursor) % ops.length;
  const chosen = ops[idx].id;
  await setSetting('promo_round_robin_cursor', String(cursor + 1));
  return chosen;
}

async function pickOperatorForLead(params: {
  assignment?: 'default' | 'registration' | 'promo';
}): Promise<{ operatorId: number | null; mode: string }> {
  if (params.assignment === 'registration') {
    return { operatorId: await pickFirstOperator(), mode: 'registration_first_operator' };
  }
  if (params.assignment === 'promo') {
    return { operatorId: await pickPromoOperator(), mode: 'promo_round_robin' };
  }
  const mode = (await getSetting('assignment_mode')) || 'round_robin';
  return {
    operatorId: mode === 'round_robin' ? await pickRoundRobinOperator() : null,
    mode,
  };
}

/**
 * Create or refresh CRM lead for a registered user (phone required).
 * Duplicate phone → update existing lead + history event (no second card).
 */
export async function ingestUserAsSalesLead(params: {
  userId: number;
  phone?: string | null;
  source?: string | null;
  utmSource?: string | null;
  medium?: string | null;
  campaign?: string | null;
  ad?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  landingPage?: string | null;
  actorId?: number | null;
  externalKey?: string | null;
  sheetRowNumber?: number | null;
  submittedAt?: string | null;
  assignment?: 'default' | 'registration' | 'promo';
  /**
   * A repeat submission sends an idle lead (no answer / refused / wrong number /
   * archived) back to "Yangi"; leads an operator is working keep their stage,
   * and the owner never changes (unowned leads get one). When it applies:
   * - 'submit': every call is a fresh form submission (promo landing);
   * - 'new_external_key': only for a source record this lead has not seen yet.
   *   Google Sheets sync re-reads every row each minute, so re-reading the same
   *   row must not reset the operator's work.
   */
  resurfaceOn?: 'submit' | 'new_external_key';
}): Promise<{ leadId: number; created: boolean }> {
  const db = requirePool();
  const phoneKey = normalizePhoneKey(params.phone);
  const externalKey = params.externalKey?.trim() || null;
  const shouldResurface = async (leadId: number, matchedByExternalKey: boolean): Promise<boolean> => {
    if (params.resurfaceOn === 'submit') return true;
    if (params.resurfaceOn !== 'new_external_key' || !externalKey || matchedByExternalKey) return false;
    const { rows } = await db.query(
      `SELECT 1 FROM sales_crm_events
       WHERE lead_id = $1 AND payload->>'external_key' = $2
       LIMIT 1`,
      [leadId, externalKey],
    );
    return rows.length === 0;
  };
  // The same sheet row re-read by sync: nothing new happened, keep lead history clean.
  const isSheetReread = (resurfaced: boolean) => params.resurfaceOn === 'new_external_key' && !resurfaced;
  let resurfacedOperatorId: number | null | undefined;
  const getResurfacedOperatorId = async (resurface: boolean) => {
    if (!resurface) return null;
    if (resurfacedOperatorId === undefined) resurfacedOperatorId = await pickPromoOperator();
    return resurfacedOperatorId;
  };

  if (externalKey) {
    const { rows: byExt } = await db.query<{ id: number }>(
      `SELECT id FROM sales_crm_leads WHERE external_key = $1 LIMIT 1`,
      [externalKey],
    );
    if (byExt[0]) {
      const resurfacePromo = await shouldResurface(byExt[0].id, true);
      const targetOperatorId = await getResurfacedOperatorId(resurfacePromo);
      await db.query(
        `UPDATE sales_crm_leads
         SET source = COALESCE($2, source),
             medium = COALESCE($3, medium),
             campaign = COALESCE($4, campaign),
             ad = COALESCE($5, ad),
             landing_page = COALESCE($6, landing_page),
             phone_normalized = COALESCE($7, phone_normalized),
             utm_source = COALESCE($8, utm_source),
             utm_content = COALESCE($9, utm_content),
             utm_term = COALESCE($10, utm_term),
             sheet_row_number = COALESCE($11, sheet_row_number),
             submitted_at = COALESCE($12::timestamptz, submitted_at),
             status = CASE WHEN $13::boolean AND status IN ('NO_ANSWER','NOT_INTERESTED','INVALID_PHONE','ARCHIVED') THEN 'NEW' ELSE status END,
             next_contact_at = CASE WHEN $13::boolean AND status IN ('NO_ANSWER','NOT_INTERESTED','INVALID_PHONE','ARCHIVED') THEN NULL ELSE next_contact_at END,
             assigned_operator_id = CASE
               WHEN $13::boolean THEN COALESCE(assigned_operator_id, $14::bigint)
               ELSE assigned_operator_id
             END,
             last_action_at = now(),
             updated_at = now()
         WHERE id = $1`,
        [
          byExt[0].id,
          params.source ?? null,
          params.medium ?? null,
          params.campaign ?? null,
          params.ad ?? null,
          params.landingPage ?? null,
          phoneKey,
          params.utmSource ?? null,
          params.utmContent ?? null,
          params.utmTerm ?? null,
          params.sheetRowNumber ?? null,
          params.submittedAt ?? null,
          resurfacePromo,
          targetOperatorId,
        ],
      );
      if (!isSheetReread(resurfacePromo)) await addEvent(byExt[0].id, params.actorId ?? null, 'lead_refreshed', {
        external_key: externalKey,
        source: params.source ?? null,
        resurfaced: resurfacePromo,
        reassigned_operator_id: targetOperatorId,
      });
      return { leadId: byExt[0].id, created: false };
    }
  }

  const { rows: userRows } = await db.query<{
    id: number;
    phone: string | null;
    phone_normalized: string | null;
  }>(`SELECT id, phone, phone_normalized FROM users WHERE id = $1`, [params.userId]);
  const user = userRows[0];
  if (!user) throw new Error('User topilmadi');

  const phone = phoneKey || normalizePhoneKey(user.phone_normalized || user.phone);

  if (phone) {
    const { rows: byPhone } = await db.query<{ id: number; user_id: number; external_key: string | null }>(
      `SELECT id, user_id, external_key FROM sales_crm_leads WHERE phone_normalized = $1 LIMIT 1`,
      [phone],
    );
    if (byPhone[0] && byPhone[0].user_id !== params.userId) {
      const resurfacePromo = await shouldResurface(byPhone[0].id, false);
      const targetOperatorId = await getResurfacedOperatorId(resurfacePromo);
      if (!isSheetReread(resurfacePromo)) {
        await addEvent(byPhone[0].id, params.actorId ?? null, 'duplicate_registration', {
          attempted_user_id: params.userId,
          source: params.source ?? null,
        });
      }
      await db.query(
        `UPDATE sales_crm_leads
         SET source = COALESCE($2, source),
             medium = COALESCE($3, medium),
             campaign = COALESCE($4, campaign),
             ad = COALESCE($5, ad),
             landing_page = COALESCE($6, landing_page),
             utm_source = COALESCE($7, utm_source),
             utm_content = COALESCE($8, utm_content),
             utm_term = COALESCE($9, utm_term),
             external_key = COALESCE(external_key, $10),
             sheet_row_number = COALESCE($11, sheet_row_number),
             submitted_at = COALESCE($12::timestamptz, submitted_at),
             status = CASE WHEN $13::boolean AND status IN ('NO_ANSWER','NOT_INTERESTED','INVALID_PHONE','ARCHIVED') THEN 'NEW' ELSE status END,
             next_contact_at = CASE WHEN $13::boolean AND status IN ('NO_ANSWER','NOT_INTERESTED','INVALID_PHONE','ARCHIVED') THEN NULL ELSE next_contact_at END,
             assigned_operator_id = CASE
               WHEN $13::boolean THEN COALESCE(assigned_operator_id, $14::bigint)
               ELSE assigned_operator_id
             END,
             last_action_at = now(),
             updated_at = now()
         WHERE id = $1`,
        [
          byPhone[0].id,
          params.source ?? null,
          params.medium ?? null,
          params.campaign ?? null,
          params.ad ?? null,
          params.landingPage ?? null,
          params.utmSource ?? null,
          params.utmContent ?? null,
          params.utmTerm ?? null,
          externalKey,
          params.sheetRowNumber ?? null,
          params.submittedAt ?? null,
          resurfacePromo,
          targetOperatorId,
        ],
      );
      if (!isSheetReread(resurfacePromo)) await addEvent(byPhone[0].id, params.actorId ?? null, 'lead_refreshed', {
        attempted_user_id: params.userId,
        source: params.source ?? null,
        external_key: externalKey,
        resurfaced: resurfacePromo,
        reassigned_operator_id: targetOperatorId,
      });
      return { leadId: byPhone[0].id, created: false };
    }
  }

  const { rows: existing } = await db.query<{ id: number }>(
    `SELECT id FROM sales_crm_leads WHERE user_id = $1 LIMIT 1`,
    [params.userId],
  );
  if (existing[0]) {
    const resurfacePromo = await shouldResurface(existing[0].id, false);
    const targetOperatorId = await getResurfacedOperatorId(resurfacePromo);
    await db.query(
      `UPDATE sales_crm_leads
       SET phone_normalized = COALESCE($2, phone_normalized),
           source = COALESCE($3, source),
           medium = COALESCE($4, medium),
           campaign = COALESCE($5, campaign),
           ad = COALESCE($6, ad),
           landing_page = COALESCE($7, landing_page),
           utm_source = COALESCE($8, utm_source),
           utm_content = COALESCE($9, utm_content),
           utm_term = COALESCE($10, utm_term),
           external_key = COALESCE(external_key, $11),
           sheet_row_number = COALESCE($12, sheet_row_number),
           submitted_at = COALESCE($13::timestamptz, submitted_at),
           status = CASE WHEN $14::boolean AND status IN ('NO_ANSWER','NOT_INTERESTED','INVALID_PHONE','ARCHIVED') THEN 'NEW' ELSE status END,
           next_contact_at = CASE WHEN $14::boolean AND status IN ('NO_ANSWER','NOT_INTERESTED','INVALID_PHONE','ARCHIVED') THEN NULL ELSE next_contact_at END,
           assigned_operator_id = CASE
             WHEN $14::boolean THEN COALESCE(assigned_operator_id, $15::bigint)
             ELSE assigned_operator_id
           END,
           last_action_at = now(),
           updated_at = now()
       WHERE id = $1`,
      [
        existing[0].id,
        phone,
        params.source ?? null,
        params.medium ?? null,
        params.campaign ?? null,
        params.ad ?? null,
        params.landingPage ?? null,
        params.utmSource ?? null,
        params.utmContent ?? null,
        params.utmTerm ?? null,
        externalKey,
        params.sheetRowNumber ?? null,
        params.submittedAt ?? null,
        resurfacePromo,
        targetOperatorId,
      ],
    );
    if (!isSheetReread(resurfacePromo)) await addEvent(existing[0].id, params.actorId ?? null, 'lead_refreshed', {
      source: params.source ?? null,
      external_key: externalKey,
      resurfaced: resurfacePromo,
      reassigned_operator_id: targetOperatorId,
    });
    return { leadId: existing[0].id, created: false };
  }

  const { operatorId, mode } = await pickOperatorForLead({ assignment: params.assignment ?? 'default' });

  const { rows: inserted } = await db.query<{ id: number }>(
    `INSERT INTO sales_crm_leads (
       user_id, phone_normalized, assigned_operator_id, status,
       source, medium, campaign, ad, landing_page, last_action_at,
       external_key, sheet_row_number, submitted_at, utm_source, utm_content, utm_term
     ) VALUES ($1,$2,$3,'NEW',$4,$5,$6,$7,$8, now(), $9, $10, $11::timestamptz, $12, $13, $14)
     RETURNING id`,
    [
      params.userId,
      phone,
      operatorId,
      params.source ?? 'website',
      params.medium ?? null,
      params.campaign ?? null,
      params.ad ?? null,
      params.landingPage ?? null,
      externalKey,
      params.sheetRowNumber ?? null,
      params.submittedAt ?? null,
      params.utmSource ?? null,
      params.utmContent ?? null,
      params.utmTerm ?? null,
    ],
  );
  const leadId = inserted[0].id;
  await addEvent(leadId, params.actorId ?? null, 'lead_created', {
    user_id: params.userId,
    source: params.source ?? 'website',
    external_key: externalKey,
  });
  if (operatorId) {
    await addEvent(leadId, null, 'assigned', { operator_id: operatorId, mode });
  }
  return { leadId, created: true };
}

export async function markSalesLeadPaid(params: {
  userId: number;
  amount?: number | null;
  currency?: string | null;
}): Promise<void> {
  const db = requirePool();
  const { rows } = await db.query<{ id: number; status: string }>(
    `SELECT id, status FROM sales_crm_leads WHERE user_id = $1 LIMIT 1`,
    [params.userId],
  );
  if (!rows[0]) {
    await ingestUserAsSalesLead({ userId: params.userId, source: 'payment' });
  }
  const { rows: again } = await db.query<{ id: number; status: string }>(
    `SELECT id, status FROM sales_crm_leads WHERE user_id = $1 LIMIT 1`,
    [params.userId],
  );
  const lead = again[0];
  if (!lead || lead.status === 'PAID') {
    if (lead && params.amount != null) {
      await db.query(
        `UPDATE sales_crm_leads
         SET paid_amount = COALESCE($2, paid_amount),
             paid_currency = COALESCE($3, paid_currency),
             updated_at = now()
         WHERE id = $1`,
        [lead.id, params.amount, params.currency ?? null],
      );
    }
    return;
  }
  await db.query(
    `UPDATE sales_crm_leads
     SET status = 'PAID',
         paid_amount = COALESCE($2, paid_amount),
         paid_currency = COALESCE($3, paid_currency),
         paid_at = now(),
         last_action_at = now(),
         updated_at = now(),
         next_contact_at = NULL
     WHERE id = $1`,
    [lead.id, params.amount ?? null, params.currency ?? null],
  );
  await db.query(
    `UPDATE sales_crm_tasks SET status = 'cancelled', completed_at = now()
     WHERE lead_id = $1 AND status = 'open'`,
    [lead.id],
  );
  await addEvent(lead.id, null, 'paid', {
    from: lead.status,
    amount: params.amount ?? null,
    currency: params.currency ?? null,
  });
}

function dateBounds(preset: string | null | undefined): { from: string | null; to: string | null } {
  if (!preset) return { from: null, to: null };
  const now = new Date();
  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const endOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  };
  if (preset === 'today') {
    return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() };
  }
  if (preset === 'yesterday') {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return { from: startOfDay(y).toISOString(), to: endOfDay(y).toISOString() };
  }
  if (preset === '7d') {
    const f = new Date(now);
    f.setDate(f.getDate() - 7);
    return { from: f.toISOString(), to: now.toISOString() };
  }
  if (preset === '30d') {
    const f = new Date(now);
    f.setDate(f.getDate() - 30);
    return { from: f.toISOString(), to: now.toISOString() };
  }
  if (preset === 'month') {
    const f = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: f.toISOString(), to: now.toISOString() };
  }
  return { from: null, to: null };
}

export async function listSalesLeads(filters: LeadListFilters, db: Pick<Pool, 'query'> = requirePool()) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(500, Math.max(1, filters.pageSize ?? 30));
  const offset = (page - 1) * pageSize;
  const where: string[] = [leadFlowSql(filters.flow, 'l'), leadFlowOwnerSql(filters.flow, 'l')];
  const params: unknown[] = [];
  const add = (sql: string, v: unknown) => {
    params.push(v);
    where.push(sql.replace('?', `$${params.length}`));
  };

  // Old ad leads are hidden from the board for admins too.
  where.push(operatorVisibleLeadSql('l'));
  if (filters.scopeOperatorId) {
    add('l.assigned_operator_id = ?', filters.scopeOperatorId);
  } else if (filters.operatorId != null) {
    if (filters.operatorId === 0) where.push('l.assigned_operator_id IS NULL');
    else add('l.assigned_operator_id = ?', filters.operatorId);
  }

  if (filters.status) {
    const list = Array.isArray(filters.status) ? filters.status : [filters.status];
    const valid = list.filter(isSalesCrmStatus);
    if (valid.length === 1) add('l.status = ?', valid[0]);
    else if (valid.length > 1) {
      params.push(valid);
      where.push(`l.status = ANY($${params.length}::text[])`);
    }
  }

  if (filters.createdFrom) add('l.created_at >= ?::timestamptz', filters.createdFrom);
  if (filters.createdTo) add('l.created_at <= ?::timestamptz', filters.createdTo);

  if (filters.nextContact === 'overdue') {
    where.push(`l.next_contact_at IS NOT NULL AND l.next_contact_at < now() AND l.status NOT IN ('PAID','ARCHIVED','NOT_INTERESTED','INVALID_PHONE')`);
  } else if (filters.nextContact === 'today') {
    where.push(`l.next_contact_at::date = (now() AT TIME ZONE 'Asia/Tashkent')::date`);
  } else if (filters.nextContact === 'tomorrow') {
    where.push(`l.next_contact_at::date = ((now() AT TIME ZONE 'Asia/Tashkent')::date + 1)`);
  } else if (filters.nextContact === 'none') {
    where.push(`l.next_contact_at IS NULL AND l.status NOT IN ('PAID','ARCHIVED','NOT_INTERESTED','INVALID_PHONE')`);
  }

  const search = salesLeadSearch(filters.q, params);
  if (search) where.push(search);

  const whereSql = where.join(' AND ');
  const countRes = await db.query<{ n: string }>(
    `SELECT count(*)::text AS n
     FROM sales_crm_leads l
     JOIN users u ON u.id = l.user_id
     WHERE ${whereSql}`,
    params,
  );
  const total = Number(countRes.rows[0]?.n ?? 0);

  params.push(pageSize);
  const lim = `$${params.length}`;
  params.push(offset);
  const off = `$${params.length}`;

  const { rows } = await db.query(
    `SELECT
       l.id, l.user_id, l.status, l.source, l.utm_source, l.medium, l.campaign, l.ad, l.utm_content, l.utm_term,
       l.assigned_operator_id, l.phone_normalized,
       l.last_contact_at, l.next_contact_at, l.last_action_at,
       l.paid_amount, l.paid_currency, l.paid_at, l.support_group_at,
       acc.access_at, fl.first_login_at,
       l.created_at, l.updated_at,
       u.first_name, u.last_name, u.phone, u.email,
       a.name AS operator_name
     FROM sales_crm_leads l
     JOIN users u ON u.id = l.user_id
     LEFT JOIN sales_crm_agents a ON a.id = l.assigned_operator_id
     LEFT JOIN LATERAL (
       SELECT min(x.at) AS access_at
       FROM (
         SELECT coalesce(p.approved_at, p.payment_time, p.created_at) AS at
         FROM payments p
         WHERE p.user_id = l.user_id AND p.status = 'approved'
         UNION ALL
         SELECT s.started_at
         FROM subscriptions s
         WHERE s.user_id = l.user_id
       ) x
       WHERE x.at IS NOT NULL
     ) acc ON true
     LEFT JOIN LATERAL (
       SELECT min(x.at) AS first_login_at
       FROM (
         SELECT (d.activity_date::timestamp AT TIME ZONE 'Asia/Tashkent') AS at
         FROM user_activity_dates d
         WHERE d.user_id = l.user_id
           AND acc.access_at IS NOT NULL
           AND d.activity_date > (acc.access_at AT TIME ZONE 'Asia/Tashkent')::date
         UNION ALL
         SELECT t.updated_at
         FROM user_daily_time t
         WHERE t.user_id = l.user_id
           AND acc.access_at IS NOT NULL
           AND t.activity_date = (acc.access_at AT TIME ZONE 'Asia/Tashkent')::date
           AND t.updated_at > acc.access_at
       ) x
     ) fl ON true
     WHERE ${whereSql}
     ORDER BY
       CASE WHEN l.next_contact_at IS NOT NULL AND l.next_contact_at < now() THEN 0 ELSE 1 END,
       l.next_contact_at NULLS LAST,
       l.created_at DESC
     LIMIT ${lim} OFFSET ${off}`,
    params,
  );

  return { items: rows, total, page, pageSize };
}

export async function getSalesLead(leadId: number, scopeOperatorId?: number | null) {
  const db = requirePool();
  const params: unknown[] = [leadId];
  let scope = '';
  if (scopeOperatorId) {
    params.push(scopeOperatorId);
    scope = ` AND l.assigned_operator_id = $2 AND ${operatorVisibleLeadSql('l')}`;
  }
  const { rows } = await db.query(
    `SELECT
       l.*,
       u.first_name, u.last_name, u.phone, u.email, u.created_at AS user_created_at,
       a.name AS operator_name, a.login AS operator_login
     FROM sales_crm_leads l
     JOIN users u ON u.id = l.user_id
     LEFT JOIN sales_crm_agents a ON a.id = l.assigned_operator_id
     WHERE l.id = $1${scope}`,
    params,
  );
  if (!rows[0]) return null;

  const { rows: events } = await db.query(
    `SELECT e.id, e.event_type, e.payload, e.created_at, e.actor_id, a.name AS actor_name
     FROM sales_crm_events e
     LEFT JOIN sales_crm_agents a ON a.id = e.actor_id
     WHERE e.lead_id = $1
     ORDER BY e.created_at DESC
     LIMIT 200`,
    [leadId],
  );
  const { rows: comments } = await db.query(
    `SELECT c.id, c.comment, c.created_at, c.agent_id, a.name AS agent_name
     FROM sales_crm_comments c
     JOIN sales_crm_agents a ON a.id = c.agent_id
     WHERE c.lead_id = $1
     ORDER BY c.created_at DESC
     LIMIT 100`,
    [leadId],
  );
  const { rows: tasks } = await db.query(
    `SELECT * FROM sales_crm_tasks WHERE lead_id = $1 ORDER BY scheduled_at DESC LIMIT 50`,
    [leadId],
  );
  const { rows: calls } = await db.query(
    `SELECT c.*, a.name AS operator_name
     FROM sales_crm_calls c
     JOIN sales_crm_agents a ON a.id = c.operator_id
     WHERE c.lead_id = $1
     ORDER BY c.called_at DESC
     LIMIT 50`,
    [leadId],
  );

  return { lead: rows[0], events, comments, tasks, calls };
}

export async function assignLead(leadId: number, operatorId: number | null, actorId: number) {
  const db = requirePool();
  if (operatorId != null) {
    const { rows } = await db.query(
      `SELECT id FROM sales_crm_agents WHERE id = $1 AND active = true`,
      [operatorId],
    );
    if (!rows[0]) throw Object.assign(new Error('Operator topilmadi'), { status: 400 });
  }
  const { rows: before } = await db.query<{ assigned_operator_id: number | null }>(
    `SELECT assigned_operator_id FROM sales_crm_leads WHERE id = $1`,
    [leadId],
  );
  if (!before[0]) throw Object.assign(new Error('Lead topilmadi'), { status: 404 });
  await db.query(
    `UPDATE sales_crm_leads
     SET assigned_operator_id = $2, last_action_at = now(), updated_at = now()
     WHERE id = $1`,
    [leadId, operatorId],
  );
  await addEvent(leadId, actorId, 'assigned', {
    from: before[0].assigned_operator_id,
    to: operatorId,
  });
}

export async function changeLeadStatus(params: {
  leadId: number;
  status: SalesCrmStatus;
  actorId: number;
  scopeOperatorId?: number | null;
  confirmPaidDowngrade?: boolean;
  comment?: string | null;
  nextContactAt?: string | null;
}) {
  const db = requirePool();
  const scopeParams: unknown[] = [params.leadId];
  let scope = '';
  if (params.scopeOperatorId) {
    scopeParams.push(params.scopeOperatorId);
    scope = ` AND assigned_operator_id = $2`;
  }
  const { rows } = await db.query<{ status: string; assigned_operator_id: number | null }>(
    `SELECT status, assigned_operator_id FROM sales_crm_leads WHERE id = $1${scope}`,
    scopeParams,
  );
  if (!rows[0]) throw Object.assign(new Error('Lead topilmadi'), { status: 404 });
  const old = rows[0].status;
  const reqs = stageMoveRequirements(params.status);
  const comment = String(params.comment || '').trim();
  const nextRaw = params.nextContactAt ? String(params.nextContactAt).trim() : '';

  if (reqs.requireComment && comment.length < 2) {
    throw Object.assign(new Error('Bu bosqich uchun izoh majburiy'), {
      status: 400,
      code: 'COMMENT_REQUIRED',
    });
  }
  if (reqs.requireNextContact) {
    const when = new Date(nextRaw);
    if (!nextRaw || Number.isNaN(when.getTime())) {
      throw Object.assign(new Error('Keyingi kontakt vaqti aniq ko‘rsatilishi shart'), {
        status: 400,
        code: 'NEXT_CONTACT_REQUIRED',
      });
    }
  }

  if (old === 'PAID' && params.status !== 'PAID' && !params.confirmPaidDowngrade) {
    throw Object.assign(new Error('PAID statusni o‘zgartirish uchun tasdiq kerak'), {
      status: 409,
      code: 'CONFIRM_PAID_DOWNGRADE',
    });
  }

  if (old !== params.status) {
    await db.query(
      `UPDATE sales_crm_leads
       SET status = $2, last_action_at = now(), updated_at = now()
       WHERE id = $1`,
      [params.leadId, params.status],
    );
    await addEvent(params.leadId, params.actorId, 'status_changed', {
      from: old,
      to: params.status,
    });
    await markPresentationIfImplied(params.leadId, { status: params.status });
  }

  if ((SALES_CRM_TERMINAL_STATUSES as readonly string[]).includes(params.status)) {
    await db.query(
      `UPDATE sales_crm_tasks
       SET status = 'cancelled', completed_at = now()
       WHERE lead_id = $1 AND status = 'open'`,
      [params.leadId],
    );
  }

  if (comment) {
    await addLeadComment(params.leadId, params.actorId, comment, params.scopeOperatorId);
  }

  if (nextRaw) {
    const operatorId = rows[0].assigned_operator_id || params.actorId;
    await scheduleTask({
      leadId: params.leadId,
      operatorId,
      scheduledAt: nextRaw,
      note: comment || `Bosqich: ${params.status}`,
      actorId: params.actorId,
    });
  }
}

export async function addLeadComment(leadId: number, agentId: number, comment: string, scopeOperatorId?: number | null) {
  const db = requirePool();
  const text = comment.trim();
  if (!text) throw Object.assign(new Error('Izoh bo‘sh'), { status: 400 });
  if (scopeOperatorId) {
    const { rows } = await db.query(
      `SELECT id FROM sales_crm_leads WHERE id = $1 AND assigned_operator_id = $2`,
      [leadId, scopeOperatorId],
    );
    if (!rows[0]) throw Object.assign(new Error('Lead topilmadi'), { status: 404 });
  }
  await db.query(
    `INSERT INTO sales_crm_comments (lead_id, agent_id, comment) VALUES ($1,$2,$3)`,
    [leadId, agentId, text.slice(0, 2000)],
  );
  await db.query(
    `UPDATE sales_crm_leads SET last_action_at = now(), updated_at = now() WHERE id = $1`,
    [leadId],
  );
  await addEvent(leadId, agentId, 'comment', { preview: text.slice(0, 120) });
}

export async function scheduleTask(params: {
  leadId: number;
  operatorId: number;
  scheduledAt: string;
  note?: string | null;
  actorId: number;
  cancelOpenDuplicates?: boolean;
}) {
  const db = requirePool();
  const when = new Date(params.scheduledAt);
  if (Number.isNaN(when.getTime())) {
    throw Object.assign(new Error('Noto‘g‘ri sana'), { status: 400 });
  }
  if (params.cancelOpenDuplicates !== false) {
    await db.query(
      `UPDATE sales_crm_tasks SET status = 'cancelled', completed_at = now()
       WHERE lead_id = $1 AND status = 'open'`,
      [params.leadId],
    );
  }
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO sales_crm_tasks (lead_id, operator_id, task_type, scheduled_at, note)
     VALUES ($1,$2,'call',$3,$4)
     RETURNING id`,
    [params.leadId, params.operatorId, when.toISOString(), params.note?.slice(0, 2000) ?? null],
  );
  await db.query(
    `UPDATE sales_crm_leads
     SET next_contact_at = $2, last_action_at = now(), updated_at = now()
     WHERE id = $1`,
    [params.leadId, when.toISOString()],
  );
  await addEvent(params.leadId, params.actorId, 'task_scheduled', {
    task_id: rows[0].id,
    scheduled_at: when.toISOString(),
  });
  return rows[0].id;
}

export async function completeTask(taskId: number, actorId: number, scopeOperatorId?: number | null) {
  const db = requirePool();
  const params: unknown[] = [taskId];
  let scope = '';
  if (scopeOperatorId) {
    params.push(scopeOperatorId);
    scope = ` AND operator_id = $2`;
  }
  const { rows } = await db.query<{ id: number; lead_id: number; status: string }>(
    `SELECT id, lead_id, status FROM sales_crm_tasks WHERE id = $1${scope}`,
    params,
  );
  if (!rows[0]) throw Object.assign(new Error('Vazifa topilmadi'), { status: 404 });
  if (rows[0].status !== 'open') return;
  await db.query(
    `UPDATE sales_crm_tasks SET status = 'done', completed_at = now() WHERE id = $1`,
    [taskId],
  );
  await addEvent(rows[0].lead_id, actorId, 'task_done', { task_id: taskId });
}

export async function logCall(params: {
  leadId: number;
  operatorId: number;
  answered: boolean;
  result: SalesCrmCallResult;
  comment?: string | null;
  nextContactAt?: string | null;
  scopeOperatorId?: number | null;
}) {
  const db = requirePool();
  const scopeParams: unknown[] = [params.leadId];
  let scope = '';
  if (params.scopeOperatorId) {
    scopeParams.push(params.scopeOperatorId);
    scope = ` AND assigned_operator_id = $2`;
  }
  const { rows: leadRows } = await db.query<{ id: number; status: string; assigned_operator_id: number | null }>(
    `SELECT id, status, assigned_operator_id FROM sales_crm_leads WHERE id = $1${scope}`,
    scopeParams,
  );
  if (!leadRows[0]) throw Object.assign(new Error('Lead topilmadi'), { status: 404 });

  const nextStatus = statusAfterCallResult(params.result);
  let nextAt: string | null = null;
  if (params.nextContactAt) {
    const d = new Date(params.nextContactAt);
    if (Number.isNaN(d.getTime())) throw Object.assign(new Error('Noto‘g‘ri sana'), { status: 400 });
    nextAt = d.toISOString();
  }

  await db.query(
    `INSERT INTO sales_crm_calls (lead_id, operator_id, answered, result, comment, next_contact_at)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      params.leadId,
      params.operatorId,
      params.answered,
      params.result,
      params.comment?.slice(0, 2000) ?? null,
      nextAt,
    ],
  );

  await db.query(
    `UPDATE sales_crm_leads
     SET status = $2,
         last_contact_at = now(),
         next_contact_at = $3,
         last_action_at = now(),
         updated_at = now()
     WHERE id = $1`,
    [params.leadId, nextStatus, nextAt],
  );

  await db.query(
    `UPDATE sales_crm_tasks SET status = 'done', completed_at = now()
     WHERE lead_id = $1 AND status = 'open' AND scheduled_at <= now() + interval '2 hours'`,
    [params.leadId],
  );

  if (nextAt) {
    await scheduleTask({
      leadId: params.leadId,
      operatorId: params.operatorId,
      scheduledAt: nextAt,
      note: params.comment ?? null,
      actorId: params.operatorId,
    });
  }

  await markPresentationIfImplied(params.leadId, { callResult: params.result });

  await addEvent(params.leadId, params.operatorId, 'call_logged', {
    answered: params.answered,
    result: params.result,
    status: nextStatus,
    next_contact_at: nextAt,
  });

  return { status: nextStatus, nextContactAt: nextAt };
}

export async function listTasks(params: {
  operatorId?: number | null;
  scopeOperatorId?: number | null;
  bucket?: 'overdue' | 'today' | 'done' | 'all';
}) {
  const db = requirePool();
  const where: string[] = ['1=1'];
  const q: unknown[] = [];
  const add = (sql: string, v: unknown) => {
    q.push(v);
    where.push(sql.replace('?', `$${q.length}`));
  };
  const op = params.scopeOperatorId ?? params.operatorId;
  if (op) {
    add('t.operator_id = ?', op);
    where.push(operatorVisibleLeadSql('l'));
    if (params.scopeOperatorId) add('l.assigned_operator_id = ?', params.scopeOperatorId);
  }
  where.push(`l.status NOT IN ('PAID','ARCHIVED','NOT_INTERESTED','INVALID_PHONE')`);

  if (params.bucket === 'overdue') {
    where.push(`t.status = 'open' AND t.scheduled_at < now()`);
  } else if (params.bucket === 'today') {
    where.push(
      `t.status = 'open' AND t.scheduled_at::date = (now() AT TIME ZONE 'Asia/Tashkent')::date`,
    );
  } else if (params.bucket === 'done') {
    where.push(`t.status = 'done' AND t.completed_at::date = (now() AT TIME ZONE 'Asia/Tashkent')::date`);
  } else {
    where.push(`t.status = 'open'`);
  }

  const { rows } = await db.query(
    `SELECT
       t.*,
       l.status AS lead_status, l.phone_normalized,
       u.first_name, u.last_name, u.phone
     FROM sales_crm_tasks t
     JOIN sales_crm_leads l ON l.id = t.lead_id
     JOIN users u ON u.id = l.user_id
     WHERE ${where.join(' AND ')}
     ORDER BY t.scheduled_at ASC
     LIMIT 200`,
    q,
  );
  return rows;
}

export async function getTaskSummary(scopeOperatorId?: number | null) {
  const db = requirePool();
  const params: unknown[] = [];
  let opFilter = '';
  let leadJoin = '';
  if (scopeOperatorId) {
    params.push(scopeOperatorId);
    opFilter = ` AND t.operator_id = $1`;
    leadJoin = `JOIN sales_crm_leads l
      ON l.id = t.lead_id
     AND l.assigned_operator_id = $1
     AND ${operatorVisibleLeadSql('l')}
     AND l.status NOT IN ('PAID','ARCHIVED','NOT_INTERESTED','INVALID_PHONE')`;
  } else {
    leadJoin = `JOIN sales_crm_leads l
      ON l.id = t.lead_id
     AND l.status NOT IN ('PAID','ARCHIVED','NOT_INTERESTED','INVALID_PHONE')`;
  }
  const { rows } = await db.query(
    `SELECT
       count(*) FILTER (WHERE t.status = 'open' AND t.scheduled_at < now())::int AS overdue,
       count(*) FILTER (
         WHERE t.status = 'open'
           AND t.scheduled_at::date = (now() AT TIME ZONE 'Asia/Tashkent')::date
       )::int AS today,
       count(*) FILTER (
         WHERE t.status = 'done'
           AND t.completed_at::date = (now() AT TIME ZONE 'Asia/Tashkent')::date
       )::int AS done_today,
       count(*) FILTER (WHERE t.status = 'open')::int AS open_total
     FROM sales_crm_tasks t
     ${leadJoin}
     WHERE 1=1${opFilter}`,
    params,
  );
  return rows[0];
}

export async function getDashboard(params: {
  scopeOperatorId?: number | null;
  period?: string | null;
  from?: string | null;
  to?: string | null;
  flow?: SalesCrmLeadFlow | null;
}) {
  const db = requirePool();
  const bounds =
    params.from || params.to
      ? { from: params.from ?? null, to: params.to ?? null }
      : dateBounds(params.period ?? '30d');

  const q: unknown[] = [];
  const leadWhere: string[] = [leadFlowSql(params.flow), leadFlowOwnerSql(params.flow)];
  if (params.scopeOperatorId) {
    q.push(params.scopeOperatorId);
    leadWhere.push(`assigned_operator_id = $${q.length}`);
    leadWhere.push(operatorVisibleLeadSql());
  }
  if (bounds.from) {
    q.push(bounds.from);
    leadWhere.push(`created_at >= $${q.length}::timestamptz`);
  }
  if (bounds.to) {
    q.push(bounds.to);
    leadWhere.push(`created_at <= $${q.length}::timestamptz`);
  }
  const w = leadWhere.join(' AND ');

  const { rows: byStatus } = await db.query(
    `SELECT status, count(*)::int AS n FROM sales_crm_leads WHERE ${w} GROUP BY status`,
    q,
  );
  const statusMap: Record<string, number> = {};
  let total = 0;
  for (const r of byStatus) {
    statusMap[r.status] = Number(r.n);
    total += Number(r.n);
  }

  const taskSummary = await getTaskSummary(params.scopeOperatorId ?? null);

  const { rows: noNext } = await db.query(
    `SELECT count(*)::int AS n FROM sales_crm_leads
     WHERE ${w}
       AND next_contact_at IS NULL
       AND status NOT IN ('PAID','ARCHIVED','NOT_INTERESTED','INVALID_PHONE')`,
    q,
  );

  const paid = statusMap.PAID ?? 0;
  const answered =
    (statusMap.ANSWERED ?? 0) +
    (statusMap.FOLLOW_UP ?? 0) +
    (statusMap.THINKING ?? 0) +
    (statusMap.PAYMENT_PENDING ?? 0) +
    paid;
  const contacted =
    answered + (statusMap.CALLED ?? 0) + (statusMap.NO_ANSWER ?? 0) + (statusMap.CALLBACK ?? 0);

  return {
    period: { from: bounds.from, to: bounds.to },
    totals: {
      leads: total,
      new: statusMap.NEW ?? 0,
      to_call: statusMap.TO_CALL ?? 0,
      answered,
      no_answer: statusMap.NO_ANSWER ?? 0,
      follow_up: (statusMap.FOLLOW_UP ?? 0) + (statusMap.THINKING ?? 0),
      payment_pending: statusMap.PAYMENT_PENDING ?? 0,
      paid,
      not_interested: statusMap.NOT_INTERESTED ?? 0,
      no_next_action: Number(noNext[0]?.n ?? 0),
    },
    conversion: {
      lead_to_contact: total ? contacted / total : 0,
      contact_to_interested: contacted ? answered / contacted : 0,
      interested_to_payment: answered ? (statusMap.PAYMENT_PENDING ?? 0) / answered : 0,
      lead_to_payment: total ? paid / total : 0,
    },
    tasks: taskSummary,
    by_status: statusMap,
  };
}

export async function getOperatorStats(params: {
  period?: string | null;
  from?: string | null;
  to?: string | null;
  flow?: SalesCrmLeadFlow | null;
}) {
  const db = requirePool();
  const bounds =
    params.from || params.to
      ? { from: params.from ?? null, to: params.to ?? null }
      : dateBounds(params.period ?? '30d');

  const q: unknown[] = [];
  let leadDate = ` AND ${leadFlowSql(params.flow, 'l')}`;
  let callDate = '';
  if (params.flow) {
    callDate += ` AND EXISTS (
      SELECT 1 FROM sales_crm_leads lc
      WHERE lc.id = c.lead_id AND ${leadFlowSql(params.flow, 'lc')} AND ${leadFlowOwnerSql(params.flow, 'lc')}
    )`;
  }
  if (bounds.from) {
    q.push(bounds.from);
    leadDate += ` AND l.created_at >= $${q.length}::timestamptz`;
    callDate += ` AND c.called_at >= $${q.length}::timestamptz`;
  }
  if (bounds.to) {
    q.push(bounds.to);
    leadDate += ` AND l.created_at <= $${q.length}::timestamptz`;
    callDate += ` AND c.called_at <= $${q.length}::timestamptz`;
  }
  const agentFlowWhere =
    params.flow === 'promo'
      ? `AND a.id IS DISTINCT FROM (
          SELECT id FROM sales_crm_agents
          WHERE active = true AND role = 'operator'
          ORDER BY id ASC
          LIMIT 1
        )`
      : params.flow === 'platform'
        ? `AND a.id = (
            SELECT id FROM sales_crm_agents
            WHERE active = true AND role = 'operator'
            ORDER BY id ASC
            LIMIT 1
          )`
        : '';

  const { rows } = await db.query(
    `SELECT
       a.id, a.name, a.login, a.active,
       count(DISTINCT l.id)::int AS leads,
       count(DISTINCT l.id) FILTER (
         WHERE l.status IS DISTINCT FROM 'NEW'
            OR EXISTS (
              SELECT 1 FROM sales_crm_calls cx
              WHERE cx.lead_id = l.id AND cx.operator_id = a.id
            )
       )::int AS processed,
       count(DISTINCT c.id)::int AS calls,
       count(DISTINCT c.id) FILTER (WHERE c.answered)::int AS answered_calls,
       count(DISTINCT c.id) FILTER (WHERE NOT c.answered)::int AS no_answer_calls,
       count(DISTINCT l.id) FILTER (WHERE l.status = 'PAID')::int AS paid,
       count(DISTINCT l.id) FILTER (WHERE l.status = 'PAYMENT_PENDING')::int AS payment_pending,
       count(DISTINCT l.id) FILTER (WHERE l.status = 'NOT_INTERESTED')::int AS refused,
       coalesce(sum(l.paid_amount) FILTER (WHERE l.status = 'PAID'), 0)::float AS paid_sum,
       count(DISTINCT l.id) FILTER (
         WHERE l.next_contact_at IS NULL
           AND l.status NOT IN ('PAID','ARCHIVED','NOT_INTERESTED','INVALID_PHONE')
       )::int AS no_next_action,
       (
         SELECT count(*)::int FROM sales_crm_tasks t
         WHERE t.operator_id = a.id AND t.status = 'open' AND t.scheduled_at < now()
       ) AS overdue_tasks
     FROM sales_crm_agents a
     LEFT JOIN sales_crm_leads l ON l.assigned_operator_id = a.id ${leadDate}
     LEFT JOIN sales_crm_calls c ON c.operator_id = a.id ${callDate}
     WHERE a.role = 'operator' ${agentFlowWhere}
     GROUP BY a.id
     ORDER BY a.name ASC`,
    q,
  );

  return rows.map((r) => {
    const leads = Number(r.leads) || 0;
    const paid = Number(r.paid) || 0;
    const processed = Number(r.processed) || 0;
    return {
      ...r,
      leads,
      processed,
      paid,
      payment_pending: Number(r.payment_pending) || 0,
      refused: Number(r.refused) || 0,
      conversion: leads ? paid / leads : 0,
      process_rate: leads ? processed / leads : 0,
    };
  });
}

export async function listAgents(activeOnly = false) {
  const db = requirePool();
  const { rows } = await db.query(
    `SELECT id, login, name, role, active, created_at
     FROM sales_crm_agents
     ${activeOnly ? 'WHERE active = true' : ''}
     ORDER BY role DESC, name ASC`,
  );
  return rows;
}

export async function createAgent(params: {
  login: string;
  name: string;
  passwordHash: string;
  role?: 'admin' | 'operator';
}) {
  const db = requirePool();
  const { rows } = await db.query(
    `INSERT INTO sales_crm_agents (login, name, password_hash, role, active)
     VALUES ($1, $2, $3, $4, true)
     RETURNING id, login, name, role, active, created_at`,
    [params.login, params.name, params.passwordHash, params.role ?? 'operator'],
  );
  return rows[0];
}

export async function updateAgent(params: {
  id: number;
  name?: string;
  login?: string;
  passwordHash?: string;
  active?: boolean;
}) {
  const db = requirePool();
  const sets: string[] = ['updated_at = now()'];
  const values: unknown[] = [params.id];
  const add = (sql: string, value: unknown) => {
    values.push(value);
    sets.push(sql.replace('?', `$${values.length}`));
  };
  if (params.name != null) add('name = ?', params.name);
  if (params.login != null) add('login = ?', params.login);
  if (params.passwordHash != null) add('password_hash = ?', params.passwordHash);
  if (params.active != null) add('active = ?', params.active);
  const { rows } = await db.query(
    `UPDATE sales_crm_agents
     SET ${sets.join(', ')}
     WHERE id = $1 AND role = 'operator'
     RETURNING id, login, name, role, active, created_at`,
    values,
  );
  if (!rows[0]) throw Object.assign(new Error('Operator topilmadi'), { status: 404 });
  return rows[0];
}

export async function getAssignmentMode() {
  return {
    mode: (await getSetting('assignment_mode')) || 'round_robin',
  };
}

export async function setAssignmentMode(mode: 'manual' | 'round_robin') {
  await setSetting('assignment_mode', mode);
}

export async function syncRecentRegistrations(limit = 200): Promise<number> {
  const db = requirePool();
  const { rows } = await db.query<{ id: number; phone: string | null; phone_normalized: string | null }>(
    `SELECT u.id, u.phone, u.phone_normalized
     FROM users u
     LEFT JOIN sales_crm_leads l ON l.user_id = u.id
     WHERE l.id IS NULL
       AND u.account_type = 'student'
       AND (u.phone_normalized IS NOT NULL OR u.phone IS NOT NULL)
     ORDER BY u.created_at DESC
     LIMIT $1`,
    [limit],
  );
  let n = 0;
  for (const u of rows) {
    await ingestUserAsSalesLead({
      userId: u.id,
      phone: u.phone_normalized || u.phone,
      source: 'backfill',
      assignment: 'registration',
    });
    n += 1;
  }
  return n;
}
