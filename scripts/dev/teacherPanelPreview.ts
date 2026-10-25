/**
 * Local preview of the redesigned teacher cabinet (/ustoz/kabinet) with canned API data.
 * No database, no external services: every panel endpoint answers from the fixtures below.
 * Run: npx tsx scripts/dev/teacherPanelPreview.ts  →  http://<lan-ip>:3004/panel
 * (open it via the LAN IP: on localhost the app's apiUrl() points at production).
 *
 * Dars materiallari — haqiqiy marshrutlar, xotiradagi baza bilan. Dars xonasi va doska:
 *   /dars/l/1            — o'qituvchi sifatida
 *   /dars/l/1?as=student — o'quvchi sifatida (ikkinchi oynada; video ulanmaydi, faqat doska)
 */
import express from 'express';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { DEFAULT_SCHEDULE, DEFAULT_SETTINGS } from '../../shared/teacherOnboarding';
import { createTeacherMaterialRoutes } from '../../server/routes/teacherMaterialRoutes';
import { createLessonRoomServer } from '../../server/services/lessonRoom.service';
import { registerWsRoute } from '../../server/lib/wsRoutes';
import { ROOM_WS_PATH } from '../../shared/lessonRoom';

const H = 3_600_000;
const now = Date.now();
const at = (hours: number) => new Date(now + hours * H).toISOString();
const day = (offset: number) => new Date(now + offset * 24 * H).toISOString().slice(0, 10);

const STUDENTS = [
  { user_id: 21, name: 'Jasur Karimov', level: 'A1', status: 'trial', is_new: true, lessons_done: 0, trials_total: 1, next_lesson_at: at(0.3), first_seen_at: at(-48) },
  { user_id: 22, name: 'Malika Tosheva', level: 'B1', status: 'active', is_new: false, lessons_done: 24, trials_total: 1, next_lesson_at: at(2), first_seen_at: at(-24 * 70) },
  { user_id: 23, name: 'Aziz Rahimov', level: 'A2', status: 'active', is_new: false, lessons_done: 18, trials_total: 1, next_lesson_at: at(70), first_seen_at: at(-24 * 50) },
  { user_id: 24, name: 'Shahnoza Yusupova', level: 'B2', status: 'active', is_new: false, lessons_done: 41, trials_total: 1, next_lesson_at: at(94), first_seen_at: at(-24 * 120) },
  { user_id: 25, name: 'Sardor Nazarov', level: 'A2', status: 'trial', is_new: true, lessons_done: 0, trials_total: 0, next_lesson_at: null, first_seen_at: at(-20) },
  { user_id: 26, name: 'Dilshod Umarov', level: 'B1', status: 'finished', is_new: false, lessons_done: 36, trials_total: 1, next_lesson_at: null, first_seen_at: at(-24 * 200) },
];

const lesson = (id: string, kind: 'trial' | 'session', student: number, startsIn: number, minutes: number, status: string) => {
  const s = STUDENTS.find((x) => x.user_id === student)!;
  return { id, kind, title: '', student_user_id: student, student_name: s.name, starts_at: at(startsIn), duration_minutes: minutes, is_trial: kind === 'trial', status, room_id: 1 };
};
const TODAY = [
  lesson('session-1', 'session', 23, -5, 50, 'ended'),
  lesson('session-2', 'session', 24, -3, 50, 'ended'),
  lesson('trial-31', 'trial', 21, 0.3, 30, 'scheduled'),
  lesson('session-3', 'session', 22, 2, 50, 'scheduled'),
  lesson('trial-32', 'trial', 25, 4, 30, 'scheduled'),
];

