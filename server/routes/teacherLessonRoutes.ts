/**
 * PULLIK DARSLAR VA O'QITUVCHI BALANSI.
 *
 * O'quvchi: bo'sh vaqtni ko'radi, bron qiladi (keyin Rahmat orqali to'laydi —
 * rahmatMulticardPayment.service), darsga FalaRus video xonasidan kiradi,
 * bekor qiladi yoki muammo bildiradi.
 * O'qituvchi: darslar ro'yxati, «Dars o'tdi», balans va pul yechish arizasi.
 * Admin: arizalarni to'langan/rad deb belgilaydi, munozarali darslarni hal qiladi.
 *
 * Pul harakati (yakunlash, yechish, qaytarish) tranzaksiyada va jurnalga yoziladi;
 * dars uchun yozuv bitta (lesson_id unikal) — ikki marta to'lanmaydi.
 */
import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import { pool } from '../lib/db.js';
import { MEET_DOMAIN } from '../services/teacherMeet.service.js';
import {
  AUTO_COMPLETE_HOURS, LESSON_MINUTES, MIN_LEAD_MINUTES, MIN_WITHDRAWAL_UZS, PENDING_HOLD_MINUTES,
  canCancel, canComplete, canDispute, joinState, joinWindow, maskCard, normalizeCardNumber, splitLessonPrice,
  type LessonStatus,
} from '../../shared/teacherLessons.js';
import { DEFAULT_SETTINGS, normalizeSchedule, upcomingSlotStarts, validateTiers, type OnboardingSettings } from '../../shared/teacherOnboarding.js';

export type LessonQuery = (sql: string, params?: unknown[]) => Promise<{ rows: any[] }>;
export type LessonDeps = {
  q?: LessonQuery | null;
  /** Tranzaksiya: hamma so'rovlar bitta ulanishda. */
  tx?: (<T>(fn: (q: LessonQuery) => Promise<T>) => Promise<T>) | null;
  meetDomain?: string;
};

