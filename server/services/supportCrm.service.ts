/**
 * supportCrm.service.ts — retention queue + contact logs for Support CRM.
 */
import { pool } from '../lib/db.js';

const IDLE_HOURS = 72;

export type ContactChannel =
  | 'phone'
  | 'telegram'
  | 'whatsapp'
  | 'max'
  | 'imo'
  | 'email'
  | 'other';
export type ContactOutcome =
  | 'reached'
  | 'no_answer'
  | 'no_pickup'
  | 'no_contact'
  | 'no_telegram'
  | 'no_whatsapp'
  | 'no_imo'
  | 'in_progress'
  | 'other';
export type ContactResult = 'returned_ok' | 'helped_login' | 'needs_fix' | 'feedback' | 'other';

export type QueueFilter = 'needs_contact' | 'contacted_today' | 'in_progress';

export type QueueRow = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  plan_name: string | null;
  plan_expires_at: string;
  total_time_seconds: number;
  last_kunlik_at: string | null;
  idle_since: string;
  idle_hours: number;
  last_contact_at: string | null;
  last_contact_channel: string | null;
  last_contact_outcome: string | null;
};

export type ContactRow = {
  id: number;
  agent_id: number;
  agent_name: string | null;
  user_id: number;
  channel: string;
  channel_other: string | null;
  outcome: string;
  result: string | null;
  comment_text: string | null;
  created_at: string;
};

function requirePool() {
  if (!pool) throw new Error('DATABASE_URL kerak');
  return pool;
}

/** Shared SELECT for premium + idle users. */
const QUEUE_BASE_SQL = `
  WITH last_kunlik AS (
    SELECT user_id, MAX(updated_at) AS last_kunlik_at
    FROM user_kunlik_day_progress
    GROUP BY user_id
  ),
  last_contact AS (
    SELECT DISTINCT ON (user_id)
      user_id,
      created_at AS last_contact_at,
      channel AS last_contact_channel,
      outcome AS last_contact_outcome
    FROM support_crm_contacts
    ORDER BY user_id, created_at DESC
  ),
  candidates AS (
    SELECT
      u.id,
      u.first_name,
      u.last_name,
      u.phone,
      u.email,
      u.plan_name,
      u.plan_expires_at,
      COALESCE(u.total_time_seconds, 0)::bigint AS total_time_seconds,
      lk.last_kunlik_at,
      COALESCE(lk.last_kunlik_at, u.created_at) AS idle_since,
      lc.last_contact_at,
      lc.last_contact_channel,
      lc.last_contact_outcome
    FROM users u
    LEFT JOIN last_kunlik lk ON lk.user_id = u.id
    LEFT JOIN last_contact lc ON lc.user_id = u.id
    WHERE u.plan_expires_at IS NOT NULL
      AND u.plan_expires_at > now()
      AND COALESCE(lk.last_kunlik_at, u.created_at) <= now() - ($1::text || ' hours')::interval
  )
`;

export async function getSupportCrmStats(): Promise<{
  queue_count: number;
  in_progress_count: number;
  contacted_today: number;
  reached_today: number;
  no_pickup_today: number;
}> {
  const db = requirePool();
  const { rows } = await db.query<{
    queue_count: number;
    in_progress_count: number;
    contacted_today: number;
    reached_today: number;
    no_pickup_today: number;
  }>(
    `${QUEUE_BASE_SQL}
    SELECT
      (
        SELECT COUNT(*)::int FROM candidates
        WHERE last_contact_outcome IS NULL OR last_contact_outcome <> 'in_progress'
      ) AS queue_count,
      (
        SELECT COUNT(*)::int FROM candidates
        WHERE last_contact_outcome = 'in_progress'
      ) AS in_progress_count,
      (
        SELECT COUNT(*)::int FROM support_crm_contacts
        WHERE created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Tashkent')
              AT TIME ZONE 'Asia/Tashkent'
      ) AS contacted_today,
      (
        SELECT COUNT(*)::int FROM support_crm_contacts
        WHERE outcome = 'reached'
          AND created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Tashkent')
                AT TIME ZONE 'Asia/Tashkent'
      ) AS reached_today,
      (
        SELECT COUNT(*)::int FROM support_crm_contacts
        WHERE outcome IN ('no_pickup', 'no_answer')
          AND created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Tashkent')
                AT TIME ZONE 'Asia/Tashkent'
      ) AS no_pickup_today
    `,
    [String(IDLE_HOURS)]
  );
  const r = rows[0];
  return {
    queue_count: Number(r?.queue_count ?? 0),
    in_progress_count: Number(r?.in_progress_count ?? 0),
    contacted_today: Number(r?.contacted_today ?? 0),
    reached_today: Number(r?.reached_today ?? 0),
    no_pickup_today: Number(r?.no_pickup_today ?? 0),
  };
}

