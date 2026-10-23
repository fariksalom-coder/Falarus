/**
 * userJourneyRoutes — foydalanuvchi ro'yxatdan o'tgandan keyingi yo'li.
 *
 * Klient tomoni: qadam (0-kun va uning bloklari, video sahifasi) va video
 * ko'rish hisobotlari. Admin tomoni: voronka, ro'yxat va bitta foydalanuvchi.
 *
 * So'rovlar `pool` orqali; testda PGlite beriladi (`JourneyQuery`).
 * Yozuvlar foydalanuvchini kuttirmaydi va xato bersa ham o'quv oqimi
 * buzilmaydi — bu faqat kuzatuv.
 */
import { Router, type Request, type Response } from 'express';
import { pool } from '../lib/db.js';
import {
  DAY0_SECTIONS,
  TRACKED_VIDEOS,
  isJourneyStep,
  parseVideoReport,
  summarizeDay0,
  videoStatus,
  type Day0Row,
  type Day0Section,
  type JourneyStep,
  type VideoProgressRow,
} from '../../shared/userJourney.js';

export type JourneyQuery = (sql: string, params?: unknown[]) => Promise<{ rows: any[] }>;

const poolQuery: JourneyQuery | null = pool ? (sql, params) => pool!.query(sql, params) : null;

const INTRO = 'course_intro' as const;

export async function recordJourneyStep(q: JourneyQuery, userId: number, step: JourneyStep): Promise<void> {
  await q(
    `INSERT INTO user_journey_steps (user_id, step_key) VALUES ($1, $2)
     ON CONFLICT (user_id, step_key) DO UPDATE SET last_at = now(), hits = user_journey_steps.hits + 1`,
    [userId, step],
  );
}

/** Kirishni belgilaydi. Kirish javobini kuttirmaydi, xatoni yutadi. */
export function noteLogin(userId: number): void {
  if (!poolQuery || !Number.isFinite(userId) || userId < 1) return;
  recordJourneyStep(poolQuery, userId, 'login').catch((err) => console.error('[journey] login', err?.message ?? err));
}

export function createUserJourneyRoutes(
  authenticate: (req: any, res: any, next: any) => void,
  q: JourneyQuery | null = poolQuery,
): Router {
  const router = Router();

  router.post('/journey/step', authenticate, async (req: any, res: Response) => {
    const step = req.body?.step;
    if (!isJourneyStep(step) || step === 'login') return res.status(400).json({ error: 'INVALID_STEP' });
    if (!q) return res.status(204).end();
    try {
      await recordJourneyStep(q, Number(req.userId), step);
      res.status(204).end();
    } catch (err) {
      console.error('[journey/step]', err);
      res.status(500).json({ error: 'JOURNEY_UNAVAILABLE' });
    }
  });

  router.post('/journey/video', authenticate, async (req: any, res: Response) => {
    const report = parseVideoReport(req.body);
    if (!report) return res.status(400).json({ error: 'INVALID_VIDEO_REPORT' });
    if (!q) return res.status(204).end();
    try {
      await q(
        `INSERT INTO user_video_progress
           (user_id, video_key, duration_seconds, max_position_seconds, watched_seconds, plays, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $7 THEN now() END)
         ON CONFLICT (user_id, video_key) DO UPDATE SET
           duration_seconds     = EXCLUDED.duration_seconds,
           max_position_seconds = GREATEST(user_video_progress.max_position_seconds, EXCLUDED.max_position_seconds),
           watched_seconds      = user_video_progress.watched_seconds + EXCLUDED.watched_seconds,
           plays                = user_video_progress.plays + EXCLUDED.plays,
           completed_at         = COALESCE(user_video_progress.completed_at, EXCLUDED.completed_at),
           last_watched_at      = now()`,
        [Number(req.userId), report.video, report.duration, report.position, report.watched, report.started ? 1 : 0, report.ended],
      );
      res.status(204).end();
    } catch (err) {
      console.error('[journey/video]', err);
      res.status(500).json({ error: 'JOURNEY_UNAVAILABLE' });
    }
  });

  return router;
}

/* ───────────────────────────── Admin ───────────────────────────── */

