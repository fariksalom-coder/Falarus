/**
 * onboardingRoutes — ro'yxatdan o'tgandan keyingi so'rovnoma.
 *
 * Loyihaga moslashtirilgan: foydalanuvchi `req.userId` dan olinadi (JWT
 * middleware qo'yadi), yozish esa `pool` orqali BITTA tranzaksiyada bo'ladi —
 * javob saqlanib, `users.onboarding_completed` qo'yilmasa yoki teskarisi
 * bo'lsa, so'rovnoma qayta-qayta chiqib qolardi.
 *
 * Frontend'dan kelgan har bir qiymat ruxsat etilganlar ro'yxatiga solishtiriladi.
 * Noma'lum qiymat NULL bo'lib saqlanadi va xato BERMAYDI: so'rovnoma
 * ixtiyoriy, uning nosozligi ro'yxatdan o'tishni buzmasligi kerak.
 */
import { Router, type Request, type Response } from 'express';
import { pool } from '../lib/db.js';

const ALLOWED = {
  age_range: ['14_17', '18_24', '25_34', '35_44', '45_plus'],
  country: ['UZ', 'RU', 'KZ', 'KG', 'TJ', 'other'],
  goal: ['work_russia', 'living_russia', 'patent', 'study', 'career', 'communication'],
  level: ['zero', 'words', 'basic', 'intermediate'],
  source: ['instagram', 'youtube', 'tiktok', 'telegram', 'friend', 'google', 'ads', 'other'],
} as const;

type EnumField = keyof typeof ALLOWED;

const pickEnum = (field: EnumField, raw: unknown): string | null => {
  const v = typeof raw === 'string' ? raw.trim() : '';
  return (ALLOWED[field] as readonly string[]).includes(v) ? v : null;
};

/** Erkin matn: uzunlikni cheklab, tozalab qo'yamiz. */
const pickText = (raw: unknown, max = 200): string | null => {
  if (typeof raw !== 'string') return null;
  const v = raw.trim().slice(0, max);
  return v.length ? v : null;
};

const pickMinutes = (raw: unknown): number | null => {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 5 && n <= 240 ? Math.round(n) : null;
};