export async function listSupportCrmQueue(opts: {
  filter?: QueueFilter;
  limit?: number;
  offset?: number;
}): Promise<{ rows: QueueRow[]; total: number }> {
  const db = requirePool();
  const filter: QueueFilter =
    opts.filter === 'contacted_today'
      ? 'contacted_today'
      : opts.filter === 'in_progress'
        ? 'in_progress'
        : 'needs_contact';
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const offset = Math.max(opts.offset ?? 0, 0);

  const dayFilter =
    filter === 'in_progress'
      ? `AND last_contact_outcome = 'in_progress'`
      : filter === 'contacted_today'
        ? `AND last_contact_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Tashkent') AT TIME ZONE 'Asia/Tashkent'
           AND (last_contact_outcome IS NULL OR last_contact_outcome <> 'in_progress')`
        : `AND (
             last_contact_at IS NULL
             OR last_contact_at < date_trunc('day', now() AT TIME ZONE 'Asia/Tashkent') AT TIME ZONE 'Asia/Tashkent'
           )
           AND (last_contact_outcome IS NULL OR last_contact_outcome <> 'in_progress')`;

  const { rows } = await db.query<QueueRow>(
    `${QUEUE_BASE_SQL}
     SELECT
       id,
       first_name,
       last_name,
       phone,
       email,
       plan_name,
       plan_expires_at,
       total_time_seconds,
       last_kunlik_at,
       idle_since,
       GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - idle_since)) / 3600))::int AS idle_hours,
       last_contact_at,
       last_contact_channel,
       last_contact_outcome
     FROM candidates
     WHERE TRUE
       ${dayFilter}
     ORDER BY idle_since ASC
     LIMIT $2 OFFSET $3
    `,
    [String(IDLE_HOURS), limit, offset]
  );

  const totalRes = await db.query<{ total: number }>(
    `${QUEUE_BASE_SQL}
     SELECT COUNT(*)::int AS total
     FROM candidates
     WHERE TRUE
       ${dayFilter}
    `,
    [String(IDLE_HOURS)]
  );

  return { rows, total: Number(totalRes.rows[0]?.total ?? 0) };
}

