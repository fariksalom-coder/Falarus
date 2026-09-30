import { pool } from '../lib/db.js';
import type { Pool } from 'pg';

type ReadDb = Pick<Pool, 'query'>;
const visible = "u.is_golden IS NOT TRUE AND u.account_type IS DISTINCT FROM 'teacher'";
function database(): ReadDb {
  if (!pool) throw new Error('Database unavailable');
  return pool;
}
export function validDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !value.startsWith('0000-') && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export async function readAdminUsers(input: Record<string, unknown>, db = database()) {
  const page = Math.max(1, Math.min(100000, Math.trunc(Number(input.page)) || 1));
  const pageSize = Math.max(1, Math.min(100, Math.trunc(Number(input.pageSize)) || 50));
  const args: unknown[] = [];
  const bind = (v: unknown) => { args.push(v); return `$${args.length}`; };
  const where = [visible];
  const date = String(input.date || '');
  if (date) {
    if (!validDay(date)) throw Object.assign(new Error('Sana noto‘g‘ri'), { status: 400 });
    const p = bind(date);
    where.push(`u.created_at >= (${p}::date::timestamp AT TIME ZONE 'Asia/Tashkent') AND u.created_at < ((${p}::date + 1)::timestamp AT TIME ZONE 'Asia/Tashkent')`);
  } else if (['today', 'week', 'month'].includes(String(input.registered))) {
    const unit = input.registered === 'today' ? 'day' : String(input.registered);
    where.push(`u.created_at >= (date_trunc('${unit}', now() AT TIME ZONE 'Asia/Tashkent') AT TIME ZONE 'Asia/Tashkent') AND u.created_at <= now()`);
  }
  if (input.subscription === 'none') where.push('(u.plan_expires_at IS NULL OR u.plan_expires_at <= now())');
  if (input.subscription === 'monthly') where.push("u.plan_name = '1 OY' AND u.plan_expires_at > now()");
  if (input.subscription === 'yearly') where.push("u.plan_name = '1 YIL' AND u.plan_expires_at > now()");
  if (input.referral === 'true' || input.referral === true) where.push('u.referred_by IS NOT NULL');
  const search = String(input.q || '').trim().slice(0, 120);
  if (search) {
    const p = bind('%' + search.replace(/[\\%_]/g, '\\$&') + '%');
    const digits = search.replace(/\D/g, '');
    const phone = digits.length >= 4 ? ` OR regexp_replace(coalesce(u.phone,''), '\\D', '', 'g') LIKE ${bind('%' + digits + '%')}` : '';
    where.push(`(concat_ws(' ', u.first_name, u.last_name) ILIKE ${p} OR u.email ILIKE ${p} OR u.phone ILIKE ${p} OR u.id::text = ${bind(search)}${phone})`);
  }
  const filter = where.join(' AND ');
  // Count and page share a statement snapshot; progress is fetched only for this page.
  const { rows } = await db.query(`WITH total AS (
    SELECT count(*)::int n FROM users u WHERE ${filter}
  ), page AS (
    SELECT u.id,u.first_name,u.last_name,u.email,u.phone,u.created_at,u.plan_name,u.plan_expires_at,u.total_referral_earned FROM users u WHERE ${filter}
    ORDER BY u.created_at DESC, u.id DESC LIMIT ${bind(pageSize)} OFFSET ${bind((page - 1) * pageSize)}
  ), items AS (
    SELECT u.id, concat_ws(' ', u.first_name, u.last_name) AS name, u.email, u.phone,
      u.created_at AS registration_date, coalesce(u.plan_name, '—') AS subscription_type,
      CASE WHEN u.plan_expires_at > now() THEN 'active' ELSE 'expired' END subscription_status,
      coalesce(u.total_referral_earned,0) referral_earnings, coalesce(p.day_number,0) reached_day,
      CASE WHEN p.day_number IS NULL THEN NULL ELSE jsonb_build_object(
        'day_number',p.day_number,'grammar_total',3,
        'grammar_done',coalesce(p.grammar_1::int,0)+coalesce(p.grammar_2::int,0)+coalesce(p.grammar_3::int,0),
        'vocabulary_done',coalesce(p.words_match,false),'reading_done',coalesce(p.oqish_done,false),
        'speaking_level',coalesce(p.speaking_level,0)) END day_progress
    FROM page u LEFT JOIN LATERAL (
      SELECT * FROM user_kunlik_day_progress WHERE user_id=u.id ORDER BY day_number DESC LIMIT 1
    ) p ON true
  ) SELECT total.n AS total, coalesce((SELECT jsonb_agg(items ORDER BY registration_date DESC,id DESC) FROM items),'[]'::jsonb) AS items FROM total`, args);
  return { ...rows[0], page, pageSize };
}