export function createOnboardingRoutes(
  authenticate: (req: Request, res: Response, next: () => void) => void,
): Router {
  const router = Router();

  // POST /api/onboarding — javoblarni saqlash
  router.post('/onboarding', authenticate, async (req: any, res: Response) => {
    const userId = Number(req.userId);
    if (!Number.isFinite(userId)) return res.status(401).json({ error: 'unauthorized' });
    if (!pool) return res.status(503).json({ error: 'db_unavailable' });

    const b = req.body ?? {};
    const values = [
      userId,
      pickEnum('age_range', b.age_range),
      pickEnum('country', b.country),
      pickText(b.region, 60),
      pickEnum('goal', b.goal),
      pickEnum('level', b.level),
      pickMinutes(b.daily_minutes),
      pickEnum('source', b.source),
      pickText(b.utm_source, 120),
      pickText(b.utm_medium, 120),
      pickText(b.utm_campaign, 200),
      pickText(b.utm_content, 200),
      pickText(b.referrer, 500),
      pickText(b.landing_path, 300),
      pickText(b.device_type, 20),
      Number.isFinite(Number(b.skipped_count)) ? Number(b.skipped_count) : 0,
    ];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO user_onboarding (
           user_id, age_range, country, region, goal, level, daily_minutes,
           source, utm_source, utm_medium, utm_campaign, utm_content,
           referrer, landing_path, device_type, skipped_count, completed_at
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16, now())
         ON CONFLICT (user_id) DO UPDATE SET
           age_range     = EXCLUDED.age_range,
           country       = EXCLUDED.country,
           region        = EXCLUDED.region,
           goal          = EXCLUDED.goal,
           level         = EXCLUDED.level,
           daily_minutes = EXCLUDED.daily_minutes,
           source        = EXCLUDED.source,
           skipped_count = EXCLUDED.skipped_count,
           completed_at  = now()`,
        values,
      );
      await client.query('UPDATE users SET onboarding_completed = true WHERE id = $1', [userId]);
      await client.query('COMMIT');
      return res.json({ ok: true });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      console.error('[onboarding] save failed', err);
      return res.status(500).json({ error: 'save_failed' });
    } finally {
      client.release();
    }
  });

  // GET /api/onboarding — so'rovnomani ko'rsatish kerakmi?
  router.get('/onboarding', authenticate, async (req: any, res: Response) => {
    const userId = Number(req.userId);
    if (!Number.isFinite(userId)) return res.status(401).json({ error: 'unauthorized' });
    if (!pool) return res.json({ completed: true, answers: null });

    try {
      const { rows } = await pool.query(
        `SELECT age_range, country, region, goal, level, daily_minutes,
                source, completed_at
         FROM user_onboarding WHERE user_id = $1`,
        [userId],
      );
      return res.json({
        completed: Boolean(rows[0]?.completed_at),
        answers: rows[0] ?? null,
      });
    } catch (err) {
      console.error('[onboarding] read failed', err);
      // So'rovnoma ixtiyoriy — o'qish buzilsa ham ilova to'xtamasin.
      return res.json({ completed: true, answers: null });
    }
  });

  return router;
}

/**
 * Admin uchun so'rovnoma hisobotlari.
 *
 * Ikkita endpoint: umumiy kesim (taqsimotlar) va oxirgi javoblar ro'yxati.
 * Hammasi bitta SQL bilan yig'iladi — admin paneli har taqsimot uchun alohida
 * so'rov yubormasin.
 */
export function createAdminOnboardingRoutes(): Router {
  const router = Router();

  /** Bitta ustun bo'yicha taqsimot: qiymat, soni, foizi. */
  async function distribution(column: string) {
    if (!pool) return [];
    const { rows } = await pool.query(
      `SELECT ${column}::text AS value,
              count(*)::int   AS count,
              round(100.0 * count(*) / NULLIF(sum(count(*)) OVER (), 0), 1)::float AS pct
       FROM user_onboarding
       WHERE ${column} IS NOT NULL
       GROUP BY 1
       ORDER BY 2 DESC`,
    );
    return rows;
  }

  // GET /api/admin/onboarding/summary
  router.get('/onboarding/summary', async (_req: Request, res: Response) => {
    if (!pool) return res.status(503).json({ error: 'db_unavailable' });
    try {
      const [totals, goal, level, minutes, age, country, source, sourceVsUtm, daily] =
        await Promise.all([
          pool.query(
            `SELECT count(*)::int                                  AS started,
                    count(completed_at)::int                       AS completed,
                    coalesce(round(avg(skipped_count), 1), 0)::float AS avg_skipped,
                    count(*) FILTER (WHERE skipped_count = 0)::int  AS full_answers
             FROM user_onboarding`,
          ),
          distribution('goal'),
          distribution('level'),
          distribution('daily_minutes'),
          distribution('age_range'),
          distribution('country'),
          distribution('source'),
          // «Aytgan manba» va haqiqiy UTM yonma-yon — javobga ishonch past.
          pool.query(
            `SELECT coalesce(source, '—')            AS said,
                    coalesce(nullif(utm_source, ''), '—') AS real,
                    count(*)::int                    AS count
             FROM user_onboarding
             GROUP BY 1, 2
             ORDER BY 3 DESC
             LIMIT 40`,
          ),
          // Kunlik oqim (oxirgi 30 kun)
          pool.query(
            `SELECT to_char(date_trunc('day', completed_at), 'YYYY-MM-DD') AS day,
                    count(*)::int AS count
             FROM user_onboarding
             WHERE completed_at > now() - interval '30 days'
             GROUP BY 1 ORDER BY 1`,
          ),
        ]);

      res.json({
        totals: totals.rows[0] ?? { started: 0, completed: 0, avg_skipped: 0, full_answers: 0 },
        goal,
        level,
        daily_minutes: minutes,
        age_range: age,
        country,
        source,
        source_vs_utm: sourceVsUtm.rows,
        daily: daily.rows,
      });
    } catch (err) {
      console.error('[admin/onboarding] summary failed', err);
      res.status(500).json({ error: 'summary_failed' });
    }
  });

  // GET /api/admin/onboarding/list?limit=&offset=&goal=&source=&country=
  router.get('/onboarding/list', async (req: Request, res: Response) => {
    if (!pool) return res.status(503).json({ error: 'db_unavailable' });
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const offset = Math.max(0, Number(req.query.offset) || 0);

    // Filtrlar faqat ruxsat etilgan ustunlar bo'yicha — SQL ichiga
    // foydalanuvchi matni tushmaydi.
    const where: string[] = [];
    const params: unknown[] = [];
    for (const key of ['goal', 'source', 'country', 'level'] as const) {
      const v = req.query[key];
      if (typeof v === 'string' && v.trim()) {
        params.push(v.trim());
        where.push(`o.${key} = $${params.length}`);
      }
    }
    params.push(limit, offset);

    try {
      const { rows } = await pool.query(
        `SELECT o.user_id, u.first_name, u.last_name, u.email, u.phone,
                o.age_range, o.country, o.region, o.goal, o.level, o.daily_minutes,
                o.source, o.utm_source, o.utm_medium, o.utm_campaign,
                o.referrer, o.landing_path, o.device_type,
                o.skipped_count, o.completed_at
         FROM user_onboarding o
         JOIN users u ON u.id = o.user_id
         ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
         ORDER BY o.completed_at DESC NULLS LAST
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      );
      const total = await pool.query(
        `SELECT count(*)::int AS n FROM user_onboarding o
         ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`,
        params.slice(0, params.length - 2),
      );
      res.json({ rows, total: total.rows[0]?.n ?? 0 });
    } catch (err) {
      console.error('[admin/onboarding] list failed', err);
      res.status(500).json({ error: 'list_failed' });
    }
  });

  return router;
}
