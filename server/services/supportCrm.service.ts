import { crmVisibilitySql, supportCrmDatabase } from './supportCrmScope.js';
/**
 * supportCrm.service.ts — retention queue + contact logs for Support CRM.
 */
import { pool } from '../lib/db.js';


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
  | 'other';
export type ContactResult = 'returned_ok' | 'helped_login' | 'needs_fix' | 'feedback' | 'other';

export type QueueFilter = 'needs_contact' | 'contacted' | 'no_contact_needed';
export type QueueCounts = {needs_contact_count:number;contacted_count:number;no_contact_needed_count:number;total_premium:number};

type SupportSearch = { sql: string; values: string[] };

export function buildSupportSearch(raw: string | null | undefined, startAt: number, alias = 'u'): SupportSearch | null {
  const query = String(raw ?? '').normalize('NFC').trim().slice(0, 160);
  if (!query) return null;
  const values: string[] = [];
  const bind = (value: string) => {
    values.push(value);
    return `$${startAt + values.length - 1}`;
  };
  if (/^[+\d\s().-]+$/.test(query) && /\d/.test(query)) {
    const phone = bind(`%${query.replace(/\D/g, '')}%`);
    return {
      sql: `(regexp_replace(COALESCE(${alias}.phone, ''), '[^0-9]', '', 'g') LIKE ${phone})`,
      values,
    };
  }
  const words = query.split(/\s+/).filter(Boolean);
  return {
    sql: `(${words.map((word) => {
      const value = bind(`%${word.replace(/[\\%_]/g, '\\$&')}%`);
      return `(COALESCE(${alias}.first_name, '') ILIKE ${value} OR COALESCE(${alias}.last_name, '') ILIKE ${value})`;
    }).join(' AND ')})`,
    values,
  };
}

/**
 * Kurs bo'yicha qayerga yetgani: 1-kundan boshlab ketma-ket to'liq yopilgan kunlar soni.
 * Foydalanuvchi kartasidagi `progress` bilan bir xil qoida (0-sinov kuni hisobga olinmaydi).
 */
const COURSE_TOTAL_DAYS = 182;

function dayProgressJoin(alias: string): string {
  return `
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS completed_days
      FROM (
        SELECT p.day_number, ROW_NUMBER() OVER (ORDER BY p.day_number) AS rn
        FROM user_kunlik_day_progress p
        WHERE p.user_id = ${alias}.id
          AND p.day_number >= 1
          AND p.grammar_1 AND p.grammar_2 AND p.grammar_3
          AND p.words_match AND p.oqish_done AND p.suhbat_done IS TRUE
      ) done_days
      WHERE done_days.day_number = done_days.rn
    ) dp ON TRUE`;
}

const DAY_PROGRESS_COLUMNS = `
  COALESCE(dp.completed_days, 0)::int AS completed_days,
  LEAST(COALESCE(dp.completed_days, 0) + 1, ${COURSE_TOTAL_DAYS})::int AS current_day`;

export type DayProgressFields = {
  completed_days: number;
  current_day: number;
};

export type ContactedOnRow = DayProgressFields & {
  id: number;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  plan_name: string | null;
  plan_expires_at: string | null;
  contact_id: number;
  contact_at: string;
  contact_channel: string;
  contact_outcome: string;
  contact_result: string | null;
  agent_name: string | null;
  last_seen_at: string | null;
};

export type QueueRow = DayProgressFields & {
  id: number;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  plan_name: string | null;
  plan_expires_at: string;
  total_time_seconds: number;
  last_seen_at: string | null;
  last_kunlik_at: string | null;
  idle_since: string;
  idle_hours: number;
  last_contact_at: string | null;
  last_contact_channel: string | null;
  last_contact_channel_other: string | null;
  bucket: QueueFilter;
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
  const db=supportCrmDatabase()??pool;
  if (!db) throw new Error('DATABASE_URL kerak');
  return db;
}

