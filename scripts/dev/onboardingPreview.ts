/** Isolated preview of teacher onboarding v2: in-memory DB, real routes, no external services. */
import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { createAdminTeacherOnboardingRoutes, createTeacherOnboardingRoutes, type OnboardingQuery } from '../../server/routes/teacherOnboardingRoutes';
import { createAdminTeacherMoneyRoutes, createTeacherLessonRoutes } from '../../server/routes/teacherLessonRoutes';

process.env.DATABASE_URL = '';
const db = await PGlite.create();
await db.exec(`
  CREATE TABLE users (id integer PRIMARY KEY, account_type text, avatar_url text, phone text, email text);
  CREATE TABLE teacher_profiles (user_id integer PRIMARY KEY REFERENCES users(id), first_name text NOT NULL, last_name text NOT NULL, age integer NOT NULL DEFAULT 30,
    avatar_url text, region text NOT NULL DEFAULT '', city text NOT NULL DEFAULT '', headline text NOT NULL DEFAULT '', about text NOT NULL DEFAULT '',
    subjects text[] NOT NULL DEFAULT ARRAY[]::text[], education jsonb NOT NULL DEFAULT '[]', certificates jsonb NOT NULL DEFAULT '[]',
    weekly_availability jsonb NOT NULL DEFAULT '[]', video_url text, profile_status text NOT NULL DEFAULT 'draft', updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT teacher_profiles_profile_status_check CHECK (profile_status IN ('draft', 'pending_review', 'active', 'paused', 'rejected')));
  CREATE TABLE teacher_documents (id bigserial PRIMARY KEY, teacher_user_id integer NOT NULL REFERENCES teacher_profiles(user_id) ON DELETE CASCADE,
    kind text NOT NULL, file_url text NOT NULL, original_name text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'pending',
    admin_note text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE teacher_availability_rules (id bigserial PRIMARY KEY, teacher_user_id integer, weekday smallint, start_time time, end_time time, timezone text);
  CREATE TABLE teacher_notifications (id bigserial PRIMARY KEY, recipient_user_id integer, type text, title text, body text);
  CREATE TABLE teacher_trial_lessons (id bigserial PRIMARY KEY, teacher_user_id integer, student_user_id integer, status text, scheduled_starts_at timestamptz, scheduled_ends_at timestamptz);
  CREATE TABLE teacher_meet_sessions (id bigserial PRIMARY KEY, teacher_user_id integer, status text);
  CREATE TABLE payments (id bigint PRIMARY KEY);
  INSERT INTO users (id, account_type, phone) VALUES (10, 'teacher', '+998901234567'), (20, 'student', '+998907777777');
  INSERT INTO teacher_trial_lessons (teacher_user_id, status) SELECT 10, 'completed' FROM generate_series(1, 14);
`);
await db.exec(await readFile('db/migrations/212_teacher_onboarding_v2.sql', 'utf8'));
await db.exec(`ALTER TABLE users ADD COLUMN first_name text, ADD COLUMN last_name text; UPDATE users SET first_name = 'Ali', last_name = 'Valiyev' WHERE id = 20;`);
await db.exec(await readFile('db/migrations/213_teacher_lessons_balance.sql', 'utf8'));
// Demo: active teacher 11 with a price and a schedule, one completed lesson, one upcoming paid lesson.
await db.exec(`INSERT INTO users (id, account_type, phone, first_name, last_name) VALUES (11, 'teacher', '+998901112233', 'Shahlo', 'Karimova');
  INSERT INTO teacher_profiles (user_id, first_name, last_name, profile_status, lesson_price_uzs, terms_accepted_at, terms_version, schedule)
  VALUES (11, 'Shahlo', 'Karimova', 'active', 90000, now(), '2026-10-23', '{"timezone":"Asia/Tashkent","slots":[{"weekday":1,"start":"09:00","end":"12:00"},{"weekday":2,"start":"09:00","end":"12:00"},{"weekday":3,"start":"14:00","end":"18:00"},{"weekday":4,"start":"09:00","end":"12:00"},{"weekday":5,"start":"09:00","end":"12:00"},{"weekday":6,"start":"10:00","end":"13:00"},{"weekday":7,"start":"10:00","end":"13:00"}]}');
  INSERT INTO teacher_lessons (teacher_user_id, student_user_id, starts_at, ends_at, price_uzs, status, room_slug, lesson_number, commission_percent, teacher_amount_uzs, platform_amount_uzs, completed_at)
    VALUES (11, 20, now() - interval '2 days', now() - interval '2 days' + interval '1 hour', 90000, 'completed', 'demo-a', 1, 33, 60300, 29700, now() - interval '2 days');
  INSERT INTO teacher_balance_entries (teacher_user_id, kind, amount_uzs, lesson_id, note) VALUES (11, 'lesson', 60300, 1, '1-dars · komissiya 33%');
  INSERT INTO teacher_lessons (teacher_user_id, student_user_id, starts_at, ends_at, price_uzs, status, room_slug, student_message)
    VALUES (11, 20, now() + interval '5 minutes', now() + interval '65 minutes', 90000, 'paid', 'demo-b', 'Patent imtihoniga tayyorlanyapman');`);
const q: OnboardingQuery = (sql, params) => db.query(sql, params as unknown[]);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'onb-preview-'));
const deps = { q, uploadsDir: path.join(tmp, 'public'), privateDir: path.join(tmp, 'private'), generateAbout: null };

const app = express();
app.use(express.json());
app.use('/uploads', express.static(path.join(tmp, 'public')));
app.use('/api', createTeacherOnboardingRoutes((req: any, _res: any, next: any) => { req.userId = 10; next(); }, deps));
app.use('/api/admin', createAdminTeacherOnboardingRoutes(deps));
const tx = <T,>(fn: (q: OnboardingQuery) => Promise<T>) => db.transaction((t) => fn((sql, p) => t.query(sql, p as unknown[]))) as Promise<T>;
// /onb-balance acts as teacher 11, /onb-book as student 20.
app.use('/api', createTeacherLessonRoutes((req: any, _res: any, next: any) => { req.userId = String(req.headers.referer ?? '').includes('onb-book') ? 20 : 11; next(); }, { q, tx, meetDomain: 'falarus.uz:8443' }));
app.use('/api/admin/teacher-money', createAdminTeacherMoneyRoutes({ q, tx }));
const vite = await createServer({ configFile: false, plugins: [react(), tailwindcss()], define: { 'import.meta.env.VITE_API_URL': '""' }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
app.use(vite.middlewares);
const html = await readFile('scripts/dev/onboarding-preview.html', 'utf8');
app.get(['/onb', '/onb-focus', '/onb-admin', '/onb-commission', '/onb-balance', '/onb-book', '/onb-money'], async (req, res) => res.type('html').send(await vite.transformIndexHtml(req.originalUrl, html)));
app.listen(3003, '0.0.0.0', () => console.log('Onboarding preview: http://localhost:3003/onb  admin: /onb-admin'));
