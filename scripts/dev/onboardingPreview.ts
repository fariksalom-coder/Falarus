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
  CREATE TABLE teacher_trial_lessons (id bigserial PRIMARY KEY, teacher_user_id integer, status text);
  CREATE TABLE teacher_meet_sessions (id bigserial PRIMARY KEY, teacher_user_id integer, status text);
  INSERT INTO users (id, account_type, phone) VALUES (10, 'teacher', '+998901234567');
  INSERT INTO teacher_trial_lessons (teacher_user_id, status) SELECT 10, 'completed' FROM generate_series(1, 14);
`);
await db.exec(await readFile('db/migrations/212_teacher_onboarding_v2.sql', 'utf8'));
const q: OnboardingQuery = (sql, params) => db.query(sql, params as unknown[]);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'onb-preview-'));
const deps = { q, uploadsDir: path.join(tmp, 'public'), privateDir: path.join(tmp, 'private'), generateAbout: null };

const app = express();
app.use(express.json());
app.use('/uploads', express.static(path.join(tmp, 'public')));
app.use('/api', createTeacherOnboardingRoutes((req: any, _res: any, next: any) => { req.userId = 10; next(); }, deps));
app.use('/api/admin', createAdminTeacherOnboardingRoutes(deps));
const vite = await createServer({ configFile: false, plugins: [react(), tailwindcss()], define: { 'import.meta.env.VITE_API_URL': '""' }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
app.use(vite.middlewares);
const html = await readFile('scripts/dev/onboarding-preview.html', 'utf8');
app.get(['/onb', '/onb-admin', '/onb-commission'], async (req, res) => res.type('html').send(await vite.transformIndexHtml(req.originalUrl, html)));
app.listen(3003, '0.0.0.0', () => console.log('Onboarding preview: http://localhost:3003/onb  admin: /onb-admin'));
