/**
 * O'QITUVCHI ONBORDINGI v2 — 8 qadamli anketa, fayllar, video, moderatsiya.
 *
 * Har qadam alohida saqlanadi: `?draft=1` — tekshiruvsiz qoralama (avtosaqlash),
 * oddiy saqlash — to'liq tekshiruv va keyingi qadamga o'tish. Shu sababli
 * sahifa yangilansa yoki aloqa uzilsa ham kiritilgan narsa yo'qolmaydi.
 *
 * Fayllar: surat — ommaviy (profilda ko'rinadi); sertifikat skanlari — YOPIQ
 * papkada, faqat egasi va admin oladi; video — bo'laklab yuklanadi (aloqa
 * uzilsa shu joydan davom etadi) va ffprobe bilan davomiyligi tekshiriladi.
 *
 * So'rovlar `JourneyQuery` kabi bitta `q` orqali: testda PGlite beriladi.
 */
import { Router, type Request, type Response, type NextFunction } from 'express';
import express from 'express';
import Busboy from 'busboy';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pool } from '../lib/db.js';
import {
  DEFAULT_SCHEDULE,
  DEFAULT_SETTINGS,
  DOCUMENT_MAX_BYTES,
  PHOTO_MAX_BYTES,
  SUBJECTS,
  VIDEO_MAX_BYTES,
  VIDEO_MAX_SECONDS,
  VIDEO_MIN_SECONDS,
  aboutFromTemplate,
  commissionStatus,
  firstInvalidStep,
  nextStep,
  normalizeAnswers,
  normalizeCertificates,
  normalizeEducation,
  normalizeSchedule,
  validateStep,
  validateTiers,
  termsText,
  ERRORS,
  type FieldErrors,
  type Lang,
  type OnboardingData,
  type OnboardingPath,
  type OnboardingSettings,
} from '../../shared/teacherOnboarding.js';

const run = promisify(execFile);

export type OnboardingQuery = (sql: string, params?: unknown[]) => Promise<{ rows: any[] }>;
const poolQuery: OnboardingQuery | null = pool ? (sql, params) => pool!.query(sql, params) : null;

export type OnboardingDeps = {
  q?: OnboardingQuery | null;
  /** Ommaviy fayllar ildizi (express.static '/uploads'). */
  uploadsDir?: string;
  /** Yopiq fayllar: hech qachon statik berilmaydi. */
  privateDir?: string;
  /** «O'zim haqimda» matnini AI yozadi; null — faqat shablon. */
  generateAbout?: ((answers: Record<string, string>, lang: Lang) => Promise<string>) | null;
  /** Video davomiyligi (soniya); testda almashtiriladi. */
  probeVideo?: (file: string) => Promise<{ duration: number | null; hasVideo: boolean }>;
  /** Ommaviy URL'ni to'liq manzilga aylantirish (server.ts dagi toAbsolutePublicUrl). */
  publicUrl?: (relative: string) => string;
};

class HttpError extends Error {
  constructor(public status: number, message: string, public extra: Record<string, unknown> = {}) { super(message); }
}

const errorsBody = (e: FieldErrors) => ({
  error: 'VALIDATION',
  fields: Object.fromEntries(Object.entries(e).map(([k, code]) => [k, { code, ...ERRORS[code] }])),
});

/* ─────────────────────────── fayl turlari ─────────────────────────── */

/** Fayl boshidagi "sehrli baytlar" — kengaytma yoki mime'ga ishonmaymiz. */
function sniff(buf: Buffer): 'jpg' | 'png' | 'webp' | 'pdf' | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length >= 12 && buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  if (buf.length >= 5 && buf.subarray(0, 5).toString('latin1') === '%PDF-') return 'pdf';
  return null;
}
const MIME: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf' };
const VIDEO_MIME: Record<string, string> = { 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm', 'video/x-matroska': 'webm' };

function readOneFile(req: Request, maxBytes: number): Promise<{ buffer: Buffer; name: string; fields: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    let bb: ReturnType<typeof Busboy>;
    try { bb = Busboy({ headers: req.headers, limits: { files: 1, fileSize: maxBytes + 1, fields: 10 } }); }
    catch { return reject(new HttpError(400, 'Fayl yuborilmadi')); }
    const fields: Record<string, string> = {};
    let result: { buffer: Buffer; name: string } | null = null;
    let tooBig = false;
    bb.on('field', (k, v) => { fields[k] = String(v).slice(0, 200); });
    bb.on('file', (_name, stream, info) => {
      const chunks: Buffer[] = [];
      let size = 0;
      stream.on('data', (c: Buffer) => { size += c.length; if (size > maxBytes) tooBig = true; else chunks.push(c); });
      stream.on('limit', () => { tooBig = true; });
      stream.on('end', () => { result = { buffer: Buffer.concat(chunks), name: String(info.filename ?? '').slice(0, 160) }; });
    });
    bb.on('error', () => reject(new HttpError(400, 'Fayl oʻqilmadi')));
    bb.on('close', () => {
      if (tooBig) return reject(new HttpError(413, `Fayl ${Math.round(maxBytes / 1024 / 1024)} MB dan katta`));
      if (!result) return reject(new HttpError(400, 'Fayl tanlanmagan'));
      resolve({ ...result, fields });
    });
    req.pipe(bb);
  });
}