export async function getSupportCrmUser(userId: number): Promise<{
  user: {
    id: number;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    email: string | null;
    plan_name: string | null;
    plan_expires_at: string | null;
    plan_started_at: string | null;
    plan_days_left: number | null;
    total_time_seconds: number;
    created_at: string;
    last_kunlik_at: string | null;
    idle_since: string | null;
    idle_hours: number | null;
    idle_days: number;
    premium_active: boolean;
  };
  progress: {
    total_days: number;
    current_day: number;
    completed_days: number;
    stages: { id: string; label: string; status: 'done' | 'active' | 'todo' }[];
  } | null;
  contacts: ContactRow[];
} | null> {
  const db = requirePool();
  const { rows } = await db.query<{
    id: number;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    email: string | null;
    plan_name: string | null;
    plan_expires_at: string | null;
    total_time_seconds: number;
    created_at: string;
    last_kunlik_at: string | null;
    plan_started_at: string | null;
  }>(
    `SELECT
       u.id,
       u.first_name,
       u.last_name,
       u.phone,
       u.email,
       u.plan_name,
       u.plan_expires_at,
       COALESCE(u.total_time_seconds, 0)::bigint AS total_time_seconds,
       u.created_at,
       (SELECT MAX(updated_at) FROM user_kunlik_day_progress p WHERE p.user_id = u.id) AS last_kunlik_at,
       (
         SELECT MIN(COALESCE(pay.approved_at, pay.created_at))
         FROM payments pay
         WHERE pay.user_id = u.id
           AND pay.status = 'approved'
       ) AS plan_started_at
     FROM users u
     WHERE u.id = $1`,
    [userId]
  );
  const u = rows[0];
  if (!u) return null;

  const idleSince = u.last_kunlik_at ?? u.created_at;
  const idleHours = Math.max(
    0,
    Math.floor((Date.now() - new Date(idleSince).getTime()) / 3_600_000)
  );
  const idleDays = Math.floor(idleHours / 24);
  const premiumActive = Boolean(u.plan_expires_at && new Date(u.plan_expires_at).getTime() > Date.now());
  const planDaysLeft = u.plan_expires_at
    ? Math.max(0, Math.ceil((new Date(u.plan_expires_at).getTime() - Date.now()) / 86_400_000))
    : null;

  const progressRes = await db.query<{
    day_number: number;
    grammar_1: boolean;
    grammar_2: boolean;
    grammar_3: boolean;
    words_match: boolean;
    oqish_done: boolean;
    speaking_level: number;
    suhbat_done: boolean | null;
  }>(
    `SELECT day_number, grammar_1, grammar_2, grammar_3, words_match, oqish_done,
            COALESCE(speaking_level, 0)::int AS speaking_level, suhbat_done
     FROM user_kunlik_day_progress
     WHERE user_id = $1
     ORDER BY day_number ASC`,
    [userId]
  );

  const TOTAL_DAYS = 182;
  const dayRows = progressRes.rows;
  let completedDays = 0;
  let currentDay = 1;
  let currentRow: (typeof dayRows)[number] | null = null;

  for (let day = 1; day <= TOTAL_DAYS; day += 1) {
    const row = dayRows.find((r) => r.day_number === day);
    if (!row) {
      currentDay = day;
      currentRow = null;
      break;
    }
    const grammarOk = row.grammar_1 && row.grammar_2 && row.grammar_3;
    const done =
      grammarOk && row.words_match === true && row.oqish_done === true && row.suhbat_done === true;
    if (done) {
      completedDays += 1;
      if (day === TOTAL_DAYS) {
        currentDay = TOTAL_DAYS;
        currentRow = row;
      }
      continue;
    }
    currentDay = day;
    currentRow = row;
    break;
  }

  const stageDefs: { id: string; label: string; done: boolean }[] = currentRow
    ? [
        {
          id: 'grammar',
          label: 'Grammatika',
          done: Boolean(currentRow.grammar_1 && currentRow.grammar_2 && currentRow.grammar_3),
        },
        { id: 'vocabulary', label: 'Lug‘at', done: currentRow.words_match === true },
        { id: 'reading', label: 'O‘qish', done: currentRow.oqish_done === true },
        {
          id: 'speaking',
          label: 'Gapirish',
          done: (currentRow.speaking_level ?? 0) > 0,
        },
        { id: 'suhbat', label: 'Savol-javob', done: currentRow.suhbat_done === true },
      ]
    : [
        { id: 'grammar', label: 'Grammatika', done: false },
        { id: 'vocabulary', label: 'Lug‘at', done: false },
        { id: 'reading', label: 'O‘qish', done: false },
        { id: 'speaking', label: 'Gapirish', done: false },
        { id: 'suhbat', label: 'Savol-javob', done: false },
      ];

  let activeSet = false;
  const stages = stageDefs.map((s) => {
    if (s.done) return { id: s.id, label: s.label, status: 'done' as const };
    if (!activeSet) {
      activeSet = true;
      return { id: s.id, label: s.label, status: 'active' as const };
    }
    return { id: s.id, label: s.label, status: 'todo' as const };
  });

  const contactsRes = await db.query<ContactRow>(
    `SELECT
       c.id,
       c.agent_id,
       a.name AS agent_name,
       c.user_id,
       c.channel,
       c.channel_other,
       c.outcome,
       c.result,
       c.comment_text,
       c.created_at
     FROM support_crm_contacts c
     LEFT JOIN support_crm_agents a ON a.id = c.agent_id
     WHERE c.user_id = $1
     ORDER BY c.created_at DESC
     LIMIT 50`,
    [userId]
  );

  return {
    user: {
      ...u,
      plan_started_at: u.plan_started_at,
      plan_days_left: planDaysLeft,
      total_time_seconds: Number(u.total_time_seconds ?? 0),
      idle_since: idleSince,
      idle_hours: idleHours,
      idle_days: idleDays,
      premium_active: premiumActive,
    },
    progress: {
      total_days: TOTAL_DAYS,
      current_day: currentDay,
      completed_days: completedDays,
      stages,
    },
    contacts: contactsRes.rows,
  };
}

export async function createSupportCrmContact(input: {
  agentId: number;
  userId: number;
  channel: ContactChannel;
  channelOther?: string | null;
  outcome: ContactOutcome;
  result?: ContactResult | null;
  commentText?: string | null;
}): Promise<ContactRow> {
  const db = requirePool();
  const channels: ContactChannel[] = [
    'phone',
    'telegram',
    'whatsapp',
    'max',
    'imo',
    'email',
    'other',
  ];
  const outcomes: ContactOutcome[] = [
    'reached',
    'no_answer',
    'no_pickup',
    'no_contact',
    'no_telegram',
    'no_whatsapp',
    'no_imo',
    'in_progress',
    'other',
  ];
  const results: ContactResult[] = ['returned_ok', 'helped_login', 'needs_fix', 'feedback', 'other'];

  if (!channels.includes(input.channel)) throw new Error('Kanal noto‘g‘ri');
  if (!outcomes.includes(input.outcome)) throw new Error('Natija (outcome) noto‘g‘ri');

  const channelOther =
    input.channel === 'other' ? String(input.channelOther ?? '').trim() : null;
  if (input.channel === 'other' && !channelOther) {
    throw new Error('Boshqa kanal uchun nom yozing');
  }

  let result: ContactResult | null = input.result ?? null;
  if (input.outcome !== 'reached') {
    result = null;
  } else if (result && !results.includes(result)) {
    throw new Error('Natija (result) noto‘g‘ri');
  }

  const comment = String(input.commentText ?? '').trim().slice(0, 2000) || null;

  const userCheck = await db.query(`SELECT id FROM users WHERE id = $1`, [input.userId]);
  if (!userCheck.rowCount) throw new Error('Foydalanuvchi topilmadi');

  const { rows } = await db.query<ContactRow>(
    `INSERT INTO support_crm_contacts
       (agent_id, user_id, channel, channel_other, outcome, result, comment_text)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING
       id, agent_id, user_id, channel, channel_other, outcome, result, comment_text, created_at,
       NULL::text AS agent_name`,
    [input.agentId, input.userId, input.channel, channelOther, input.outcome, result, comment]
  );
  return rows[0];
}