/** One exclusive bucket per active premium student. Historical workflow flags never block a student. */
const queueBaseSql = () => `
 WITH last_kunlik AS (
  SELECT user_id,MAX(updated_at) last_kunlik_at FROM user_kunlik_day_progress GROUP BY user_id
 ),last_contact AS (
  SELECT DISTINCT ON (user_id) user_id,created_at last_contact_at,channel last_contact_channel,
   channel_other last_contact_channel_other
  FROM support_crm_contacts WHERE outcome <> 'in_progress'
  ORDER BY user_id,created_at DESC,id DESC
 ),candidates AS (
  SELECT u.id,u.first_name,u.last_name,u.phone,u.email,u.plan_name,u.plan_expires_at,
   COALESCE(u.total_time_seconds,0)::bigint total_time_seconds,u.last_seen_at,lk.last_kunlik_at,
   COALESCE(u.last_seen_at,u.created_at) idle_since,lc.last_contact_at,lc.last_contact_channel,lc.last_contact_channel_other,
   CASE WHEN lc.last_contact_at > $1::timestamptz - interval '24 hours' THEN 'contacted'
    WHEN u.last_seen_at > $1::timestamptz - interval '72 hours' THEN 'no_contact_needed'
    ELSE 'needs_contact' END bucket
  FROM users u LEFT JOIN last_kunlik lk ON lk.user_id=u.id LEFT JOIN last_contact lc ON lc.user_id=u.id
  WHERE ${crmVisibilitySql('u.id')} AND u.plan_expires_at>$1::timestamptz
   AND COALESCE(u.is_golden,false)=false AND COALESCE(u.account_type,'student')<>'teacher'
 )
`;
const countColumns = `COUNT(*) FILTER(WHERE bucket='needs_contact')::int needs_contact_count,
 COUNT(*) FILTER(WHERE bucket='contacted')::int contacted_count,
 COUNT(*) FILTER(WHERE bucket='no_contact_needed')::int no_contact_needed_count,
 COUNT(*)::int total_premium`;
export async function getSupportCrmStats(now=new Date()):Promise<QueueCounts> {
 const result=await requirePool().query(`${queueBaseSql()} SELECT ${countColumns} FROM candidates`,[now.toISOString()]);
 return result.rows[0] as QueueCounts;
}
export async function listSupportCrmQueue(opts:{filter?:QueueFilter;limit?:number;offset?:number;q?:string|null;now?:Date}):Promise<{rows:QueueRow[];total:number;counts:QueueCounts}> {
 const db=requirePool(),now=(opts.now??new Date()).toISOString();
 const filter:QueueFilter=opts.filter==='contacted'||opts.filter==='no_contact_needed'?opts.filter:'needs_contact';
 const limit=Math.min(Math.max(opts.limit??50,1),500),offset=Math.max(opts.offset??0,0);
 const search=buildSupportSearch(opts.q,4,'c'),countSearch=buildSupportSearch(opts.q,2,'c');
 const ordering=filter==='contacted'?'last_contact_at DESC,c.id ASC':filter==='no_contact_needed'?'last_seen_at DESC,c.id ASC':'idle_since ASC,c.id ASC';
 const result=await db.query<QueueRow>(`${queueBaseSql()} SELECT c.*,
  GREATEST(0,FLOOR(EXTRACT(EPOCH FROM ($1::timestamptz-idle_since))/3600))::int idle_hours,
  ${DAY_PROGRESS_COLUMNS}
  FROM candidates c ${dayProgressJoin('c')} WHERE bucket='${filter}' ${search?`AND ${search.sql}`:''}
  ORDER BY ${ordering} LIMIT $2 OFFSET $3`,[now,limit,offset,...(search?.values??[])]);
 const count=await db.query(`${queueBaseSql()} SELECT COUNT(*)::int total FROM candidates c WHERE bucket='${filter}' ${countSearch?`AND ${countSearch.sql}`:''}`,[now,...(countSearch?.values??[])]);
 const counts=await getSupportCrmStats(new Date(now));
 return {rows:result.rows,total:Number(count.rows[0]?.total??0),counts};
}