type BaseRow = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  last_seen_at: string | null;
  premium: boolean;
  visit_days: number;
  login_count: number;
  last_login_at: string | null;
  day0_opened_at: string | null;
  day0_sections: string[] | null;
  day0_row: Day0Row | null;
  day0_updated_at: string | null;
  video_page_at: string | null;
  video: VideoProgressRow | null;
};

/** Ro'yxatdagi bitta foydalanuvchi uchun hammasi bitta so'rovda (N+1 yo'q). */
const ROWS_SQL = `
  SELECT u.id, u.first_name, u.last_name, u.phone, u.email, u.created_at, u.last_seen_at,
         coalesce(u.plan_expires_at > now(), false) AS premium,
         (SELECT count(*)::int FROM support_crm_user_visits v WHERE v.user_id = u.id) AS visit_days,
         coalesce(lg.hits, 0)::int AS login_count, lg.last_at AS last_login_at,
         d0.first_at AS day0_opened_at,
         (SELECT array_agg(substr(s.step_key, 6)) FROM user_journey_steps s
           WHERE s.user_id = u.id AND s.step_key LIKE 'day0:%') AS day0_sections,
         (SELECT to_jsonb(p) - 'user_id' FROM (
            SELECT grammar_1, grammar_2, grammar_3, words_learned, words_match, text_questions_correct,
                   oqish_done, speaking_level, suhbat_done
            FROM user_kunlik_day_progress WHERE user_id = u.id AND day_number = 0) p) AS day0_row,
         (SELECT updated_at FROM user_kunlik_day_progress WHERE user_id = u.id AND day_number = 0) AS day0_updated_at,
         vp.first_at AS video_page_at,
         (SELECT to_jsonb(vv) - 'user_id' - 'video_key' FROM user_video_progress vv
           WHERE vv.user_id = u.id AND vv.video_key = '${INTRO}') AS video
  FROM users u
  LEFT JOIN user_journey_steps lg ON lg.user_id = u.id AND lg.step_key = 'login'
  LEFT JOIN user_journey_steps d0 ON d0.user_id = u.id AND d0.step_key = 'day0_open'
  LEFT JOIN user_journey_steps vp ON vp.user_id = u.id AND vp.step_key = 'course_video_page'`;

/** Admin hisobotlaridan chiqariladiganlar: oltin (support) hisoblar va o'qituvchilar. */
const STUDENTS = `coalesce(u.is_golden, false) = false AND coalesce(u.account_type, '') <> 'teacher'`;

function shape(row: BaseRow, promptCount: number) {
  const fallback = TRACKED_VIDEOS[INTRO].durationSeconds;
  const opened = new Set((row.day0_sections ?? []).filter((s): s is Day0Section =>
    (DAY0_SECTIONS as readonly string[]).includes(s)));
  const day0 = summarizeDay0(row.day0_row, promptCount, opened, Boolean(row.day0_opened_at) || Boolean(row.day0_row));
  const v = row.video;
  return {
    id: row.id,
    name: [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || null,
    phone: row.phone,
    email: row.email,
    created_at: row.created_at,
    last_seen_at: row.last_seen_at,
    premium: row.premium,
    visit_days: row.visit_days,
    login_count: row.login_count,
    last_login_at: row.last_login_at,
    day0: { ...day0, opened_at: row.day0_opened_at, updated_at: row.day0_updated_at },
    video: {
      status: videoStatus(v, Boolean(row.video_page_at), fallback),
      page_opened_at: row.video_page_at,
      duration_seconds: v?.duration_seconds ?? fallback,
      max_position_seconds: v?.max_position_seconds ?? 0,
      watched_seconds: v?.watched_seconds ?? 0,
      plays: v?.plays ?? 0,
      completed_at: v?.completed_at ?? null,
      first_started_at: v?.first_started_at ?? null,
      last_watched_at: v?.last_watched_at ?? null,
    },
  };
}

export type JourneyUser = ReturnType<typeof shape>;

const STATUS_FILTERS: Record<string, string> = {
  day0_none: `d0.user_id IS NULL AND NOT EXISTS (SELECT 1 FROM user_kunlik_day_progress k WHERE k.user_id = u.id AND k.day_number = 0)`,
  day0_started: `(d0.user_id IS NOT NULL OR EXISTS (SELECT 1 FROM user_kunlik_day_progress k WHERE k.user_id = u.id AND k.day_number = 0))`,
  video_none: `NOT EXISTS (SELECT 1 FROM user_video_progress x WHERE x.user_id = u.id AND x.video_key = '${INTRO}' AND x.plays > 0)`,
  video_started: `EXISTS (SELECT 1 FROM user_video_progress x WHERE x.user_id = u.id AND x.video_key = '${INTRO}' AND x.plays > 0)`,
  video_completed: `EXISTS (SELECT 1 FROM user_video_progress x WHERE x.user_id = u.id AND x.video_key = '${INTRO}' AND x.completed_at IS NOT NULL)`,
  premium: `u.plan_expires_at > now()`,
  no_return: `(u.last_seen_at IS NULL OR u.last_seen_at < u.created_at + interval '30 minutes')`,
};

/** `days` — oxirgi N kunda ro'yxatdan o'tganlar; 0 yoki yo'q bo'lsa — hammasi. */
function periodDays(raw: unknown): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 && n <= 3650 ? n : null;
}