/** ffprobe: davomiylik. MediaRecorder webm faylida davomiylik yozilmaydi — unda ffmpeg o'qib sanaydi. */
async function defaultProbe(file: string): Promise<{ duration: number | null; hasVideo: boolean }> {
  try {
    const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type', '-of', 'json', file], { timeout: 30_000 });
    const j = JSON.parse(stdout) as { format?: { duration?: string }; streams?: { codec_type?: string }[] };
    const hasVideo = (j.streams ?? []).some((s) => s.codec_type === 'video');
    let duration = Number(j.format?.duration);
    if (!Number.isFinite(duration) || duration <= 0) {
      const { stderr } = await run('ffmpeg', ['-v', 'info', '-i', file, '-map', '0:v:0', '-c', 'copy', '-f', 'null', '-'], { timeout: 120_000, maxBuffer: 20 * 1024 * 1024 });
      const all = [...stderr.matchAll(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/g)].at(-1);
      duration = all ? Number(all[1]) * 3600 + Number(all[2]) * 60 + Number(all[3]) : NaN;
    }
    return { duration: Number.isFinite(duration) ? Math.round(duration) : null, hasVideo };
  } catch {
    return { duration: null, hasVideo: false };
  }
}

/* ─────────────────────────── ma'lumotlarni o'qish ─────────────────────────── */

const PROFILE_COLS = `user_id, first_name, last_name, birth_country, subject, proficiency, onboarding_path, avatar_url,
  certificates, education, about_answers, about, headline, video_url, video_duration_sec, schedule, weekly_availability,
  lesson_price_uzs, terms_version, terms_accepted_at, onboarding_step, onboarding_submitted_at, profile_status,
  review_comment, review_step, reviewed_at, certified_verified`;

async function loadSettings(q: OnboardingQuery): Promise<OnboardingSettings> {
  const { rows } = await q('SELECT price_min_uzs, price_max_uzs, commission_tiers, terms_version FROM teacher_onboarding_settings WHERE id');
  const r = rows[0];
  if (!r) return DEFAULT_SETTINGS;
  return {
    price_min_uzs: Number(r.price_min_uzs), price_max_uzs: Number(r.price_max_uzs),
    commission_tiers: validateTiers(r.commission_tiers) ?? DEFAULT_SETTINGS.commission_tiers, terms_version: String(r.terms_version),
  };
}

/** Eski anketa shakllari (issuer/year, start_year/end_year, day 0..6) yangisiga o'qiladi. */
function legacyCertificates(v: unknown) {
  return normalizeCertificates((Array.isArray(v) ? v : []).map((r: any) => ({
    ...r, institution: r?.institution ?? r?.issuer, year_to: r?.year_to ?? (r?.year ? Number(r.year) || null : null),
  })));
}
function legacyEducation(v: unknown) {
  return normalizeEducation((Array.isArray(v) ? v : []).map((r: any) => ({
    ...r, year_from: r?.year_from ?? (Number(r?.start_year) || null), year_to: r?.year_to ?? (Number(r?.end_year) || null),
  })));
}
function legacySchedule(row: any) {
  if (row?.schedule) return normalizeSchedule(row.schedule);
  const old = Array.isArray(row?.weekly_availability) ? row.weekly_availability : [];
  if (!old.length) return null;
  return normalizeSchedule({ timezone: 'Asia/Tashkent', slots: old.map((s: any) => ({ weekday: Number(s.day) === 0 ? 7 : Number(s.day), start: s.from, end: s.to })) });
}

function toData(row: any, termsVersion: string): OnboardingData {
  return {
    personal: {
      first_name: row?.first_name ?? '', last_name: row?.last_name ?? '', birth_country: row?.birth_country ?? '',
      subject: row?.subject ?? 'russian', proficiency: row?.proficiency ?? '', path: (row?.onboarding_path ?? '') as OnboardingPath | '',
    },
    avatar_url: row?.avatar_url || null,
    certificates: legacyCertificates(row?.certificates),
    education: legacyEducation(row?.education),
    about_answers: normalizeAnswers(row?.about_answers),
    about: row?.about ?? '',
    video_url: row?.video_url || null,
    video_duration_sec: row?.video_duration_sec ?? null,
    schedule: legacySchedule(row) ?? DEFAULT_SCHEDULE,
    lesson_price_uzs: row?.lesson_price_uzs ?? null,
    // Rozilik faqat JORIY versiyaga hisoblanadi: shartlar o'zgarsa qayta so'raladi.
    terms_accepted: Boolean(row?.terms_accepted_at) && row?.terms_version === termsVersion,
  };
}

/** Platformada o'tkazilgan darslar: yakunlangan sinov darslari (TZ bo'yicha ular ham sanaladi) + tugagan video darslar. */
export async function completedLessons(q: OnboardingQuery, teacherId: number): Promise<number> {
  const { rows } = await q(
    `SELECT (SELECT count(*) FROM teacher_trial_lessons WHERE teacher_user_id = $1 AND status IN ('completed', 'completed_by_teacher'))
          + (SELECT count(*) FROM teacher_meet_sessions WHERE teacher_user_id = $1 AND status = 'ended') AS n`, [teacherId]);
  return Number(rows[0]?.n ?? 0);
}

async function notifyTeacher(q: OnboardingQuery, teacherId: number, title: string, body: string) {
  await q(`INSERT INTO teacher_notifications (recipient_user_id, type, title, body) VALUES ($1, 'teacher_profile_status', $2, $3)`, [teacherId, title, body])
    .catch((e) => console.error('[onboarding] notify', e?.message ?? e));
}

/* ─────────────────────────── o'qituvchi yo'llari ─────────────────────────── */

