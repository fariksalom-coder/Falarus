import type { Pool } from 'pg';
import { pool } from '../lib/db.js';

const EVENT_TYPES = new Set([
  'page_view',
  'name_input',
  'phone_input',
  'submit_click',
  'form_error',
  'lead_saved',
  'crm_lead_saved',
  'platform_click',
  'page_exit',
]);

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
type UtmKey = (typeof UTM_KEYS)[number];

function requirePool(db?: Pick<Pool, 'query'>) {
  const target = db ?? pool;
  if (!target) throw new Error('DATABASE_URL kerak');
  return target;
}

function cleanText(raw: unknown, max = 120): string | null {
  const value = String(raw ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim();
  if (!value || value.length > max) return null;
  return value;
}

export function cleanPromoSessionId(raw: unknown): string {
  const value = String(raw ?? '').trim();
  if (!/^[a-zA-Z0-9_.:-]{8,120}$/.test(value)) throw new Error('Session noto‘g‘ri.');
  return value;
}

export function cleanPromoLandingPath(raw: unknown): string {
  const fallback = '/promo/russian';
  const value = String(raw ?? fallback).trim();
  try {
    const parsed = new URL(value, 'https://falarus.uz');
    if (parsed.pathname !== '/promo/russian') return fallback;
    return `${parsed.pathname}${parsed.search}`.slice(0, 300);
  } catch {
    return fallback;
  }
}

export function cleanPromoUtm(body: Record<string, unknown>): Partial<Record<UtmKey, string | null>> {
  const result: Partial<Record<UtmKey, string | null>> = {};
  for (const key of UTM_KEYS) result[key] = cleanText(body[key]);
  return result;
}

export function cleanPromoMetadata(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const source = raw as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  const textKeys = ['device', 'lang', 'referrerHost', 'step', 'errorCode'];
  for (const key of textKeys) {
    const value = cleanText(source[key], 80);
    if (value) result[key] = value;
  }
  for (const key of ['width', 'height', 'timeMs']) {
    const value = Number(source[key]);
    if (Number.isFinite(value) && value >= 0 && value <= 24 * 60 * 60 * 1000) result[key] = Math.round(value);
  }
  return result;
}

export async function recordPromoLandingEvent(params: {
  sessionId: string;
  eventType: string;
  landingPage?: string | null;
  utm?: Partial<Record<UtmKey, string | null>>;
  leadId?: number | null;
  userId?: number | null;
  metadata?: Record<string, unknown>;
}, db?: Pick<Pool, 'query'>): Promise<void> {
  if (!EVENT_TYPES.has(params.eventType)) throw new Error('Event noto‘g‘ri.');
  const sessionId = cleanPromoSessionId(params.sessionId);
  const landingPage = cleanPromoLandingPath(params.landingPage);
  const target = requirePool(db);
  await target.query(
    `INSERT INTO promo_landing_events (
       session_id, event_type, lead_id, user_id, landing_page,
       utm_source, utm_medium, utm_campaign, utm_content, utm_term, metadata
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)`,
    [
      sessionId,
      params.eventType,
      params.leadId ?? null,
      params.userId ?? null,
      landingPage,
      params.utm?.utm_source ?? null,
      params.utm?.utm_medium ?? null,
      params.utm?.utm_campaign ?? null,
      params.utm?.utm_content ?? null,
      params.utm?.utm_term ?? null,
      JSON.stringify(params.metadata ?? {}),
    ],
  );
}

export async function getPromoLandingAnalytics(period = '30d', db?: Pick<Pool, 'query'>) {
  const target = requirePool(db);
  const safePeriod = ['today', 'yesterday', '7d', '30d', 'month', 'all'].includes(period) ? period : '30d';
  const rows = (await target.query(
    `WITH bounds AS (
       SELECT
         CASE $1
           WHEN 'today' THEN (now() AT TIME ZONE 'Asia/Tashkent')::date::timestamp AT TIME ZONE 'Asia/Tashkent'
           WHEN 'yesterday' THEN (((now() AT TIME ZONE 'Asia/Tashkent')::date - 1)::timestamp AT TIME ZONE 'Asia/Tashkent')
           WHEN '7d' THEN (((now() AT TIME ZONE 'Asia/Tashkent')::date - 6)::timestamp AT TIME ZONE 'Asia/Tashkent')
           WHEN '30d' THEN (((now() AT TIME ZONE 'Asia/Tashkent')::date - 29)::timestamp AT TIME ZONE 'Asia/Tashkent')
           WHEN 'month' THEN (date_trunc('month', now() AT TIME ZONE 'Asia/Tashkent') AT TIME ZONE 'Asia/Tashkent')
           ELSE NULL::timestamptz
         END AS from_at,
         CASE $1
           WHEN 'yesterday' THEN ((now() AT TIME ZONE 'Asia/Tashkent')::date::timestamp AT TIME ZONE 'Asia/Tashkent')
           ELSE NULL::timestamptz
         END AS to_at
     ),
     filtered AS (
       SELECT e.*
       FROM promo_landing_events e, bounds b
       WHERE (b.from_at IS NULL OR e.created_at >= b.from_at)
         AND (b.to_at IS NULL OR e.created_at < b.to_at)
     ),
     event_totals AS (
       SELECT event_type, count(DISTINCT session_id)::int sessions, count(*)::int events
       FROM filtered
       GROUP BY event_type
     ),
     db_leads AS (
       SELECT count(*)::int leads
       FROM sales_crm_leads l, bounds b
       WHERE l.source = 'landing'
         AND (b.from_at IS NULL OR COALESCE(l.submitted_at,l.created_at) >= b.from_at)
         AND (b.to_at IS NULL OR COALESCE(l.submitted_at,l.created_at) < b.to_at)
     )
     SELECT
       COALESCE((SELECT sessions FROM event_totals WHERE event_type='page_view'),0)::int page_views,
       COALESCE((SELECT sessions FROM event_totals WHERE event_type='name_input'),0)::int name_inputs,
       COALESCE((SELECT sessions FROM event_totals WHERE event_type='phone_input'),0)::int phone_inputs,
       COALESCE((SELECT sessions FROM event_totals WHERE event_type='submit_click'),0)::int submit_clicks,
      COALESCE((SELECT sessions FROM event_totals WHERE event_type='lead_saved'),0)::int accepted,
      COALESCE((SELECT sessions FROM event_totals WHERE event_type='crm_lead_saved'),0)::int crm_saved_sessions,
      COALESCE((SELECT count(DISTINCT lead_id)::int FROM filtered WHERE event_type='crm_lead_saved' AND lead_id IS NOT NULL),0)::int crm_saved_leads,
      COALESCE((SELECT leads FROM db_leads),0)::int db_leads,
      COALESCE((SELECT sessions FROM event_totals WHERE event_type='form_error'),0)::int form_errors,
      COALESCE((SELECT sessions FROM event_totals WHERE event_type='platform_click'),0)::int platform_clicks`,
    [safePeriod],
  )).rows[0];

  const daily = (await target.query(
    `WITH days AS (
       SELECT
         (created_at AT TIME ZONE 'Asia/Tashkent')::date AS day,
         event_type,
         session_id,
         lead_id
       FROM promo_landing_events
       WHERE created_at >= (((now() AT TIME ZONE 'Asia/Tashkent')::date - 29)::timestamp AT TIME ZONE 'Asia/Tashkent')
     ),
     event_days AS (
       SELECT day,event_type,count(DISTINCT session_id)::int sessions,count(DISTINCT lead_id) FILTER (WHERE lead_id IS NOT NULL)::int leads
       FROM days
       GROUP BY day,event_type
     ),
     db_days AS (
       SELECT (COALESCE(submitted_at,created_at) AT TIME ZONE 'Asia/Tashkent')::date AS day, count(*)::int db_leads
       FROM sales_crm_leads
       WHERE source='landing'
         AND COALESCE(submitted_at,created_at) >= (((now() AT TIME ZONE 'Asia/Tashkent')::date - 29)::timestamp AT TIME ZONE 'Asia/Tashkent')
       GROUP BY day
     ),
     all_days AS (
       SELECT generate_series(
         (now() AT TIME ZONE 'Asia/Tashkent')::date - 29,
         (now() AT TIME ZONE 'Asia/Tashkent')::date,
         interval '1 day'
       )::date AS day
     )
     SELECT
       a.day::text,
       COALESCE(max(sessions) FILTER (WHERE event_type='page_view'),0)::int page_views,
       COALESCE(max(sessions) FILTER (WHERE event_type='name_input'),0)::int name_inputs,
       COALESCE(max(sessions) FILTER (WHERE event_type='phone_input'),0)::int phone_inputs,
       COALESCE(max(sessions) FILTER (WHERE event_type='submit_click'),0)::int submit_clicks,
       COALESCE(max(sessions) FILTER (WHERE event_type='lead_saved'),0)::int accepted,
       COALESCE(max(leads) FILTER (WHERE event_type='crm_lead_saved'),0)::int crm_saved_leads,
       COALESCE(d.db_leads,0)::int db_leads,
       COALESCE(max(sessions) FILTER (WHERE event_type='form_error'),0)::int form_errors,
       COALESCE(max(sessions) FILTER (WHERE event_type='platform_click'),0)::int platform_clicks
     FROM all_days a
     LEFT JOIN event_days e ON e.day=a.day
     LEFT JOIN db_days d ON d.day=a.day
     GROUP BY a.day,d.db_leads
     ORDER BY a.day DESC`,
  )).rows;

  const sessions = (await target.query(
    `WITH bounds AS (
       SELECT
         CASE $1
           WHEN 'today' THEN (now() AT TIME ZONE 'Asia/Tashkent')::date::timestamp AT TIME ZONE 'Asia/Tashkent'
           WHEN 'yesterday' THEN (((now() AT TIME ZONE 'Asia/Tashkent')::date - 1)::timestamp AT TIME ZONE 'Asia/Tashkent')
           WHEN '7d' THEN (((now() AT TIME ZONE 'Asia/Tashkent')::date - 6)::timestamp AT TIME ZONE 'Asia/Tashkent')
           WHEN '30d' THEN (((now() AT TIME ZONE 'Asia/Tashkent')::date - 29)::timestamp AT TIME ZONE 'Asia/Tashkent')
           WHEN 'month' THEN (date_trunc('month', now() AT TIME ZONE 'Asia/Tashkent') AT TIME ZONE 'Asia/Tashkent')
           ELSE NULL::timestamptz
         END AS from_at,
         CASE $1
           WHEN 'yesterday' THEN ((now() AT TIME ZONE 'Asia/Tashkent')::date::timestamp AT TIME ZONE 'Asia/Tashkent')
           ELSE NULL::timestamptz
         END AS to_at
     ),
     filtered AS (
       SELECT e.*
       FROM promo_landing_events e, bounds b
       WHERE (b.from_at IS NULL OR e.created_at >= b.from_at)
         AND (b.to_at IS NULL OR e.created_at < b.to_at)
     ),
     grouped AS (
       SELECT
         session_id,
         min(created_at) first_at,
         max(created_at) last_at,
         max(utm_source) FILTER (WHERE utm_source IS NOT NULL) utm_source,
         max(utm_campaign) FILTER (WHERE utm_campaign IS NOT NULL) utm_campaign,
         max(utm_content) FILTER (WHERE utm_content IS NOT NULL) utm_content,
         max((metadata->>'device')) FILTER (WHERE metadata ? 'device') device,
         max((metadata->>'lang')) FILTER (WHERE metadata ? 'lang') lang,
         max((metadata->>'referrerHost')) FILTER (WHERE metadata ? 'referrerHost') referrer_host,
         bool_or(event_type='page_view') page_view,
         bool_or(event_type='name_input') name_input,
         bool_or(event_type='phone_input') phone_input,
         bool_or(event_type='submit_click') submit_click,
         bool_or(event_type='form_error') form_error,
         bool_or(event_type='lead_saved') lead_saved,
         bool_or(event_type='crm_lead_saved') crm_lead_saved,
         bool_or(event_type='platform_click') platform_click,
         max((metadata->>'errorCode')) FILTER (WHERE event_type='form_error') error_code,
         max((metadata->>'timeMs')::int) FILTER (WHERE event_type='page_exit' AND (metadata->>'timeMs') ~ '^[0-9]+$') time_ms
       FROM filtered
       GROUP BY session_id
     )
     SELECT
       session_id,
       first_at,
       last_at,
       GREATEST(0, EXTRACT(EPOCH FROM (last_at-first_at))::int) duration_seconds,
       COALESCE(time_ms,0)::int time_ms,
       utm_source,
       utm_campaign,
       utm_content,
       device,
       lang,
       referrer_host,
       error_code,
       jsonb_build_object(
         'page_view', page_view,
         'name_input', name_input,
         'phone_input', phone_input,
         'submit_click', submit_click,
         'form_error', form_error,
         'lead_saved', lead_saved,
         'crm_lead_saved', crm_lead_saved,
         'platform_click', platform_click
       ) steps,
       CASE
         WHEN crm_lead_saved THEN 'crm'
         WHEN lead_saved THEN 'accepted'
         WHEN form_error THEN 'error'
         WHEN submit_click THEN 'submit'
         WHEN phone_input THEN 'phone'
         WHEN name_input THEN 'name'
         ELSE 'open'
       END last_step
     FROM grouped
     ORDER BY first_at DESC
     LIMIT 80`,
    [safePeriod],
  )).rows;

  return { period: safePeriod, totals: rows, daily, sessions };
}