export async function readAdminRegistrations(month?: string, db = database()) {
  if (month && (!/^\d{4}-\d{2}$/.test(month) || !validDay(month + '-01'))) {
    throw Object.assign(new Error('Oy noto‘g‘ri'), { status: 400 });
  }
  const { rows } = await db.query(`WITH bounds AS (
    SELECT coalesce($1::date,date_trunc('month',now() AT TIME ZONE 'Asia/Tashkent')::date) start,
      (now() AT TIME ZONE 'Asia/Tashkent')::date today
  ), days AS (
    SELECT d::date AS "day" FROM bounds,
      generate_series(start::timestamp,least((start + interval '1 month - 1 day')::date,today)::timestamp,interval '1 day') d
  ), counts AS (
    SELECT (u.created_at AT TIME ZONE 'Asia/Tashkent')::date AS "day",count(*)::int AS count
    FROM users u,bounds b WHERE ${visible}
      AND u.created_at >= (b.start::timestamp AT TIME ZONE 'Asia/Tashkent')
      AND u.created_at < ((b.start + interval '1 month') AT TIME ZONE 'Asia/Tashkent')
      AND u.created_at <= now()
    GROUP BY 1
  ) SELECT to_char(d."day",'YYYY-MM-DD') AS "day",coalesce(c.count,0)::int AS count
    FROM days d LEFT JOIN counts c USING("day") ORDER BY d."day" DESC`, [month ? month + '-01' : null]);
  return { days: rows, total: rows.reduce((n, r) => n + Number(r.count), 0), timezone: 'Asia/Tashkent' };
}

export async function readAdminUnreadCount(db = database()) {
  const { rows } = await db.query(`SELECT count(*)::int count FROM support_chat_messages m
    JOIN support_chats c ON c.id=m.chat_id JOIN users u ON u.id=c.user_id
    WHERE u.is_golden IS NOT TRUE AND m.sender_type='user'
      AND (c.admin_last_read_at IS NULL OR m.created_at>c.admin_last_read_at)`);
  return rows[0];
}

export async function readAdminUserTotals(db = database()) {
  const { rows } = await db.query(`SELECT count(*)::int total,
    count(*) FILTER (WHERE u.created_at >= (date_trunc('day',now() AT TIME ZONE 'Asia/Tashkent') AT TIME ZONE 'Asia/Tashkent'))::int today,
    count(*) FILTER (WHERE u.created_at >= (date_trunc('week',now() AT TIME ZONE 'Asia/Tashkent') AT TIME ZONE 'Asia/Tashkent'))::int AS week,
    count(*) FILTER (WHERE u.created_at >= (date_trunc('month',now() AT TIME ZONE 'Asia/Tashkent') AT TIME ZONE 'Asia/Tashkent'))::int AS month,
    count(*) FILTER (WHERE u.plan_expires_at>now())::int active,
    count(*) FILTER (WHERE u.plan_expires_at IS NULL OR u.plan_expires_at<=now())::int inactive
    FROM users u WHERE ${visible}`);
  return rows[0];
}