export function createTeacherOnboardingRoutes(
  authenticate: (req: any, res: any, next: any) => void,
  deps: OnboardingDeps = {},
): Router {
  const q = deps.q === undefined ? poolQuery : deps.q;
  const uploadsDir = deps.uploadsDir ?? path.resolve(process.cwd(), 'uploads');
  const privateDir = deps.privateDir ?? path.resolve(process.cwd(), 'private-uploads');
  const probe = deps.probeVideo ?? defaultProbe;
  const publicUrl = deps.publicUrl ?? ((p: string) => p);
  const router = Router();

  const h = (fn: (req: any, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch((e) => {
      if (e instanceof HttpError) return res.status(e.status).json({ error: e.message, ...e.extra });
      console.error('[teacher/onboarding]', e);
      res.status(500).json({ error: 'Server xatosi. Maʼlumotlaringiz saqlangan, qayta urinib koʻring.' });
      void next;
    });

  /** Faqat o'qituvchi hisobi; profil qatori bo'lmasa — null (1-qadamda yaratiladi). */
  async function teacher(req: any) {
    if (!q) throw new HttpError(503, 'Baza ulanmagan');
    const id = Number(req.userId);
    const u = await q('SELECT account_type FROM users WHERE id = $1', [id]);
    if (u.rows[0]?.account_type !== 'teacher') throw new HttpError(403, 'Bu boʻlim faqat oʻqituvchilar uchun');
    const p = await q(`SELECT ${PROFILE_COLS} FROM teacher_profiles WHERE user_id = $1`, [id]);
    return { id, row: p.rows[0] ?? null };
  }
  function needRow(row: unknown) {
    if (!row) throw new HttpError(409, 'Avval 1-qadamni (shaxsiy maʼlumotlar) saqlang', { step: 1 });
  }
  /** Tekshiruvdan o'tayotgan yoki rad etilgan anketa tahrirlanmaydi. */
  function editable(row: any) {
    if (row && (row.profile_status === 'pending_review' || row.profile_status === 'rejected')) {
      throw new HttpError(409, row.profile_status === 'pending_review' ? 'Anketa tekshiruvda — natijani kuting' : 'Anketa rad etilgan', { status: row.profile_status });
    }
  }

  async function state(id: number, row: any) {
    const settings = await loadSettings(q!);
    const data = toData(row, settings.terms_version);
    const docs = row ? (await q!(`SELECT id, original_name, mime, size_bytes, status, created_at FROM teacher_documents
      WHERE teacher_user_id = $1 AND private_path IS NOT NULL ORDER BY id`, [id])).rows : [];
    const lessons = row ? await completedLessons(q!, id) : 0;
    return {
      data,
      step: Math.max(1, Math.min(8, Number(row?.onboarding_step ?? 1))),
      status: row?.profile_status ?? 'draft',
      submitted_at: row?.onboarding_submitted_at ?? null,
      review: row?.review_comment || row?.review_step ? { comment: row.review_comment, step: row.review_step, at: row.reviewed_at } : null,
      certified_verified: Boolean(row?.certified_verified),
      documents: docs,
      settings,
      terms: { version: settings.terms_version, uz: termsText(settings, 'uz'), ru: termsText(settings, 'ru') },
      commission: commissionStatus(lessons, settings.commission_tiers),
      ready_step: firstInvalidStep(data, settings),
    };
  }

  router.get('/teacher/onboarding', authenticate, h(async (req, res) => {
    const { id, row } = await teacher(req);
    res.json(await state(id, row));
  }));

  /** Qadamni saqlash. ?draft=1 — avtosaqlash (tekshiruvsiz, qadam surilmaydi). */
  router.put('/teacher/onboarding/steps/:step', authenticate, h(async (req, res) => {
    const step = Number(req.params.step);
    if (!Number.isInteger(step) || step < 1 || step > 8 || step === 2 || step === 6) throw new HttpError(400, 'Notoʻgʻri qadam');
    const draft = req.query.draft === '1';
    const { id, row } = await teacher(req);
    editable(row);
    const settings = await loadSettings(q!);
    const b = (req.body ?? {}) as Record<string, any>;
    const current = toData(row, settings.terms_version);

    // Kelgan qadam ma'lumotini joriy anketaga qo'yamiz va shu qadamni tekshiramiz.
    const next: OnboardingData = { ...current };
    if (step === 1) next.personal = {
      first_name: String(b.first_name ?? '').trim(), last_name: String(b.last_name ?? '').trim(), birth_country: String(b.birth_country ?? ''),
      subject: String(b.subject ?? 'russian'), proficiency: String(b.proficiency ?? ''), path: b.path === 'certified' || b.path === 'experienced' ? b.path : '',
    };
    if (step === 3) next.certificates = normalizeCertificates(b.certificates);
    if (step === 4) next.education = normalizeEducation(b.education);
    if (step === 5) { next.about_answers = normalizeAnswers(b.answers); next.about = String(b.about ?? '').trim().slice(0, 2000); }
    if (step === 7) next.schedule = normalizeSchedule(b.schedule);
    if (step === 8) { next.lesson_price_uzs = Number.isFinite(Number(b.lesson_price_uzs)) ? Math.round(Number(b.lesson_price_uzs)) : null; next.terms_accepted = b.terms_accepted === true; }

    if (!draft) {
      const errors = validateStep(step, next, settings);
      if (Object.keys(errors).length) return res.status(422).json(errorsBody(errors));
    }
    if (step !== 1) needRow(row);

    // Sertifikat hujjatlari shu o'qituvchiniki bo'lishi shart.
    if (step === 3) {
      const ids = [...new Set(next.certificates.flatMap((c) => c.document_ids))];
      if (ids.length) {
        const own = await q!('SELECT id FROM teacher_documents WHERE teacher_user_id = $1 AND id = ANY($2::bigint[])', [id, ids]);
        if (own.rows.length !== ids.length) throw new HttpError(400, 'Hujjat topilmadi');
      }
    }

    const advance = draft ? Number(row?.onboarding_step ?? 1) : Math.max(Number(row?.onboarding_step ?? 1), nextStep(step, (next.personal.path || null) as OnboardingPath | null));

    if (step === 1) {
      const p = next.personal;
      const subjectLabel = SUBJECTS.find((s) => s.code === p.subject)?.uz ?? 'Rus tili';
      await q!(`INSERT INTO teacher_profiles (user_id, first_name, last_name, birth_country, subject, proficiency, onboarding_path, subjects, onboarding_step, onboarding_v2_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, ARRAY[$8::text], $9, now())
        ON CONFLICT (user_id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, birth_country = EXCLUDED.birth_country,
          subject = EXCLUDED.subject, proficiency = EXCLUDED.proficiency, onboarding_path = EXCLUDED.onboarding_path,
          subjects = CASE WHEN cardinality(teacher_profiles.subjects) = 0 THEN EXCLUDED.subjects ELSE teacher_profiles.subjects END,
          onboarding_step = GREATEST(teacher_profiles.onboarding_step, EXCLUDED.onboarding_step), updated_at = now()`,
      [id, p.first_name || '—', p.last_name || '—', p.birth_country || null, p.subject || 'russian', p.proficiency || null, p.path || null, subjectLabel, Math.max(1, advance)]);
    } else if (step === 3) {
      // Eski profil ko'rinishi uchun issuer/year ham yoziladi.
      const rows = next.certificates.map((c) => ({ ...c, issuer: c.institution, year: c.year_to ? String(c.year_to) : '', image_url: '' }));
      await q!('UPDATE teacher_profiles SET certificates = $2::jsonb, onboarding_step = $3, updated_at = now() WHERE user_id = $1', [id, JSON.stringify(rows), advance]);
    } else if (step === 4) {
      const rows = next.education.map((e) => ({ ...e, start_year: e.year_from ? String(e.year_from) : '', end_year: e.year_to ? String(e.year_to) : '' }));
      await q!('UPDATE teacher_profiles SET education = $2::jsonb, onboarding_step = $3, updated_at = now() WHERE user_id = $1', [id, JSON.stringify(rows), advance]);
    } else if (step === 5) {
      const headline = next.about.split(/(?<=[.!?])\s/)[0]?.slice(0, 120) ?? '';
      await q!(`UPDATE teacher_profiles SET about_answers = $2::jsonb, about = $3, headline = CASE WHEN headline = '' THEN $4 ELSE headline END,
        onboarding_step = $5, updated_at = now() WHERE user_id = $1`, [id, JSON.stringify(next.about_answers), next.about, headline, advance]);
    } else if (step === 7) {
      // Jadval uch joyga yoziladi: yangi `schedule`, profil sahifasidagi `weekly_availability` (0 = yakshanba)
      // va kabinet kalendari ishlatadigan `teacher_availability_rules`.
      const s = next.schedule;
      const weekly = s.slots.map((x) => ({ day: x.weekday % 7, from: x.start, to: x.end === '24:00' ? '23:59' : x.end }));
      await q!('UPDATE teacher_profiles SET schedule = $2::jsonb, weekly_availability = $3::jsonb, onboarding_step = $4, updated_at = now() WHERE user_id = $1',
        [id, JSON.stringify(s), JSON.stringify(weekly), advance]);
      if (!draft) {
        await q!('DELETE FROM teacher_availability_rules WHERE teacher_user_id = $1', [id]);
        for (const x of s.slots) {
          await q!(`INSERT INTO teacher_availability_rules (teacher_user_id, weekday, start_time, end_time, timezone) VALUES ($1, $2, $3, $4, $5)`,
            [id, x.weekday % 7, x.start, x.end === '24:00' ? '23:59' : x.end, s.timezone]);
        }
      }
    } else if (step === 8) {
      if (draft) {
        await q!('UPDATE teacher_profiles SET lesson_price_uzs = $2, updated_at = now() WHERE user_id = $1', [id, next.lesson_price_uzs && next.lesson_price_uzs > 0 ? next.lesson_price_uzs : null]);
      } else {
        await q!(`UPDATE teacher_profiles SET lesson_price_uzs = $2, terms_version = $3, terms_accepted_at = now(), onboarding_step = 8, updated_at = now() WHERE user_id = $1`,
          [id, next.lesson_price_uzs, settings.terms_version]);
        await q!(`INSERT INTO teacher_terms_acceptances (teacher_user_id, terms_version, commission_tiers, lesson_price_uzs, ip) VALUES ($1, $2, $3::jsonb, $4, $5)`,
          [id, settings.terms_version, JSON.stringify(settings.commission_tiers), next.lesson_price_uzs, String(req.ip ?? '').slice(0, 60)]);
      }
    }
    const fresh = (await q!(`SELECT ${PROFILE_COLS} FROM teacher_profiles WHERE user_id = $1`, [id])).rows[0];
    res.json(await state(id, fresh));
  }));

  /** Qadamlar orasida yurish (orqaga qaytish ham saqlanadi — keyingi kirishda shu joydan). */
  router.post('/teacher/onboarding/position', authenticate, h(async (req, res) => {
    const { id, row } = await teacher(req);
    if (!row) return res.json({ ok: true });
    const step = Math.max(1, Math.min(8, Number(req.body?.step) || 1));
    await q!('UPDATE teacher_profiles SET onboarding_step = LEAST(GREATEST($2, 1), 8) WHERE user_id = $1 AND onboarding_submitted_at IS NULL', [id, step]);
    res.json({ ok: true });
  }));

  /* ── 2-qadam: surat ── */
  router.post('/teacher/onboarding/photo', authenticate, h(async (req, res) => {
    const { id, row } = await teacher(req);
    needRow(row); editable(row);
    const file = await readOneFile(req, PHOTO_MAX_BYTES);
    const kind = sniff(file.buffer);
    if (kind !== 'jpg' && kind !== 'png' && kind !== 'webp') throw new HttpError(415, 'Faqat JPG, PNG yoki WEBP surat');
    const rel = `storage/user-avatars/${id}/teacher-${crypto.randomBytes(6).toString('hex')}.${kind}`;
    fs.mkdirSync(path.dirname(path.join(uploadsDir, rel)), { recursive: true });
    fs.writeFileSync(path.join(uploadsDir, rel), file.buffer);
    const url = publicUrl(`/uploads/${rel}`);
    const advance = Math.max(Number(row.onboarding_step), nextStep(2, row.onboarding_path));
    await q!('UPDATE teacher_profiles SET avatar_url = $2, onboarding_step = $3, updated_at = now() WHERE user_id = $1', [id, url, advance]);
    await q!('UPDATE users SET avatar_url = $2 WHERE id = $1', [id, url]).catch(() => {});
    res.json(await state(id, (await q!(`SELECT ${PROFILE_COLS} FROM teacher_profiles WHERE user_id = $1`, [id])).rows[0]));
  }));

  /* ── 3-qadam: sertifikat hujjatlari (yopiq) ── */
  router.post('/teacher/onboarding/documents', authenticate, h(async (req, res) => {
    const { id, row } = await teacher(req);
    needRow(row); editable(row);
    const count = await q!('SELECT count(*)::int AS n FROM teacher_documents WHERE teacher_user_id = $1 AND private_path IS NOT NULL', [id]);
    if (count.rows[0].n >= 30) throw new HttpError(400, 'Hujjatlar juda koʻp');
    const file = await readOneFile(req, DOCUMENT_MAX_BYTES);
    const kind = sniff(file.buffer);
    if (!kind) throw new HttpError(415, 'Faqat PDF, JPG yoki PNG');
    const rel = `teacher-docs/${id}/${crypto.randomBytes(12).toString('hex')}.${kind}`;
    fs.mkdirSync(path.dirname(path.join(privateDir, rel)), { recursive: true });
    fs.writeFileSync(path.join(privateDir, rel), file.buffer, { mode: 0o640 });
    const doc = await q!(`INSERT INTO teacher_documents (teacher_user_id, kind, file_url, private_path, original_name, mime, size_bytes, status)
      VALUES ($1, 'certificate', '', $2, $3, $4, $5, 'pending') RETURNING id, original_name, mime, size_bytes, status, created_at`,
    [id, rel, file.name || `hujjat.${kind}`, MIME[kind], file.buffer.length]);
    res.status(201).json(doc.rows[0]);
  }));

  router.delete('/teacher/onboarding/documents/:docId', authenticate, h(async (req, res) => {
    const { id, row } = await teacher(req);
    editable(row);
    const del = await q!(`DELETE FROM teacher_documents WHERE id = $1 AND teacher_user_id = $2 AND private_path IS NOT NULL AND status <> 'approved' RETURNING private_path`,
      [Number(req.params.docId), id]);
    if (!del.rows[0]) throw new HttpError(404, 'Hujjat topilmadi');
    fs.rmSync(path.join(privateDir, del.rows[0].private_path), { force: true });
    res.json({ ok: true });
  }));

  router.get('/teacher/onboarding/documents/:docId/file', authenticate, h(async (req, res) => {
    const { id } = await teacher(req);
    const r = await q!('SELECT private_path, mime, original_name FROM teacher_documents WHERE id = $1 AND teacher_user_id = $2 AND private_path IS NOT NULL', [Number(req.params.docId), id]);
    if (!r.rows[0]) throw new HttpError(404, 'Hujjat topilmadi');
    sendPrivate(res, privateDir, r.rows[0]);
  }));

  /* ── 5-qadam: «O'zim haqimda» — AI, ishlamasa shablon ── */
  const aboutCalls = new Map<number, number[]>();
  router.post('/teacher/onboarding/about/generate', authenticate, h(async (req, res) => {
    const { id } = await teacher(req);
    const lang: Lang = req.body?.lang === 'ru' ? 'ru' : 'uz';
    const answers = normalizeAnswers(req.body?.answers);
    const template = aboutFromTemplate(answers, lang);
    const now = Date.now();
    const recent = (aboutCalls.get(id) ?? []).filter((t) => now - t < 3600_000);
    if (!deps.generateAbout || recent.length >= 10) return res.json({ text: template, source: 'template' });
    aboutCalls.set(id, [...recent, now]);
    try {
      const text = (await deps.generateAbout(answers as Record<string, string>, lang)).trim();
      if (text.length < 200 || text.length > 1500) throw new Error('length');
      res.json({ text, source: 'ai' });
    } catch (e) {
      console.warn('[onboarding] about AI failed, template used:', (e as Error)?.message);
      res.json({ text: template, source: 'template' });
    }
  }));

  /* ── 6-qadam: video, bo'laklab yuklash ── */
  const tmpPath = (uploadId: string) => path.join(privateDir, 'video-uploads', `${uploadId}.part`);

  router.post('/teacher/onboarding/video/uploads', authenticate, h(async (req, res) => {
    const { id, row } = await teacher(req);
    needRow(row); editable(row);
    const size = Number(req.body?.size);
    const mime = String(req.body?.mime ?? '').split(';')[0];
    const name = String(req.body?.name ?? '').slice(0, 160);
    if (!Number.isInteger(size) || size <= 0) throw new HttpError(400, 'Fayl hajmi notoʻgʻri');
    if (size > VIDEO_MAX_BYTES) throw new HttpError(413, `Video ${VIDEO_MAX_BYTES / 1024 / 1024} MB dan katta`);
    if (!VIDEO_MIME[mime]) throw new HttpError(415, 'Faqat MP4, MOV yoki WEBM video');
    // Xuddi shu fayl qayta tanlansa — yuklash to'xtagan joydan davom etadi.
    const existing = await q!(`SELECT id, received_bytes FROM teacher_video_uploads WHERE teacher_user_id = $1 AND status = 'uploading'
      AND size_bytes = $2 AND file_name = $3 AND mime = $4 AND updated_at > now() - interval '2 days' ORDER BY created_at DESC LIMIT 1`, [id, size, name, mime]);
    if (existing.rows[0] && fs.existsSync(tmpPath(existing.rows[0].id))) {
      const received = fs.statSync(tmpPath(existing.rows[0].id)).size;
      return res.json({ id: existing.rows[0].id, received, chunk_size: CHUNK });
    }
    const uploadId = crypto.randomUUID();
    fs.mkdirSync(path.dirname(tmpPath(uploadId)), { recursive: true });
    fs.writeFileSync(tmpPath(uploadId), Buffer.alloc(0));
    await q!('INSERT INTO teacher_video_uploads (id, teacher_user_id, file_name, mime, size_bytes) VALUES ($1, $2, $3, $4, $5)', [uploadId, id, name, mime, size]);
    res.status(201).json({ id: uploadId, received: 0, chunk_size: CHUNK });
  }));

  async function ownUpload(req: any, teacherId: number) {
    const r = await q!('SELECT * FROM teacher_video_uploads WHERE id = $1 AND teacher_user_id = $2', [String(req.params.uploadId), teacherId]);
    if (!r.rows[0] || !fs.existsSync(tmpPath(r.rows[0].id))) throw new HttpError(404, 'Yuklash topilmadi — videoni qayta tanlang');
    return r.rows[0];
  }

  router.get('/teacher/onboarding/video/uploads/:uploadId', authenticate, h(async (req, res) => {
    const { id } = await teacher(req);
    const up = await ownUpload(req, id);
    res.json({ id: up.id, received: fs.statSync(tmpPath(up.id)).size, size: Number(up.size_bytes), status: up.status });
  }));

  /** Bitta bo'lak. `offset` serverdagi hajmga teng bo'lishi shart — aks holda 409 va to'g'ri offset qaytadi. */
  router.put('/teacher/onboarding/video/uploads/:uploadId', authenticate, express.raw({ type: () => true, limit: CHUNK + 1024 }), h(async (req, res) => {
    const { id } = await teacher(req);
    const up = await ownUpload(req, id);
    if (up.status !== 'uploading') throw new HttpError(409, 'Yuklash yakunlangan');
    const file = tmpPath(up.id);
    const received = fs.statSync(file).size;
    const offset = Number(req.query.offset);
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (offset !== received) return res.status(409).json({ error: 'OFFSET_MISMATCH', received });
    if (!body.length || received + body.length > Number(up.size_bytes)) throw new HttpError(400, 'Boʻlak notoʻgʻri');
    fs.appendFileSync(file, body);
    await q!('UPDATE teacher_video_uploads SET received_bytes = $2, updated_at = now() WHERE id = $1', [up.id, received + body.length]);
    res.json({ received: received + body.length });
  }));

  router.post('/teacher/onboarding/video/uploads/:uploadId/complete', authenticate, h(async (req, res) => {
    const { id, row } = await teacher(req);
    needRow(row); editable(row);
    const up = await ownUpload(req, id);
    const file = tmpPath(up.id);
    if (fs.statSync(file).size !== Number(up.size_bytes)) throw new HttpError(409, 'Video toʻliq yuklanmagan', { received: fs.statSync(file).size });
    const info = await probe(file);
    const reject = async (msg: string, code: string) => {
      fs.rmSync(file, { force: true });
      await q!(`UPDATE teacher_video_uploads SET status = 'rejected', error = $2, updated_at = now() WHERE id = $1`, [up.id, code]);
      throw new HttpError(422, msg, { code });
    };
    if (!info.hasVideo || info.duration == null) await reject('Bu fayl video emas yoki buzilgan', 'VIDEO_INVALID');
    if (info.duration! < VIDEO_MIN_SECONDS) await reject(`Video kamida 1 daqiqa boʻlishi kerak (hozir ${info.duration} soniya)`, 'VIDEO_TOO_SHORT');
    if (info.duration! > VIDEO_MAX_SECONDS) await reject('Video 10 daqiqadan uzun', 'VIDEO_TOO_LONG');
    const rel = `storage/teacher-videos/${id}/video-${crypto.randomBytes(8).toString('hex')}.${VIDEO_MIME[up.mime]}`;
    fs.mkdirSync(path.dirname(path.join(uploadsDir, rel)), { recursive: true });
    fs.renameSync(file, path.join(uploadsDir, rel));
    const url = publicUrl(`/uploads/${rel}`);
    await q!(`UPDATE teacher_video_uploads SET status = 'done', updated_at = now() WHERE id = $1`, [up.id]);
    const advance = Math.max(Number(row.onboarding_step), nextStep(6, row.onboarding_path));
    await q!('UPDATE teacher_profiles SET video_url = $2, video_duration_sec = $3, onboarding_step = $4, updated_at = now() WHERE user_id = $1', [id, url, info.duration, advance]);
    res.json(await state(id, (await q!(`SELECT ${PROFILE_COLS} FROM teacher_profiles WHERE user_id = $1`, [id])).rows[0]));
  }));

  /* ── Yuborish: idempotent (qayta bosish yangi ariza yaratmaydi) ── */
  router.post('/teacher/onboarding/submit', authenticate, h(async (req, res) => {
    const { id, row } = await teacher(req);
    needRow(row);
    if (row.profile_status === 'pending_review' || row.profile_status === 'active') return res.json(await state(id, row));
    if (row.profile_status === 'rejected') throw new HttpError(409, 'Anketa rad etilgan');
    const settings = await loadSettings(q!);
    const bad = firstInvalidStep(toData(row, settings.terms_version), settings);
    if (bad) throw new HttpError(422, 'Anketa toʻliq emas', { step: bad, errors: errorsBody(validateStep(bad, toData(row, settings.terms_version), settings)).fields });
    const upd = await q!(`UPDATE teacher_profiles SET profile_status = 'pending_review', onboarding_submitted_at = now(), updated_at = now()
      WHERE user_id = $1 AND profile_status IN ('draft', 'needs_revision') RETURNING user_id`, [id]);
    if (upd.rows[0]) await q!(`INSERT INTO teacher_review_events (teacher_user_id, action, actor) VALUES ($1, 'submitted', 'teacher')`, [id]);
    res.json(await state(id, (await q!(`SELECT ${PROFILE_COLS} FROM teacher_profiles WHERE user_id = $1`, [id])).rows[0]));
  }));

  /** Kabinet vidjeti: joriy komissiya va keyingi pasayishgacha qolgan darslar. */
  router.get('/teacher/commission', authenticate, h(async (req, res) => {
    const { id, row } = await teacher(req);
    const settings = await loadSettings(q!);
    res.json({ ...commissionStatus(row ? await completedLessons(q!, id) : 0, settings.commission_tiers), tiers: settings.commission_tiers, lesson_price_uzs: row?.lesson_price_uzs ?? null });
  }));

  return router;
}

const CHUNK = 4 * 1024 * 1024;

function sendPrivate(res: Response, privateDir: string, doc: { private_path: string; mime: string | null; original_name: string | null }) {
  const full = path.resolve(privateDir, doc.private_path);
  if (!full.startsWith(path.resolve(privateDir) + path.sep) || !fs.existsSync(full)) throw new HttpError(404, 'Fayl topilmadi');
  res.setHeader('Content-Type', doc.mime || 'application/octet-stream');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.original_name || 'hujjat')}"`);
  fs.createReadStream(full).pipe(res);
}