function scheduleDays(from: string, days: number) {
  const out = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(`${from}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    const date = d.toISOString().slice(0, 10);
    const weekday = d.getUTCDay();
    const slots: Array<Record<string, unknown>> = [];
    if (weekday >= 1 && weekday <= 5) {
      for (const h of [9, 10, 11, 14, 15, 16, 17]) {
        const start = `${String(h).padStart(2, '0')}:00`;
        const end = `${String(h + 1).padStart(2, '0')}:00`;
        const state = (h + weekday) % 5 === 0 ? 'booked' : (h + weekday) % 7 === 0 ? 'trial' : weekday === 3 && h === 14 ? 'blocked' : 'free';
        slots.push({ start, end, state, label: state === 'booked' ? 'Malika T.' : state === 'trial' ? 'Jasur K.' : '', source: 'rule', exception_id: null, block_id: state === 'blocked' ? 9 : null });
      }
    }
    out.push({ date, weekday, slots });
  }
  return out;
}

const app = express();
app.use(express.json());
const json = (path: string, body: unknown | ((req: express.Request) => unknown)) =>
  app.all(path, (req, res) => res.json(typeof body === 'function' ? (body as (r: express.Request) => unknown)(req) : body));

json('/api/user/me', { id: 11, firstName: 'Dilnoza', lastName: 'Saidova', accountType: 'teacher', phone: '+998901234567', email: 'demo.teacher@example.com', totalPoints: 0, avatarUrl: null, onboardingCompleted: true });
json('/api/teacher/me', {
  profile: {
    user_id: 11, first_name: 'Dilnoza', last_name: 'Saidova', display_name: 'Dilnoza Saidova', avatar_url: null, profile_status: 'active', admin_note: null,
    headline: 'Rus tili · migrantlar uchun soʻzlashuv', about: '', subjects: ['Soʻzlashuv', 'Grammatika', 'Patent imtihoni'], teaching_levels: ['A0', 'A1', 'A2', 'B1', 'B2'],
    languages: ['Oʻzbek', 'Rus'], experience_years: 8, rating_avg: 4.9, rating_count: 23,
  },
  trial_lessons: [], notifications: [], listing_subscriptions: [],
});
json('/api/teacher/me/panel/summary', {
  today: { lessons: 5, trials: 2, schedule: TODAY },
  students: { total: 28, active: 19, new_this_week: 3, waiting_trial: 2 },
  lessons_done_total: 312, lessons_planned: 9,
  income: { month_uzs: 4_850_000, prev_month_uzs: 4_330_000, change_percent: 12, note: '' },
  next_lesson: TODAY[2],
  new_students: [
    { user_id: 25, name: 'Sardor Nazarov', level: 'A2', status: 'trial', scheduled_starts_at: null },
    { user_id: 27, name: 'Madina Ergasheva', level: 'A1', status: 'trial', scheduled_starts_at: at(20) },
    { user_id: 28, name: 'Nilufar Qodirova', level: 'A0', status: 'trial', scheduled_starts_at: at(44) },
  ],
});
json('/api/teacher/me/panel/notifications', {
  unread: 2,
  notifications: [
    { id: 1, type: 'trial', title: 'Madina Ergasheva sinov darsiga yozildi', body: 'Ertaga, 10:00', read_at: null, created_at: at(-0.2) },
    { id: 2, type: 'paid', title: 'Jasur Karimov sinov darsini toʻladi', body: '', read_at: null, created_at: at(-1) },
    { id: 3, type: 'review', title: 'Yangi sharh: ★5', body: 'Otabek Jurayev', read_at: at(-20), created_at: at(-24) },
  ],
});
json('/api/teacher/me/panel/notifications/read', { success: true });
json('/api/teacher/me/panel/students', (req) => {
  const f = String(req.query.filter ?? 'all');
  const list = STUDENTS.filter((s) => f === 'all' || (f === 'new' ? s.is_new : s.status === f));
  return { students: list, counts: { all: 6, new: 2, active: 3, trial: 2, finished: 1 } };
});
json('/api/teacher/me/panel/students/:id', (req) => {
  const s = STUDENTS.find((x) => x.user_id === Number(req.params.id)) ?? STUDENTS[1];
  return {
    student: { user_id: s.user_id, name: s.name, level: s.level, status: s.status, first_seen_at: s.first_seen_at, next_lesson_at: s.next_lesson_at },
    stats: { total: 27, done: 24, cancelled: 1, upcoming: 2 },
    lessons: [
      { trial_id: 41, status: 'completed', starts_at: at(-48), created_at: at(-50), topic: 'Ish joyida muloqot: smena, maosh' },
      { trial_id: 42, status: 'completed', starts_at: at(-120), created_at: at(-122), topic: 'Kelishiklar: tushum kelishigi' },
      { trial_id: 43, status: 'cancelled', starts_at: at(-168), created_at: at(-170), topic: '' },
    ],
    reports: [],
    notes: [{ id: 1, body: 'Nutqni yaxshi tushunadi, lekin kelishiklarda qiynaladi.', created_at: at(-200) }],
    conversation_id: 1,
  };
});
json('/api/teacher/me/panel/lessons', (req) => {
  const f = String(req.query.filter ?? 'upcoming');
  const all = [...TODAY, lesson('trial-33', 'trial', 26, -50, 30, 'cancelled'), lesson('session-4', 'session', 22, 26, 50, 'scheduled')];
  const pick = f === 'today' ? TODAY : f === 'completed' ? all.filter((l) => l.status === 'ended') : f === 'cancelled' ? all.filter((l) => l.status === 'cancelled') : f === 'trial' ? all.filter((l) => l.is_trial) : all.filter((l) => l.status === 'scheduled');
  return { lessons: pick };
});
json('/api/teacher/me/panel/schedule', (req) => ({
  from: String(req.query.from), to: String(req.query.from), days: Number(req.query.days), timezone: 'Asia/Tashkent',
  rules: [
    { id: 1, weekday: 1, start_time: '09:00', end_time: '13:00', slot_minutes: 60 },
    { id: 2, weekday: 3, start_time: '14:00', end_time: '19:00', slot_minutes: 60 },
    { id: 3, weekday: 5, start_time: '09:00', end_time: '19:00', slot_minutes: 50 },
  ],
  exceptions: [
    { id: 9, date: day(3), start_time: null, end_time: null, is_available: false, slot_minutes: 60, note: 'Shaxsiy ish' },
    { id: 10, date: day(5), start_time: '18:00', end_time: '20:00', is_available: true, slot_minutes: 60, note: '' },
  ],
  calendar: scheduleDays(String(req.query.from), Number(req.query.days)),
}));
json('/api/teacher/me/panel/schedule/activity', {
  events: [
    { type: 'booked', at: at(-2), student_name: 'Jasur Karimov', date: at(0.3) },
    { type: 'block', at: at(-20), date: day(3) },
    { type: 'rule', at: at(-48), weekday: 6, start_time: '10:00', end_time: '14:00' },
    { type: 'cancelled', at: at(-96), student_name: 'Dilshod Umarov', date: at(-50) },
  ],
});
json('/api/teacher/me/panel/reviews', {
  rating_avg: 4.9, rating_count: 23, breakdown: { 5: 20, 4: 2, 3: 1, 2: 0, 1: 0 },
  reviews: [
    { id: 1, student_name: 'Shahnoza Yusupova', rating: 5, what_liked: 'Hammasini oʻzbek tilida tushuntiradi, misollar ish hayotidan.', what_was_missing: 'Uy vazifasi koʻproq boʻlsa yaxshi.', opinion: '', enrolled_monthly_course: true, created_at: at(-120) },
    { id: 2, student_name: 'Otabek Jurayev', rating: 5, what_liked: 'Sinov darsida darajamni aniq aytib berdi.', what_was_missing: '', opinion: '', enrolled_monthly_course: true, created_at: at(-72) },
    { id: 3, student_name: 'Kamola Rasulova', rating: 4, what_liked: 'Sabrli va tushunarli.', what_was_missing: 'Kechki vaqtlar kam.', opinion: '', enrolled_monthly_course: false, created_at: at(-300) },
  ],
});
json('/api/teacher/me/panel/profile', {
  profile: { lesson_price_uzs: 120_000, video_url: '/v.mp4', about: '8 yildan beri rus tilini oʻzbek tilida oʻrgataman. Asosan Rossiyada ishlashga tayyorlanayotganlar bilan ishlayman.' },
  contact: { email: 'demo.teacher@example.com', phone: '+998901234567' },
  payment: { paid: true, paid_until: null, first_discount_used: false },
  documents: [{ id: 1, kind: 'diploma', file_url: '', original_name: 'diplom.pdf', status: 'approved' }],
  anketa: { steps: [], current_step: 8, done_steps: 8, total_steps: 8, completion_percent: 100, submitted_at: at(-500) },
});
json('/api/teacher/balance', {
  balance: 1_200_000, earned: 9_640_000, upcoming: { lessons: 4, gross_uzs: 480_000 }, min_withdrawal_uzs: 50_000,
  withdrawals: [
    { id: 1, amount_uzs: 800_000, card_number: '8600 •••• 1234', card_holder: 'DEMO', status: 'paid', admin_note: null, requested_at: at(-200), processed_at: at(-190) },
    { id: 2, amount_uzs: 500_000, card_number: '8600 •••• 1234', card_holder: 'DEMO', status: 'requested', admin_note: null, requested_at: at(-20), processed_at: null },
  ],
  entries: [
    { id: 1, kind: 'lesson', amount_uzs: 86_400, note: 'Shahnoza Yusupova', created_at: at(-24) },
    { id: 2, kind: 'withdrawal', amount_uzs: -500_000, note: 'ariza', created_at: at(-20) },
  ],
});
json('/api/teacher/lessons', [
  { id: 1, teacher_user_id: 11, student_user_id: 22, starts_at: at(2), ends_at: at(3), price_uzs: 120_000, status: 'paid', student_message: '', lesson_number: null, commission_percent: null, teacher_amount_uzs: null, completed_at: null, dispute_reason: null, cancel_reason: null, refund_due: false, refunded_at: null, join: { opensAt: now, closesAt: now + 4 * H }, student_first_name: 'Malika', student_last_name: 'Tosheva' },
  { id: 2, teacher_user_id: 11, student_user_id: 24, starts_at: at(-26), ends_at: at(-25), price_uzs: 120_000, status: 'completed', student_message: '', lesson_number: 42, commission_percent: 28, teacher_amount_uzs: 86_400, completed_at: at(-24), dispute_reason: null, cancel_reason: null, refund_due: false, refunded_at: null, join: { opensAt: 0, closesAt: 0 }, student_first_name: 'Shahnoza', student_last_name: 'Yusupova' },
]);
json('/api/teacher/commission', {
  completed: 42, percent: 28, next_percent: 25, lessons_until_next: 8, lesson_price_uzs: 120_000,
  tiers: [{ up_to: 20, percent: 33 }, { up_to: 50, percent: 28 }, { up_to: 200, percent: 25 }, { up_to: 400, percent: 22 }, { up_to: null, percent: 18 }],
});
json('/api/teacher/me/meet-rooms', {
  domain: 'falarus.uz:8443', students_count: 19,
  rooms: [{ id: 1, title: 'Shaxsiy video xonangiz', room_slug: 'dilnoza-saidova' }],
  sessions: [{ id: 5, room_id: 1, teacher_user_id: 11, title: 'Guruh darsi — feʼllar', starts_at: at(80), duration_minutes: 60, timezone: 'Asia/Tashkent', status: 'scheduled', created_by: 'teacher', join_url: null }],
});
json('/api/teacher-chat', [
  { id: 1, trial_lesson_id: 31, teacher_user_id: 11, student_user_id: 21, status: 'open', last_message_at: at(-0.3), created_at: at(-30) },
  { id: 2, trial_lesson_id: null, teacher_user_id: 11, student_user_id: 22, status: 'open', last_message_at: at(-3), created_at: at(-300) },
]);
json('/api/teacher-chat/:id/messages', [
  { id: 1, conversation_id: 1, sender_user_id: 21, content: 'Assalomu alaykum, ustoz! Bugungi darsga tayyorman.', created_at: at(-0.5) },
  { id: 2, conversation_id: 1, sender_user_id: 11, content: 'Vaalaykum assalom! 14:30 da koʻrishamiz.', created_at: at(-0.4) },
]);
json('/api/teacher/onboarding', {
  data: {
    personal: { first_name: 'Dilnoza', last_name: 'Saidova', birth_country: 'UZ', subject: 'russian', proficiency: 'C2', path: 'experienced',
      contact_phone: '+998901234567', contact_telegram: '@dilnoza', contact_whatsapp: '' },
    avatar_url: null, certificates: [], education: [{ institution: 'TDPU', specialty: 'Rus filologiyasi', degree: 'bachelor', year_from: 2010, year_to: 2014 }],
    about_answers: { who: 'Toshkentdanman', background: 'Maktabda ishlaganman', years: '8 yil', students: 'Kattalar', method: 'Gaplashamiz', why: 'Sabrliman' },
    about: '8 yildan beri rus tilini oʻzbek tilida oʻrgataman. Asosan Rossiyada ishlashga tayyorlanayotganlar bilan ishlayman. '.repeat(2),
    profile: { experience_years: 8, specializations: ['conversation', 'grammar'], languages: [{ code: 'ru', level: 'C2' }, { code: 'uz', level: 'native' }] },
    video_url: '/v.mp4', video_duration_sec: 134, schedule: DEFAULT_SCHEDULE, lesson_price_uzs: 120_000, terms_accepted: true,
  },
  step: 8, status: 'active', submitted_at: at(-500), review: null, certified_verified: true, documents: [], settings: DEFAULT_SETTINGS,
  terms: { version: '2026-10-23', uz: ['Shart 1'], ru: ['Условие 1'] },
  commission: { completed: 42, percent: 28, next_percent: 25, lessons_until_next: 8 }, ready_step: null,
  revision: process.env.PREVIEW_REVISION ? { id: 1, fields: ['about', 'lesson_price_uzs'], created_at: at(-2), updated_at: at(-1) } : null,
  last_revision: null,
});
// Dars materiallari: xotiradagi PGlite + vaqtinchalik papka. Token «preview-student» — o'quvchi (22), qolgani — o'qituvchi (11).
const pg = await PGlite.create();
await pg.exec(`
  CREATE TABLE users (id integer PRIMARY KEY, account_type text);
  CREATE TABLE teacher_lessons (id bigserial PRIMARY KEY, teacher_user_id integer, student_user_id integer, starts_at timestamptz, ends_at timestamptz, status text);
  CREATE TABLE teacher_trial_lessons (id bigserial PRIMARY KEY, teacher_user_id integer, student_user_id integer, status text, scheduled_starts_at timestamptz, scheduled_ends_at timestamptz);
  INSERT INTO users VALUES (11, 'teacher'), (22, 'student');
  INSERT INTO teacher_lessons (teacher_user_id, student_user_id, starts_at, ends_at, status) VALUES (11, 22, now() - interval '5 minutes', now() + interval '45 minutes', 'paid');
`);
await pg.exec(fs.readFileSync('db/migrations/218_teacher_lesson_materials.sql', 'utf8'));
await pg.exec(fs.readFileSync('db/migrations/219_teacher_material_pages.sql', 'utf8'));
await pg.exec(fs.readFileSync('db/migrations/220_teacher_lesson_ink.sql', 'utf8'));
const previewUser = (req: express.Request) => (String(req.headers.authorization ?? '').endsWith('preview-student') ? 22 : 11);
const previewQ = (sql: string, params?: unknown[]) => pg.query(sql, params as unknown[]);
const room = createLessonRoomServer({ q: previewQ, verifyToken: (t) => (t === 'preview-student' ? 22 : t === 'preview' ? 11 : null) });
app.use('/api', createTeacherMaterialRoutes((req: any, _res: any, next: any) => { req.userId = previewUser(req); next(); }, {
  q: previewQ,
  privateDir: fs.mkdtempSync(path.join(os.tmpdir(), 'materials-preview-')),
  room: () => room,
}));
const PREVIEW_ROOM = `falarus-preview-${Math.random().toString(36).slice(2, 10)}`;
json('/api/lessons/:id/join', (req) => {
  const student = previewUser(req) === 22;
  // PREVIEW_JITSI=falarus.uz:8443 — haqiqiy video server bilan sinash (xona nomi tasodifiy).
  return { type: 'jitsi', domain: process.env.PREVIEW_JITSI || 'localhost:9', room_slug: PREVIEW_ROOM, room_password: 'preview-pass', title: 'FalaRus darsi', starts_at: at(-0.1), role: student ? 'student' : 'teacher',
    display_name: student ? 'Malika Tosheva' : 'Dilnoza Saidova', email: null };
});
app.all('/api/*', (_req, res) => res.json({}));

const vite = await createServer({ configFile: false, plugins: [react(), tailwindcss()], define: { 'import.meta.env.VITE_API_URL': '""' }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
app.use(vite.middlewares);
const html = `<!doctype html><html lang="uz"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" /><title>Ustoz kabineti preview</title></head>
<body><div id="root"></div><script type="module" src="/scripts/dev/teacherPanelPreviewEntry.tsx"></script></body></html>`;
app.get(['/panel', '/dars/*'], async (req, res) => res.type('html').send(await vite.transformIndexHtml(req.originalUrl, html)));
const httpServer = app.listen(3004, '0.0.0.0', () => console.log('Teacher panel preview: http://<lan-ip>:3004/panel'));
registerWsRoute(httpServer, ROOM_WS_PATH, room.wss);