const poolQuery: LessonQuery | null = pool ? (sql, params) => pool!.query(sql, params) : null;
const poolTx = pool ? async <T>(fn: (q: LessonQuery) => Promise<T>): Promise<T> => {
  const c = await pool!.connect();
  try {
    await c.query('BEGIN');
    const out = await fn((sql, params) => c.query(sql, params));
    await c.query('COMMIT');
    return out;
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
} : null;

class HttpError extends Error {
  constructor(public status: number, message: string, public extra: Record<string, unknown> = {}) { super(message); }
}

const LESSON_COLS = `l.id, l.teacher_user_id, l.student_user_id, l.starts_at, l.ends_at, l.price_uzs, l.status, l.payment_id,
  l.student_message, l.lesson_number, l.commission_percent, l.teacher_amount_uzs, l.completed_at, l.dispute_reason,
  l.cancelled_at, l.cancelled_by, l.cancel_reason, l.refund_due, l.refunded_at, l.created_at`;

async function settings(q: LessonQuery): Promise<OnboardingSettings> {
  const r = (await q('SELECT price_min_uzs, price_max_uzs, commission_tiers, terms_version FROM teacher_onboarding_settings WHERE id')).rows[0];
  return r ? { price_min_uzs: r.price_min_uzs, price_max_uzs: r.price_max_uzs, commission_tiers: validateTiers(r.commission_tiers) ?? DEFAULT_SETTINGS.commission_tiers, terms_version: r.terms_version } : DEFAULT_SETTINGS;
}

async function notify(q: LessonQuery, userId: number, type: string, title: string, body: string, lessonId?: number) {
  await q(`INSERT INTO teacher_notifications (recipient_user_id, type, title, body, entity_type, entity_id) VALUES ($1, $2, $3, $4, 'teacher_lesson', $5)`,
    [userId, type, title, body, lessonId ?? null]).catch((e) => console.error('[lessons] notify', e?.message ?? e));
}

/** O'qituvchining platformadagi darslari: yakunlangan sinov + video sessiya + pullik dars (komissiya pog'onasi uchun). */
export async function platformLessonsDone(q: LessonQuery, teacherId: number): Promise<number> {
  const { rows } = await q(
    `SELECT (SELECT count(*) FROM teacher_trial_lessons WHERE teacher_user_id = $1 AND status IN ('completed', 'completed_by_teacher'))
          + (SELECT count(*) FROM teacher_meet_sessions WHERE teacher_user_id = $1 AND status = 'ended')
          + (SELECT count(*) FROM teacher_lessons WHERE teacher_user_id = $1 AND status = 'completed') AS n`, [teacherId]);
  return Number(rows[0]?.n ?? 0);
}

/** To'lanmay qolgan bronni bo'shatish va muddati o'tgan darslarni avtomatik yakunlash. */
async function housekeeping(q: LessonQuery, tx: NonNullable<LessonDeps['tx']>, scope: { teacherId?: number; studentId?: number } = {}) {
  await q(`UPDATE teacher_lessons SET status = 'expired', updated_at = now()
    WHERE status = 'pending_payment' AND created_at < now() - ($1::int * interval '1 minute')`, [PENDING_HOLD_MINUTES]);
  const due = await q(`SELECT id FROM teacher_lessons WHERE status = 'paid' AND ends_at < now() - ($1::int * interval '1 hour')
    AND ($2::int IS NULL OR teacher_user_id = $2) AND ($3::int IS NULL OR student_user_id = $3) LIMIT 50`,
  [AUTO_COMPLETE_HOURS, scope.teacherId ?? null, scope.studentId ?? null]);
  for (const r of due.rows) await completeLesson(tx, Number(r.id), 'auto');
}

/**
 * Darsni yakunlash: tartib raqami va stavka qotiriladi, balansga o'qituvchi ulushi yoziladi.
 * Idempotent — allaqachon yakunlangan dars uchun hech narsa qilmaydi.
 */
export async function completeLesson(tx: NonNullable<LessonDeps['tx']>, lessonId: number, actor: string) {
  return tx(async (q) => {
    const l = (await q(`SELECT * FROM teacher_lessons WHERE id = $1 FOR UPDATE`, [lessonId])).rows[0];
    if (!l || (l.status !== 'paid' && l.status !== 'disputed')) return null;
    // Bir o'qituvchining darslari ketma-ket raqamlansin (bir vaqtda ikki yakunlash bo'lsa ham).
    await q('SELECT pg_advisory_xact_lock(7101, $1)', [l.teacher_user_id]);
    const n = (await platformLessonsDone(q, l.teacher_user_id)) + 1;
    const s = await settings(q);
    const split = splitLessonPrice(l.price_uzs, n, s.commission_tiers);
    await q(`UPDATE teacher_lessons SET status = 'completed', lesson_number = $2, commission_percent = $3, teacher_amount_uzs = $4,
      platform_amount_uzs = $5, completed_at = now(), completed_by = $6, updated_at = now() WHERE id = $1`,
    [lessonId, n, split.percent, split.teacher, split.platform, actor]);
    await q(`INSERT INTO teacher_balance_entries (teacher_user_id, kind, amount_uzs, lesson_id, note, created_by)
      VALUES ($1, 'lesson', $2, $3, $4, $5) ON CONFLICT (lesson_id) DO NOTHING`,
    [l.teacher_user_id, split.teacher, lessonId, `${n}-dars · komissiya ${split.percent}%`, actor]);
    await notify(q, l.teacher_user_id, 'lesson_completed', 'Dars yakunlandi',
      `Balansingizga ${split.teacher.toLocaleString('ru-RU')} soʻm yozildi (komissiya ${split.percent}%).`, lessonId);
    return { lesson_number: n, ...split };
  });
}

/** Rahmat/Click/admin to'lovni tasdiqlaganda (teacherMarketplace.service orqali). */
export async function activateTeacherLessonPayment(q: LessonQuery, paymentId: number) {
  const l = (await q(`SELECT id, teacher_user_id, status, starts_at FROM teacher_lessons WHERE payment_id = $1`, [paymentId])).rows[0];
  if (!l || l.status === 'paid' || l.status === 'completed') return;
  try {
    await q(`UPDATE teacher_lessons SET status = 'paid', updated_at = now() WHERE id = $1 AND status IN ('pending_payment', 'expired')`, [l.id]);
  } catch (e: any) {
    // Bron muddati o'tib, vaqtni boshqa o'quvchi olgan — dars bo'lmaydi, pul qaytariladi.
    if (e?.code !== '23505') throw e;
    await q(`UPDATE teacher_lessons SET status = 'cancelled', refund_due = true, cancelled_at = now(), cancelled_by = 'system',
      cancel_reason = 'Toʻlov kech keldi: vaqt band boʻlib qolgan', updated_at = now() WHERE id = $1`, [l.id]);
    return;
  }
  await notify(q, l.teacher_user_id, 'lesson_paid', 'Yangi dars band qilindi',
    `Oʻquvchi darsni toʻladi: ${new Date(l.starts_at).toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent' })} (Toshkent).`, l.id);
}

/**
 * Rahmat to'lovi yaratilishidan oldin: bron shu o'quvchiniki va to'lov kutyapti.
 * Bron muddati (30 daqiqa) o'tgan bo'lsa, vaqt hali bo'sh bo'lsa qayta tiklanadi.
 */
export async function prepareLessonPayment(userId: number, lessonId: number, q: LessonQuery | null = poolQuery): Promise<{ amount: number }> {
  if (!q) throw new Error('Baza ulanmagan');
  const l = (await q(`SELECT id, status, price_uzs, starts_at FROM teacher_lessons WHERE id = $1 AND student_user_id = $2`, [lessonId, userId])).rows[0];
  if (!l) throw new Error('Dars topilmadi');
  if (new Date(l.starts_at).getTime() < Date.now() + 15 * 60_000) throw new Error('Dars vaqti juda yaqin — boshqa vaqtni tanlang');
  if (l.status === 'expired') {
    try {
      await q(`UPDATE teacher_lessons SET status = 'pending_payment', created_at = now(), updated_at = now() WHERE id = $1 AND status = 'expired'`, [lessonId]);
    } catch (e: any) {
      if (e?.code === '23505') throw new Error('Bu vaqtni boshqa oʻquvchi band qildi — boshqa vaqtni tanlang');
      throw e;
    }
  } else if (l.status !== 'pending_payment') {
    throw new Error(l.status === 'paid' ? 'Bu dars allaqachon toʻlangan' : 'Bu darsni toʻlab boʻlmaydi');
  }
  return { amount: Number(l.price_uzs) };
}

export async function linkLessonPayment(lessonId: number, paymentId: number, q: LessonQuery | null = poolQuery) {
  if (!q) return;
  await q(`UPDATE teacher_lessons SET payment_id = $2, created_at = now(), updated_at = now() WHERE id = $1 AND status = 'pending_payment'`, [lessonId, paymentId]);
}

/** Asosiy baza bilan (pool) — to'lov callback'lari uchun. */
export async function activateTeacherLessonPaymentDefault(paymentId: number) {
  if (!poolQuery) return;
  await activateTeacherLessonPayment(poolQuery, paymentId);
}

export async function balanceOf(q: LessonQuery, teacherId: number) {
  const r = (await q(`SELECT coalesce(sum(amount_uzs), 0)::bigint AS balance,
      coalesce(sum(amount_uzs) FILTER (WHERE kind = 'lesson'), 0)::bigint AS earned
    FROM teacher_balance_entries WHERE teacher_user_id = $1`, [teacherId])).rows[0];
  return { balance: Number(r.balance), earned: Number(r.earned) };
}

const shape = (l: any) => ({ ...l, join: joinWindow(l.starts_at, l.ends_at) });

export function createTeacherLessonRoutes(authenticate: (req: any, res: any, next: any) => void, deps: LessonDeps = {}): Router {
  const q = deps.q === undefined ? poolQuery : deps.q;
  const tx = deps.tx === undefined ? poolTx : deps.tx;
  const meetDomain = deps.meetDomain ?? MEET_DOMAIN;
  const router = Router();
  const h = (fn: (req: any, res: Response) => Promise<unknown>) => (req: Request, res: Response) =>
    fn(req, res).catch((e) => {
      if (e instanceof HttpError) return res.status(e.status).json({ error: e.message, ...e.extra });
      console.error('[lessons]', e);
      res.status(500).json({ error: 'Server xatosi, qayta urinib koʻring' });
    });
  const db = () => { if (!q || !tx) throw new HttpError(503, 'Baza ulanmagan'); return { q, tx }; };
  const userOf = async (id: number) => (await db().q('SELECT id, first_name, last_name, account_type FROM users WHERE id = $1', [id])).rows[0];

  /* ───────────── o'quvchi ───────────── */

  /** Bron uchun: narx, jadval va band vaqtlar (o'quvchi o'z soatida ko'radi). */
  router.get('/teachers/:teacherId/lesson-slots', h(async (req, res) => {
    const { q } = db();
    const id = Number(req.params.teacherId);
    const t = (await q(`SELECT user_id, lesson_price_uzs, schedule, terms_accepted_at FROM teacher_profiles WHERE user_id = $1 AND profile_status = 'active'`, [id])).rows[0];
    if (!t) throw new HttpError(404, 'Oʻqituvchi topilmadi');
    await q(`UPDATE teacher_lessons SET status = 'expired', updated_at = now() WHERE status = 'pending_payment' AND created_at < now() - ($1::int * interval '1 minute')`, [PENDING_HOLD_MINUTES]);
    const busy = (await q(`SELECT starts_at FROM teacher_lessons WHERE teacher_user_id = $1 AND status IN ('pending_payment', 'paid', 'disputed') AND starts_at > now()
      UNION SELECT scheduled_starts_at FROM teacher_trial_lessons WHERE teacher_user_id = $1 AND scheduled_starts_at > now() AND status NOT IN ('cancelled', 'refunded', 'pending_payment')`, [id])).rows;
    res.json({
      price_uzs: t.lesson_price_uzs, bookable: Boolean(t.lesson_price_uzs && t.schedule && t.terms_accepted_at),
      schedule: t.schedule ? normalizeSchedule(t.schedule) : null, busy: busy.map((b) => new Date(b.starts_at).toISOString()),
      min_lead_minutes: MIN_LEAD_MINUTES,
    });
  }));

  /** Bron: vaqt o'qituvchi jadvalida bo'lishi, bo'sh bo'lishi va kamida 1 soat keyin bo'lishi shart. */
  router.post('/teachers/:teacherId/lessons', authenticate, h(async (req, res) => {
    const { q } = db();
    const teacherId = Number(req.params.teacherId);
    const studentId = Number(req.userId);
    if (teacherId === studentId) throw new HttpError(400, 'Oʻzingizga dars band qila olmaysiz');
    const t = (await q(`SELECT user_id, lesson_price_uzs, schedule, terms_accepted_at FROM teacher_profiles WHERE user_id = $1 AND profile_status = 'active'`, [teacherId])).rows[0];
    if (!t?.lesson_price_uzs || !t.schedule || !t.terms_accepted_at) throw new HttpError(409, 'Bu oʻqituvchi hozircha pullik dars qabul qilmaydi');
    const startsAt = new Date(String(req.body?.starts_at ?? ''));
    if (Number.isNaN(startsAt.getTime())) throw new HttpError(400, 'Vaqtni tanlang');
    if (startsAt.getTime() < Date.now() + MIN_LEAD_MINUTES * 60_000) throw new HttpError(400, 'Darsni kamida 1 soat oldin band qiling');
    const allowed = upcomingSlotStarts(normalizeSchedule(t.schedule), Date.now(), 21);
    if (!allowed.includes(startsAt.getTime())) throw new HttpError(400, 'Bu vaqt oʻqituvchi jadvalida yoʻq');
    await q(`UPDATE teacher_lessons SET status = 'expired', updated_at = now() WHERE status = 'pending_payment' AND created_at < now() - ($1::int * interval '1 minute')`, [PENDING_HOLD_MINUTES]);
    // O'quvchining shu ustozdagi to'lanmagan eski broni bo'shatiladi — bir vaqtda bitta to'lov.
    await q(`UPDATE teacher_lessons SET status = 'expired', updated_at = now() WHERE student_user_id = $1 AND teacher_user_id = $2 AND status = 'pending_payment' AND starts_at <> $3`,
      [studentId, teacherId, startsAt.toISOString()]);
    const mine = (await q(`SELECT ${LESSON_COLS} FROM teacher_lessons l WHERE student_user_id = $1 AND teacher_user_id = $2 AND starts_at = $3 AND status = 'pending_payment'`,
      [studentId, teacherId, startsAt.toISOString()])).rows[0];
    if (mine) return res.json(shape(mine));
    try {
      const row = (await q(`INSERT INTO teacher_lessons (teacher_user_id, student_user_id, starts_at, ends_at, price_uzs, room_slug, student_message)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [teacherId, studentId, startsAt.toISOString(), new Date(startsAt.getTime() + LESSON_MINUTES * 60_000).toISOString(), t.lesson_price_uzs,
        `falarus-dars-${crypto.randomBytes(10).toString('hex')}`, String(req.body?.message ?? '').slice(0, 500)])).rows[0];
      res.status(201).json(shape((await q(`SELECT ${LESSON_COLS} FROM teacher_lessons l WHERE id = $1`, [row.id])).rows[0]));
    } catch (e: any) {
      if (e?.code === '23505') throw new HttpError(409, 'Bu vaqtni boshqa oʻquvchi band qildi — boshqa vaqtni tanlang');
      throw e;
    }
  }));

  router.get('/my-lessons', authenticate, h(async (req, res) => {
    const { q, tx } = db();
    const id = Number(req.userId);
    await housekeeping(q, tx, { studentId: id });
    const rows = (await q(`SELECT ${LESSON_COLS}, p.first_name AS teacher_first_name, p.last_name AS teacher_last_name, p.avatar_url AS teacher_avatar_url
      FROM teacher_lessons l JOIN teacher_profiles p ON p.user_id = l.teacher_user_id
      WHERE l.student_user_id = $1 AND l.status <> 'expired' ORDER BY l.starts_at DESC LIMIT 100`, [id])).rows;
    res.json(rows.map(shape));
  }));

  async function participant(req: any, lessonId: number) {
    const l = (await db().q(`SELECT * FROM teacher_lessons WHERE id = $1`, [lessonId])).rows[0];
    const me = Number(req.userId);
    if (!l || (l.student_user_id !== me && l.teacher_user_id !== me)) throw new HttpError(404, 'Dars topilmadi');
    return { l, role: l.teacher_user_id === me ? 'teacher' as const : 'student' as const };
  }

  /** Video xonaga kirish: faqat ishtirokchilar, faqat vaqtida (425 — hali erta). */
  router.get('/lessons/:id/join', authenticate, h(async (req, res) => {
    const { l, role } = await participant(req, Number(req.params.id));
    if (!['paid', 'disputed', 'completed'].includes(l.status)) throw new HttpError(409, 'Dars toʻlanmagan yoki bekor qilingan');
    const state = joinState(l.starts_at, l.ends_at);
    const w = joinWindow(l.starts_at, l.ends_at);
    if (state === 'early') throw new HttpError(425, 'Xona dars boshlanishidan 10 daqiqa oldin ochiladi', { starts_at: l.starts_at, opens_at: new Date(w.opensAt).toISOString() });
    if (state === 'late') throw new HttpError(410, 'Dars vaqti tugagan');
    const u = await userOf(Number(req.userId));
    res.json({
      type: 'jitsi', domain: meetDomain, room_slug: l.room_slug, title: 'FalaRus darsi', starts_at: l.starts_at, role,
      display_name: `${u?.first_name ?? ''} ${u?.last_name ?? ''}`.trim() || (role === 'teacher' ? 'Oʻqituvchi' : 'Oʻquvchi'), email: null,
    });
  }));

  router.post('/lessons/:id/cancel', authenticate, h(async (req, res) => {
    const { q } = db();
    const { l, role } = await participant(req, Number(req.params.id));
    if (!canCancel(l.status as LessonStatus, l.starts_at)) throw new HttpError(409, 'Boshlangan yoki yakunlangan darsni bekor qilib boʻlmaydi');
    const reason = String(req.body?.reason ?? '').trim().slice(0, 300);
    await q(`UPDATE teacher_lessons SET status = 'cancelled', refund_due = (status = 'paid'), cancelled_at = now(), cancelled_by = $2, cancel_reason = $3, updated_at = now()
      WHERE id = $1 AND status IN ('pending_payment', 'paid')`, [l.id, role, reason || null]);
    if (l.status === 'paid') {
      const other = role === 'teacher' ? l.student_user_id : l.teacher_user_id;
      await notify(q, other, 'lesson_cancelled', 'Dars bekor qilindi',
        role === 'teacher' ? 'Oʻqituvchi darsni bekor qildi. Toʻlov qaytariladi.' : `Oʻquvchi darsni bekor qildi${reason ? `: ${reason}` : ''}.`, l.id);
    }
    res.json({ ok: true, refund_due: l.status === 'paid' });
  }));

  router.post('/lessons/:id/dispute', authenticate, h(async (req, res) => {
    const { q } = db();
    const { l, role } = await participant(req, Number(req.params.id));
    if (role !== 'student') throw new HttpError(403, 'Faqat oʻquvchi');
    if (!canDispute(l.status as LessonStatus, l.starts_at, l.ends_at)) throw new HttpError(409, 'Muammo bildirish muddati oʻtgan');
    const reason = String(req.body?.reason ?? '').trim().slice(0, 500);
    if (reason.length < 5) throw new HttpError(400, 'Nima boʻlganini qisqacha yozing');
    await q(`UPDATE teacher_lessons SET status = 'disputed', dispute_reason = $2, updated_at = now() WHERE id = $1 AND status = 'paid'`, [l.id, reason]);
    res.json({ ok: true });
  }));

  /** Sinov darsi ham FalaRus xonasida: xona nomi birinchi kirishda yaratiladi. */
  router.get('/teacher-trials/:id/join', authenticate, h(async (req, res) => {
    const { q } = db();
    const me = Number(req.userId);
    const t = (await q(`SELECT * FROM teacher_trial_lessons WHERE id = $1`, [Number(req.params.id)])).rows[0];
    if (!t || (t.student_user_id !== me && t.teacher_user_id !== me)) throw new HttpError(404, 'Dars topilmadi');
    if (['pending_payment', 'cancelled', 'refunded'].includes(t.status)) throw new HttpError(409, 'Dars toʻlanmagan yoki bekor qilingan');
    if (!t.scheduled_starts_at) throw new HttpError(409, 'Dars vaqti belgilanmagan — oʻqituvchi bilan chatda kelishing');
    const ends = t.scheduled_ends_at ?? new Date(new Date(t.scheduled_starts_at).getTime() + LESSON_MINUTES * 60_000).toISOString();
    const state = joinState(t.scheduled_starts_at, ends);
    if (state === 'early') throw new HttpError(425, 'Xona dars boshlanishidan 10 daqiqa oldin ochiladi', { starts_at: t.scheduled_starts_at, opens_at: new Date(joinWindow(t.scheduled_starts_at, ends).opensAt).toISOString() });
    if (state === 'late') throw new HttpError(410, 'Dars vaqti tugagan');
    let slug = t.room_slug;
    if (!slug) {
      slug = `falarus-sinov-${crypto.randomBytes(10).toString('hex')}`;
      const upd = (await q(`UPDATE teacher_trial_lessons SET room_slug = $2 WHERE id = $1 AND room_slug IS NULL RETURNING room_slug`, [t.id, slug])).rows[0];
      if (!upd) slug = (await q('SELECT room_slug FROM teacher_trial_lessons WHERE id = $1', [t.id])).rows[0].room_slug;
    }
    const role = t.teacher_user_id === me ? 'teacher' : 'student';
    const u = await userOf(me);
    res.json({ type: 'jitsi', domain: meetDomain, room_slug: slug, title: 'Sinov darsi', starts_at: t.scheduled_starts_at, role,
      display_name: `${u?.first_name ?? ''} ${u?.last_name ?? ''}`.trim() || (role === 'teacher' ? 'Oʻqituvchi' : 'Oʻquvchi'), email: null });
  }));

  /* ───────────── o'qituvchi ───────────── */

  async function teacherId(req: any) {
    const u = await userOf(Number(req.userId));
    if (u?.account_type !== 'teacher') throw new HttpError(403, 'Bu boʻlim faqat oʻqituvchilar uchun');
    return Number(req.userId);
  }

  router.get('/teacher/lessons', authenticate, h(async (req, res) => {
    const { q, tx } = db();
    const id = await teacherId(req);
    await housekeeping(q, tx, { teacherId: id });
    const rows = (await q(`SELECT ${LESSON_COLS}, u.first_name AS student_first_name, u.last_name AS student_last_name
      FROM teacher_lessons l JOIN users u ON u.id = l.student_user_id
      WHERE l.teacher_user_id = $1 AND l.status NOT IN ('pending_payment', 'expired') ORDER BY l.starts_at DESC LIMIT 200`, [id])).rows;
    res.json(rows.map(shape));
  }));

  router.post('/teacher/lessons/:id/complete', authenticate, h(async (req, res) => {
    const { q, tx } = db();
    const id = await teacherId(req);
    const l = (await q(`SELECT id, status, starts_at FROM teacher_lessons WHERE id = $1 AND teacher_user_id = $2`, [Number(req.params.id), id])).rows[0];
    if (!l) throw new HttpError(404, 'Dars topilmadi');
    if (l.status === 'completed') return res.json({ ok: true });
    if (!canComplete(l.status as LessonStatus, l.starts_at)) throw new HttpError(409, l.status === 'disputed' ? 'Oʻquvchi muammo bildirgan — maʼmuriyat hal qiladi' : 'Dars hali boshlanmagan');
    res.json({ ok: true, ...(await completeLesson(tx, l.id, 'teacher')) });
  }));

  router.get('/teacher/balance', authenticate, h(async (req, res) => {
    const { q, tx } = db();
    const id = await teacherId(req);
    await housekeeping(q, tx, { teacherId: id });
    const [bal, entries, withdrawals, upcoming] = await Promise.all([
      balanceOf(q, id),
      q(`SELECT id, kind, amount_uzs, lesson_id, withdrawal_id, note, created_at FROM teacher_balance_entries WHERE teacher_user_id = $1 ORDER BY id DESC LIMIT 50`, [id]),
      q(`SELECT id, amount_uzs, card_number, card_holder, status, admin_note, requested_at, processed_at FROM teacher_withdrawals WHERE teacher_user_id = $1 ORDER BY id DESC LIMIT 20`, [id]),
      q(`SELECT coalesce(sum(price_uzs), 0)::bigint AS gross, count(*)::int AS n FROM teacher_lessons WHERE teacher_user_id = $1 AND status IN ('paid', 'disputed')`, [id]),
    ]);
    res.json({
      ...bal,
      entries: entries.rows,
      withdrawals: withdrawals.rows.map((w) => ({ ...w, card_number: maskCard(w.card_number) })),
      upcoming: { lessons: upcoming.rows[0].n, gross_uzs: Number(upcoming.rows[0].gross) },
      min_withdrawal_uzs: MIN_WITHDRAWAL_UZS,
    });
  }));

  /** Pul yechish arizasi: summa darhol band qilinadi (jurnalga minus), admin qo'lda o'tkazadi. */
  router.post('/teacher/withdrawals', authenticate, h(async (req, res) => {
    const { tx } = db();
    const id = await teacherId(req);
    const amount = Math.round(Number(req.body?.amount_uzs));
    const card = normalizeCardNumber(req.body?.card_number);
    const holder = String(req.body?.card_holder ?? '').trim().slice(0, 80);
    if (!Number.isInteger(amount) || amount < MIN_WITHDRAWAL_UZS) throw new HttpError(400, `Eng kam summa — ${MIN_WITHDRAWAL_UZS.toLocaleString('ru-RU')} soʻm`);
    if (!card) throw new HttpError(400, 'Karta raqami 16 ta raqamdan iborat boʻlsin');
    if (holder.length < 3) throw new HttpError(400, 'Karta egasining ism-familiyasini yozing');
    const out = await tx(async (q) => {
      await q('SELECT pg_advisory_xact_lock(7102, $1)', [id]);
      const { balance } = await balanceOf(q, id);
      if (amount > balance) throw new HttpError(400, `Balansda ${balance.toLocaleString('ru-RU')} soʻm bor`);
      const w = (await q(`INSERT INTO teacher_withdrawals (teacher_user_id, amount_uzs, card_number, card_holder) VALUES ($1, $2, $3, $4) RETURNING id`, [id, amount, card, holder])).rows[0];
      await q(`INSERT INTO teacher_balance_entries (teacher_user_id, kind, amount_uzs, withdrawal_id, note, created_by) VALUES ($1, 'withdrawal', $2, $3, $4, 'teacher')`,
        [id, -amount, w.id, `Pul yechish arizasi #${w.id}`]);
      return { id: w.id, balance: balance - amount };
    });
    res.status(201).json(out);
  }));

  return router;
}

/* ───────────── admin ───────────── */

export function createAdminTeacherMoneyRoutes(deps: LessonDeps = {}): Router {
  const q = deps.q === undefined ? poolQuery : deps.q;
  const tx = deps.tx === undefined ? poolTx : deps.tx;
  const router = Router();
  const h = (fn: (req: any, res: Response) => Promise<unknown>) => (req: Request, res: Response) =>
    fn(req, res).catch((e) => {
      if (e instanceof HttpError) return res.status(e.status).json({ error: e.message, ...e.extra });
      console.error('[admin/teacher-money]', e);
      res.status(500).json({ error: 'Server xatosi' });
    });
  const db = () => { if (!q || !tx) throw new HttpError(503, 'Baza ulanmagan'); return { q, tx }; };
  const actor = (req: any) => `admin:${String(req.adminLogin ?? req.admin?.login ?? 'admin').slice(0, 50)}`;

  router.get('/withdrawals', h(async (req, res) => {
    const status = typeof req.query.status === 'string' && ['requested', 'paid', 'rejected'].includes(req.query.status) ? req.query.status : null;
    const rows = (await db().q(`SELECT w.*, p.first_name, p.last_name, u.phone,
        (SELECT coalesce(sum(amount_uzs), 0)::bigint FROM teacher_balance_entries b WHERE b.teacher_user_id = w.teacher_user_id) AS balance_after
      FROM teacher_withdrawals w JOIN teacher_profiles p ON p.user_id = w.teacher_user_id JOIN users u ON u.id = w.teacher_user_id
      WHERE ($1::text IS NULL OR w.status = $1) ORDER BY (w.status = 'requested') DESC, w.requested_at DESC LIMIT 200`, [status])).rows;
    const totals = (await db().q(`SELECT status, count(*)::int AS n, coalesce(sum(amount_uzs), 0)::bigint AS sum FROM teacher_withdrawals GROUP BY 1`)).rows;
    res.json({ rows, totals });
  }));

  /** paid — pul o'tkazildi; reject — summa balansga qaytadi. */
  router.post('/withdrawals/:id/:decision(paid|reject)', h(async (req, res) => {
    const id = Number(req.params.id);
    const note = String(req.body?.note ?? '').trim().slice(0, 300);
    if (req.params.decision === 'reject' && note.length < 3) throw new HttpError(400, 'Rad etish sababini yozing');
    const out = await db().tx(async (q) => {
      const w = (await q(`SELECT * FROM teacher_withdrawals WHERE id = $1 FOR UPDATE`, [id])).rows[0];
      if (!w) throw new HttpError(404, 'Ariza topilmadi');
      if (w.status !== 'requested') throw new HttpError(409, 'Ariza allaqachon koʻrib chiqilgan');
      const paid = req.params.decision === 'paid';
      await q(`UPDATE teacher_withdrawals SET status = $2, admin_note = $3, processed_at = now(), processed_by = $4 WHERE id = $1`, [id, paid ? 'paid' : 'rejected', note || null, actor(req)]);
      if (!paid) {
        await q(`INSERT INTO teacher_balance_entries (teacher_user_id, kind, amount_uzs, withdrawal_id, note, created_by) VALUES ($1, 'withdrawal_return', $2, $3, $4, $5)`,
          [w.teacher_user_id, w.amount_uzs, id, `Ariza #${id} rad etildi: ${note}`, actor(req)]);
      }
      await notify(q, w.teacher_user_id, 'withdrawal_processed', paid ? 'Pul oʻtkazildi' : 'Pul yechish arizasi rad etildi',
        paid ? `${Number(w.amount_uzs).toLocaleString('ru-RU')} soʻm kartangizga oʻtkazildi.` : `Summa balansga qaytarildi. Sabab: ${note}`);
      return { status: paid ? 'paid' : 'rejected' };
    });
    res.json(out);
  }));

  router.get('/lessons', h(async (req, res) => {
    const filter = String(req.query.filter ?? 'attention');
    const where = filter === 'attention' ? `(l.status = 'disputed' OR (l.refund_due AND l.refunded_at IS NULL))`
      : filter === 'upcoming' ? `l.status = 'paid'` : filter === 'completed' ? `l.status = 'completed'` : `l.status <> 'expired'`;
    const rows = (await db().q(`SELECT ${LESSON_COLS}, p.first_name AS teacher_first_name, p.last_name AS teacher_last_name,
        s.first_name AS student_first_name, s.last_name AS student_last_name, s.phone AS student_phone, l.platform_amount_uzs
      FROM teacher_lessons l JOIN teacher_profiles p ON p.user_id = l.teacher_user_id JOIN users s ON s.id = l.student_user_id
      WHERE ${where} ORDER BY l.starts_at DESC LIMIT 300`)).rows;
    const sums = (await db().q(`SELECT count(*) FILTER (WHERE status = 'completed')::int AS completed,
        coalesce(sum(platform_amount_uzs) FILTER (WHERE status = 'completed'), 0)::bigint AS platform,
        coalesce(sum(teacher_amount_uzs) FILTER (WHERE status = 'completed'), 0)::bigint AS teachers,
        count(*) FILTER (WHERE status = 'disputed' OR (refund_due AND refunded_at IS NULL))::int AS attention
      FROM teacher_lessons`)).rows[0];
    res.json({ rows, sums });
  }));

  /** Munozarali darsni hal qilish: complete — o'qituvchiga to'lanadi; cancel — o'quvchiga qaytariladi. */
  router.post('/lessons/:id/:action(complete|cancel|refunded)', h(async (req, res) => {
    const { q, tx } = db();
    const id = Number(req.params.id);
    const l = (await q(`SELECT * FROM teacher_lessons WHERE id = $1`, [id])).rows[0];
    if (!l) throw new HttpError(404, 'Dars topilmadi');
    if (req.params.action === 'complete') {
      if (l.status !== 'paid' && l.status !== 'disputed') throw new HttpError(409, 'Bu darsni yakunlab boʻlmaydi');
      return res.json({ ok: true, ...(await completeLesson(tx, id, actor(req))) });
    }
    if (req.params.action === 'cancel') {
      if (!['pending_payment', 'paid', 'disputed'].includes(l.status)) throw new HttpError(409, 'Bu darsni bekor qilib boʻlmaydi');
      const reason = String(req.body?.reason ?? '').trim().slice(0, 300);
      await q(`UPDATE teacher_lessons SET status = 'cancelled', refund_due = (status IN ('paid', 'disputed')), cancelled_at = now(), cancelled_by = $2,
        cancel_reason = $3, updated_at = now() WHERE id = $1`, [id, actor(req), reason || null]);
      await notify(q, l.teacher_user_id, 'lesson_cancelled', 'Dars bekor qilindi', reason ? `Maʼmuriyat: ${reason}` : 'Maʼmuriyat darsni bekor qildi.', id);
      return res.json({ ok: true });
    }
    if (!l.refund_due || l.refunded_at) throw new HttpError(409, 'Qaytarish kerak emas');
    await q(`UPDATE teacher_lessons SET status = 'refunded', refunded_at = now(), updated_at = now() WHERE id = $1`, [id]);
    res.json({ ok: true });
  }));

  return router;
}