/* ─────────────────────────── admin ─────────────────────────── */

export function createAdminTeacherOnboardingRoutes(deps: OnboardingDeps = {}): Router {
  const q = deps.q === undefined ? poolQuery : deps.q;
  const privateDir = deps.privateDir ?? path.resolve(process.cwd(), 'private-uploads');
  const router = Router();
  const h = (fn: (req: any, res: Response) => Promise<unknown>) => (req: Request, res: Response) =>
    fn(req, res).catch((e) => {
      if (e instanceof HttpError) return res.status(e.status).json({ error: e.message, ...e.extra });
      console.error('[admin/teacher-onboarding]', e);
      res.status(500).json({ error: 'Server xatosi' });
    });
  const db = () => { if (!q) throw new HttpError(503, 'Baza ulanmagan'); return q; };
  const actor = (req: any) => String(req.adminLogin ?? req.admin?.login ?? 'admin').slice(0, 60);

  // GET /api/admin/teacher-applications?status=pending_review
  router.get('/teacher-applications', h(async (req, res) => {
    const status = typeof req.query.status === 'string' && req.query.status ? req.query.status : null;
    const { rows } = await db()(`SELECT p.user_id, p.first_name, p.last_name, p.avatar_url, p.onboarding_path, p.proficiency, p.birth_country,
        p.profile_status, p.onboarding_step, p.onboarding_submitted_at, p.lesson_price_uzs, p.reviewed_at, p.review_step, u.phone, u.email
      FROM teacher_profiles p JOIN users u ON u.id = p.user_id
      WHERE ($1::text IS NULL OR p.profile_status = $1)
      ORDER BY (p.profile_status = 'pending_review') DESC, p.onboarding_submitted_at DESC NULLS LAST, p.updated_at DESC LIMIT 300`, [status]);
    const counts = await db()(`SELECT profile_status, count(*)::int AS n FROM teacher_profiles GROUP BY 1`);
    res.json({ rows, counts: Object.fromEntries(counts.rows.map((r) => [r.profile_status, r.n])) });
  }));

  router.get('/teacher-applications/:id', h(async (req, res) => {
    const id = Number(req.params.id);
    const p = await db()(`SELECT ${PROFILE_COLS.split(',').map((c) => `p.${c.trim()}`).join(', ')}, u.phone, u.email
      FROM teacher_profiles p JOIN users u ON u.id = p.user_id WHERE p.user_id = $1`, [id]);
    if (!p.rows[0]) throw new HttpError(404, 'Topilmadi');
    const settings = await loadSettings(db());
    const data = toData(p.rows[0], settings.terms_version);
    const [docs, events, terms] = await Promise.all([
      db()(`SELECT id, kind, original_name, mime, size_bytes, status, admin_note, created_at, (private_path IS NOT NULL) AS private, file_url
        FROM teacher_documents WHERE teacher_user_id = $1 ORDER BY id`, [id]),
      db()('SELECT action, step, comment, actor, created_at FROM teacher_review_events WHERE teacher_user_id = $1 ORDER BY created_at DESC', [id]),
      db()('SELECT terms_version, lesson_price_uzs, accepted_at FROM teacher_terms_acceptances WHERE teacher_user_id = $1 ORDER BY accepted_at DESC LIMIT 5', [id]),
    ]);
    const steps = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ step: n, errors: validateStep(n, data, settings) }));
    res.json({
      profile: { ...p.rows[0], data }, documents: docs.rows, events: events.rows, terms: terms.rows, steps,
      commission: commissionStatus(await completedLessons(db(), id), settings.commission_tiers),
    });
  }));

  router.get('/teacher-applications/:id/documents/:docId/file', h(async (req, res) => {
    const r = await db()('SELECT private_path, mime, original_name FROM teacher_documents WHERE id = $1 AND teacher_user_id = $2 AND private_path IS NOT NULL',
      [Number(req.params.docId), Number(req.params.id)]);
    if (!r.rows[0]) throw new HttpError(404, 'Hujjat topilmadi');
    sendPrivate(res, privateDir, r.rows[0]);
  }));

  /** Qaror: approve | reject (izoh shart) | revision (izoh + qadam shart). */
  router.post('/teacher-applications/:id/decision', h(async (req, res) => {
    const id = Number(req.params.id);
    const decision = String(req.body?.decision ?? '');
    const comment = String(req.body?.comment ?? '').trim().slice(0, 1000);
    const step = req.body?.step == null ? null : Number(req.body.step);
    if (!['approve', 'reject', 'revision'].includes(decision)) throw new HttpError(400, 'Qaror notoʻgʻri');
    if (decision !== 'approve' && comment.length < 3) throw new HttpError(400, 'Izoh yozing — oʻqituvchi nimani tuzatishini bilishi kerak');
    if (decision === 'revision' && (!Number.isInteger(step) || step! < 1 || step! > 8)) throw new HttpError(400, 'Qaysi qadamni tuzatishni tanlang');
    const status = decision === 'approve' ? 'active' : decision === 'reject' ? 'rejected' : 'needs_revision';
    const certified = req.body?.certified === true;
    const upd = await db()(`UPDATE teacher_profiles SET profile_status = $2, review_comment = $3, review_step = $4, reviewed_at = now(), reviewed_by = $5,
        certified_verified = CASE WHEN $2 = 'active' THEN ($6::boolean AND onboarding_path = 'certified') ELSE certified_verified END,
        onboarding_step = COALESCE($4, onboarding_step), updated_at = now()
      WHERE user_id = $1 RETURNING user_id`, [id, status, comment || null, decision === 'revision' ? step : null, actor(req), certified]);
    if (!upd.rows[0]) throw new HttpError(404, 'Topilmadi');
    if (decision === 'approve' && certified) await db()(`UPDATE teacher_documents SET status = 'approved', updated_at = now() WHERE teacher_user_id = $1 AND private_path IS NOT NULL`, [id]);
    await db()(`INSERT INTO teacher_review_events (teacher_user_id, action, step, comment, actor) VALUES ($1, $2, $3, $4, $5)`,
      [id, decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'needs_revision', decision === 'revision' ? step : null, comment || null, actor(req)]);
    const titles = {
      approve: ['Anketangiz tasdiqlandi 🎉', 'Profilingiz endi oʻqituvchilar katalogida koʻrinadi.'],
      reject: ['Anketa rad etildi', comment],
      revision: [`Anketani tuzatish kerak (${step}-qadam)`, comment],
    } as const;
    await notifyTeacher(db(), id, titles[decision as keyof typeof titles][0], titles[decision as keyof typeof titles][1]);
    res.json({ ok: true, status });
  }));

  router.get('/teacher-onboarding-settings', h(async (_req, res) => {
    const s = await loadSettings(db());
    res.json({ ...s, terms: { uz: termsText(s, 'uz'), ru: termsText(s, 'ru') } });
  }));

  /** Narx chegaralari va komissiya shkalasi — kodni o'zgartirmasdan (TZ 9.2). Shkala o'zgarsa shartlar versiyasi yangilanadi. */
  router.put('/teacher-onboarding-settings', h(async (req, res) => {
    const b = req.body ?? {};
    const min = Math.round(Number(b.price_min_uzs));
    const max = Math.round(Number(b.price_max_uzs));
    const tiers = validateTiers(b.commission_tiers);
    if (!Number.isInteger(min) || min < 1000 || !Number.isInteger(max) || max < min) throw new HttpError(400, 'Narx chegaralari notoʻgʻri');
    if (!tiers) throw new HttpError(400, 'Komissiya shkalasi notoʻgʻri: chegaralar oʻsib borsin, oxirgisi cheksiz, foiz 0–100');
    const before = await loadSettings(db());
    const changed = JSON.stringify(before.commission_tiers) !== JSON.stringify(tiers) || before.price_min_uzs !== min || before.price_max_uzs !== max;
    const version = changed ? new Date().toISOString().slice(0, 16).replace('T', ' ') : before.terms_version;
    await db()(`UPDATE teacher_onboarding_settings SET price_min_uzs = $1, price_max_uzs = $2, commission_tiers = $3::jsonb, terms_version = $4,
      updated_at = now(), updated_by = $5 WHERE id`, [min, max, JSON.stringify(tiers), version, actor(req)]);
    res.json(await loadSettings(db()));
  }));

  return router;
}