/** YYYY-MM-DD (Asia/Tashkent) — shu kunda bog‘langanlar (har bir kontakt). */
function parseTashkentDate(raw: string | undefined | null): string | null {
  const s = String(raw ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return s;
}

export function todayTashkentDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Tanlangan kunda (Toshkent) qayd etilgan bog‘lanishlar.
 * Navbatdagi idle filter emas — shu kun kontakt jurnali.
 */
export async function listContactedOnDate(opts: {
  date?: string | null;
  limit?: number;
  offset?: number;
  q?: string | null;
}): Promise<{ rows: ContactedOnRow[]; total: number; date: string }> {
  const db = requirePool();
  const date = parseTashkentDate(opts.date) ?? todayTashkentDate();
  const limit = Math.min(Math.max(opts.limit ?? 200, 1), 500);
  const offset = Math.max(opts.offset ?? 0, 0);
  const search = buildSupportSearch(opts.q, 4);
  const countSearch = buildSupportSearch(opts.q, 2);
  const searchSql = search ? `AND ${search.sql}` : '';
  const countSearchSql = countSearch ? `AND ${countSearch.sql}` : '';

  const { rows } = await db.query<ContactedOnRow>(
    `
    SELECT
      u.id,
      u.first_name,
      u.last_name,
      u.phone,
      u.email,
      u.plan_name,
      u.plan_expires_at,
      c.id AS contact_id,
      c.created_at AS contact_at,
      c.channel AS contact_channel,
      c.outcome AS contact_outcome,
      c.result AS contact_result,
      a.name AS agent_name,
      u.last_seen_at,
      ${DAY_PROGRESS_COLUMNS}
    FROM support_crm_contacts c
    JOIN users u ON u.id = c.user_id
    LEFT JOIN support_crm_agents a ON a.id = c.agent_id
    ${dayProgressJoin('u')}
    WHERE ${crmVisibilitySql('u.id')} AND (c.created_at AT TIME ZONE 'Asia/Tashkent')::date = $1::date
      ${searchSql}
    ORDER BY c.created_at DESC
    LIMIT $2 OFFSET $3
    `,
    [date, limit, offset, ...(search?.values ?? [])]
  );

  const totalRes = await db.query<{ total: number }>(
    `
    SELECT COUNT(*)::int AS total
    FROM support_crm_contacts c
    JOIN users u ON u.id = c.user_id
    WHERE ${crmVisibilitySql('u.id')} AND (c.created_at AT TIME ZONE 'Asia/Tashkent')::date = $1::date
      ${countSearchSql}
    `,
    [date, ...(countSearch?.values ?? [])]
  );

  return {
    rows: rows ?? [],
    total: Number(totalRes.rows[0]?.total ?? 0),
    date,
  };
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
    last_seen_at: string | null;
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
    last_seen_at: string | null;
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
       u.last_seen_at,
       (SELECT MAX(updated_at) FROM user_kunlik_day_progress p WHERE p.user_id = u.id) AS last_kunlik_at,
       (
         SELECT MIN(COALESCE(pay.approved_at, pay.created_at))
         FROM payments pay
         WHERE pay.user_id = u.id
           AND pay.status = 'approved'
       ) AS plan_started_at
     FROM users u
     WHERE u.id = $1 AND ${crmVisibilitySql('u.id')}`,
    [userId]
  );
  const u = rows[0];
  if (!u) return null;

  // Premium / Navbat bilan bir xil: oxirgi KIRISH (last_seen), keyin kunlik, keyin created.
  const idleSince = u.last_seen_at ?? u.last_kunlik_at ?? u.created_at;
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

  const TOTAL_DAYS = COURSE_TOTAL_DAYS;
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

  const userCheck = await db.query(`SELECT id FROM users WHERE id = $1 AND ${crmVisibilitySql('users.id')}`, [input.userId]);
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

export type PremiumUserRow = DayProgressFields & {
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
      lp.tariff_type,
      ${DAY_PROGRESS_COLUMNS}
    FROM users u
    LEFT JOIN latest_pay lp ON lp.user_id = u.id
    ${dayProgressJoin('u')}
    WHERE ${crmVisibilitySql('u.id')} AND u.plan_expires_at IS NOT NULL
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
    WHERE ${crmVisibilitySql('u.id')} AND u.plan_expires_at IS NOT NULL
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

export type SearchUserRow = DayProgressFields & {
  id: number;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  last_seen_at: string | null;
  plan_name: string | null;
  plan_expires_at: string | null;
};

const SEARCH_LIMIT = 30;

/**
 * Barcha o'quvchilar bo'yicha qidiruv (navbatdan tashqari ham): telefon, ism yoki familiya.
 * Telefon raqamlari faqat raqamlar bo'yicha solishtiriladi (+998, probel, tire farqi yo'q).
 */
export async function searchSupportCrmUsers(rawQuery: string | null | undefined): Promise<{
  rows: SearchUserRow[];
  limit: number;
}> {
  const db = requirePool();
  const query = String(rawQuery ?? '').trim();
  if (query.replace(/[\s+().-]/g, '').length < 2) return { rows: [], limit: SEARCH_LIMIT };
  const search = buildSupportSearch(query, 2, 'u');
  if (!search) return { rows: [], limit: SEARCH_LIMIT };

  const { rows } = await db.query<SearchUserRow>(
    `
    SELECT
      u.id,
      u.first_name,
      u.last_name,
      u.phone,
      u.email,
      u.created_at,
      u.last_seen_at,
      u.plan_name,
      u.plan_expires_at,
      ${DAY_PROGRESS_COLUMNS}
    FROM users u
    ${dayProgressJoin('u')}
    WHERE ${crmVisibilitySql('u.id')} AND COALESCE(u.is_golden, false) = false
      AND ${search.sql}
    ORDER BY u.last_seen_at DESC NULLS LAST, u.id DESC
    LIMIT $1
    `,
    [SEARCH_LIMIT, ...search.values]
  );
  return { rows: rows ?? [], limit: SEARCH_LIMIT };
}