/** Next queue user after `afterUserId` (or first), same needs_contact filter. */
export async function nextQueueUserId(afterUserId?: number | null): Promise<number | null> {
  const { rows } = await listSupportCrmQueue({ filter: 'needs_contact', limit: 100, offset: 0 });
  if (!rows.length) return null;
  if (afterUserId == null) return rows[0].id;
  const idx = rows.findIndex((r) => r.id === afterUserId);
  if (idx < 0) return rows[0].id;
  return rows[idx + 1]?.id ?? rows[0]?.id ?? null;
}

export type PremiumSort =
  | 'purchase_desc'
  | 'purchase_asc'
  | 'last_seen_desc'
  | 'last_seen_asc';

export type PremiumUserRow = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  plan_name: string | null;
  plan_expires_at: string;
  last_seen_at: string | null;
  purchased_at: string | null;
  tariff_type: string | null;
};

/**
 * Barcha faol premium (obunasi hali tugamagan) o‘quvchilar.
 * Sort: xarid sanasi yoki oxirgi kirish.
 */
export async function listPremiumUsers(opts: {
  sort?: PremiumSort;
  limit?: number;
  offset?: number;
}): Promise<{ rows: PremiumUserRow[]; total: number }> {
  const db = requirePool();
  const sort: PremiumSort =
    opts.sort === 'purchase_asc' ||
    opts.sort === 'last_seen_desc' ||
    opts.sort === 'last_seen_asc'
      ? opts.sort
      : 'purchase_desc';
  const limit = Math.min(Math.max(opts.limit ?? 200, 1), 500);
  const offset = Math.max(opts.offset ?? 0, 0);

  const orderSql =
    sort === 'purchase_asc'
      ? 'purchased_at ASC NULLS LAST, u.id ASC'
      : sort === 'last_seen_desc'
        ? 'u.last_seen_at DESC NULLS LAST, u.id DESC'
        : sort === 'last_seen_asc'
          ? 'u.last_seen_at ASC NULLS LAST, u.id ASC'
          : 'purchased_at DESC NULLS LAST, u.id DESC';

  const { rows } = await db.query<PremiumUserRow>(
    `
    WITH latest_pay AS (
      SELECT DISTINCT ON (p.user_id)
        p.user_id,
        p.approved_at AS purchased_at,
        p.tariff_type
      FROM payments p
      WHERE p.status = 'approved'
        AND (
          p.product_code IS NULL
          OR p.product_code = ''
          OR p.product_code = 'russian'
        )
      ORDER BY p.user_id, p.approved_at DESC NULLS LAST, p.id DESC
    )
    SELECT
      u.id,
      u.first_name,
      u.last_name,
      u.phone,
      u.plan_name,
      u.plan_expires_at,
      u.last_seen_at,
      lp.purchased_at,
      lp.tariff_type
    FROM users u
    LEFT JOIN latest_pay lp ON lp.user_id = u.id
    WHERE u.plan_expires_at IS NOT NULL
      AND u.plan_expires_at > now()
      AND COALESCE(u.is_golden, false) = false
      AND COALESCE(u.account_type, 'student') <> 'teacher'
    ORDER BY ${orderSql}
    LIMIT $1 OFFSET $2
    `,
    [limit, offset]
  );

  const totalRes = await db.query<{ total: number }>(
    `
    SELECT COUNT(*)::int AS total
    FROM users u
    WHERE u.plan_expires_at IS NOT NULL
      AND u.plan_expires_at > now()
      AND COALESCE(u.is_golden, false) = false
      AND COALESCE(u.account_type, 'student') <> 'teacher'
    `
  );

  return {
    rows: rows ?? [],
    total: Number(totalRes.rows[0]?.total ?? 0),
  };
}