async function day0PromptCount(q: JourneyQuery): Promise<number> {
  const { rows } = await q(`SELECT count(*)::int AS n FROM daily_practice_prompts WHERE day_number = 0`);
  return rows[0]?.n ?? 0;
}

export function createAdminUserJourneyRoutes(q: JourneyQuery | null = poolQuery): Router {
  const router = Router();

  // GET /api/admin/user-journey/summary?days=30
  router.get('/summary', async (req: Request, res: Response) => {
    if (!q) return res.status(503).json({ error: 'db_unavailable' });
    const days = periodDays(req.query.days);
    try {
      const prompts = await day0PromptCount(q);
      const { rows } = await q(
        `WITH base AS (
           SELECT u.id, u.created_at, u.last_seen_at, u.plan_expires_at FROM users u
           WHERE ${STUDENTS} AND ($1::int IS NULL OR u.created_at > now() - make_interval(days => $1::int))
         ), d0 AS (
           SELECT b.id,
                  EXISTS (SELECT 1 FROM user_journey_steps s WHERE s.user_id = b.id AND s.step_key LIKE 'day0%') AS opened,
                  k.grammar_1 AND k.grammar_2 AND k.grammar_3 AS g,
                  coalesce(k.words_match, false) AS w,
                  coalesce(k.oqish_done, false) AS o,
                  CASE WHEN $2::int = 0 THEN coalesce(k.oqish_done, false) ELSE coalesce(k.speaking_level, 0) >= $2::int END AS sp,
                  coalesce(k.suhbat_done, false) AS sj,
                  k.user_id IS NOT NULL AS has_row
           FROM base b LEFT JOIN user_kunlik_day_progress k ON k.user_id = b.id AND k.day_number = 0
         ), v AS (
           SELECT b.id, x.plays, x.max_position_seconds, x.duration_seconds, x.completed_at, x.watched_seconds,
                  EXISTS (SELECT 1 FROM user_journey_steps s WHERE s.user_id = b.id AND s.step_key = 'course_video_page') AS page
           FROM base b LEFT JOIN user_video_progress x ON x.user_id = b.id AND x.video_key = '${INTRO}'
         )
         SELECT
           (SELECT count(*)::int FROM base) AS registered,
           (SELECT count(*)::int FROM base WHERE last_seen_at > created_at + interval '30 minutes') AS returned,
           (SELECT count(*)::int FROM d0 WHERE opened OR has_row) AS day0_opened,
           (SELECT count(*)::int FROM d0 WHERE coalesce(g, false)) AS day0_grammar,
           (SELECT count(*)::int FROM d0 WHERE w) AS day0_vocab,
           (SELECT count(*)::int FROM d0 WHERE o) AS day0_reading,
           (SELECT count(*)::int FROM d0 WHERE sp) AS day0_speaking,
           (SELECT count(*)::int FROM d0 WHERE coalesce(g, false) AND w AND o AND sp AND sj) AS day0_completed,
           (SELECT count(*)::int FROM v WHERE page OR plays > 0) AS video_page,
           (SELECT count(*)::int FROM v WHERE plays > 0) AS video_started,
           (SELECT count(*)::int FROM v WHERE max_position_seconds >= coalesce(duration_seconds, $3::real) / 2) AS video_half,
           (SELECT count(*)::int FROM v WHERE completed_at IS NOT NULL) AS video_completed,
           (SELECT coalesce(round(avg(watched_seconds)), 0)::int FROM v WHERE plays > 0) AS video_avg_watched,
           (SELECT count(*)::int FROM base WHERE plan_expires_at > now()) AS premium`,
        [days, prompts, TRACKED_VIDEOS[INTRO].durationSeconds],
      );
      // Qayerda to'xtashadi: videoning qaysi daqiqasida ko'rish tugagan.
      const drop = await q(
        `SELECT floor(least(x.max_position_seconds, coalesce(x.duration_seconds, $2::real)) / 30)::int AS bucket, count(*)::int AS count
         FROM user_video_progress x JOIN users u ON u.id = x.user_id
         WHERE x.video_key = '${INTRO}' AND x.plays > 0 AND x.completed_at IS NULL AND ${STUDENTS}
           AND ($1::int IS NULL OR u.created_at > now() - make_interval(days => $1::int))
         GROUP BY 1 ORDER BY 1`,
        [days, TRACKED_VIDEOS[INTRO].durationSeconds],
      );
      res.json({
        days,
        totals: rows[0],
        video_duration_seconds: TRACKED_VIDEOS[INTRO].durationSeconds,
        video_dropoff: drop.rows.map((r) => ({ from_seconds: r.bucket * 30, count: r.count })),
      });
    } catch (err) {
      console.error('[admin/user-journey] summary', err);
      res.status(500).json({ error: 'summary_failed' });
    }
  });

  // GET /api/admin/user-journey/list?days=&q=&status=&limit=&offset=
  router.get('/list', async (req: Request, res: Response) => {
    if (!q) return res.status(503).json({ error: 'db_unavailable' });
    const days = periodDays(req.query.days);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const where = [STUDENTS, `($1::int IS NULL OR u.created_at > now() - make_interval(days => $1::int))`];
    const params: unknown[] = [days];
    const search = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : '';
    if (search) {
      params.push(`%${search.replace(/[%_\\]/g, (c) => '\\' + c)}%`);
      const p = `$${params.length}`;
      where.push(`(u.first_name ILIKE ${p} OR u.last_name ILIKE ${p} OR u.phone ILIKE ${p} OR u.email ILIKE ${p}
        OR (u.first_name || ' ' || coalesce(u.last_name, '')) ILIKE ${p} OR u.id::text = $${params.length + 1})`);
      params.push(search);
    }
    const status = typeof req.query.status === 'string' ? STATUS_FILTERS[req.query.status] : undefined;
    if (status) where.push(status);
    const whereSql = 'WHERE ' + where.join(' AND ');
    try {
      const prompts = await day0PromptCount(q);
      const total = await q(
        `SELECT count(*)::int AS n FROM users u
         LEFT JOIN user_journey_steps d0 ON d0.user_id = u.id AND d0.step_key = 'day0_open' ${whereSql}`,
        params,
      );
      const { rows } = await q(
        `${ROWS_SQL} ${whereSql} ORDER BY u.created_at DESC, u.id DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset],
      );
      res.json({ rows: rows.map((r) => shape(r as BaseRow, prompts)), total: total.rows[0]?.n ?? 0 });
    } catch (err) {
      console.error('[admin/user-journey] list', err);
      res.status(500).json({ error: 'list_failed' });
    }
  });

  // GET /api/admin/user-journey/user/:id — profil kartasi uchun, qadamlar tarixi bilan.
  router.get('/user/:id', async (req: Request, res: Response) => {
    if (!q) return res.status(503).json({ error: 'db_unavailable' });
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'invalid_id' });
    try {
      const prompts = await day0PromptCount(q);
      const { rows } = await q(`${ROWS_SQL} WHERE u.id = $1`, [id]);
      if (!rows[0]) return res.status(404).json({ error: 'not_found' });
      const steps = await q(
        `SELECT step_key, first_at, last_at, hits FROM user_journey_steps WHERE user_id = $1 ORDER BY first_at`,
        [id],
      );
      res.json({ user: shape(rows[0] as BaseRow, prompts), steps: steps.rows });
    } catch (err) {
      console.error('[admin/user-journey] user', err);
      res.status(500).json({ error: 'user_failed' });
    }
  });

  return router;
}
