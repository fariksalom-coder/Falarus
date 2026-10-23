import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import {
  commissionForLesson, commissionStatus, stepsForPath, teacherNet, validatePersonal, validateSchedule, validateTiers,
  aboutFromTemplate, termsText, DEFAULT_SETTINGS, DEFAULT_SCHEDULE, normalizeSchedule, upcomingSlotStarts, zonedToUtc,
} from '../shared/teacherOnboarding';
import { createAdminTeacherOnboardingRoutes, createTeacherOnboardingRoutes, type OnboardingQuery } from '../server/routes/teacherOnboardingRoutes';

/* ───────────── qoidalar ───────────── */

test('commission tiers follow the spec boundaries', () => {
  assert.equal(commissionForLesson(1), 33);
  assert.equal(commissionForLesson(20), 33);
  assert.equal(commissionForLesson(21), 28, 'lesson 21 is already 28%');
  assert.equal(commissionForLesson(50), 28);
  assert.equal(commissionForLesson(51), 25);
  assert.equal(commissionForLesson(200), 25);
  assert.equal(commissionForLesson(201), 22);
  assert.equal(commissionForLesson(400), 22);
  assert.equal(commissionForLesson(401), 18);
  assert.equal(commissionForLesson(5000), 18);
  assert.deepEqual(commissionStatus(0), { completed: 0, percent: 33, next_percent: 28, lessons_until_next: 20 });
  assert.deepEqual(commissionStatus(20), { completed: 20, percent: 28, next_percent: 25, lessons_until_next: 30 });
  assert.deepEqual(commissionStatus(400), { completed: 400, percent: 18, next_percent: null, lessons_until_next: null });
  assert.equal(teacherNet(100_000, 33), 67_000);
  assert.equal(validateTiers([{ up_to: 10, percent: 30 }, { up_to: 5, percent: 20 }, { up_to: null, percent: 10 }]), null, 'limits must grow');
  assert.equal(validateTiers([{ up_to: 10, percent: 30 }, { up_to: 20, percent: 20 }]), null, 'last tier is open-ended');
  assert.ok(validateTiers(DEFAULT_SETTINGS.commission_tiers));
});

test('step rules: names, path, schedule overlaps, about template, terms', () => {
  assert.deepEqual(stepsForPath('experienced'), [1, 2, 4, 5, 6, 7, 8]);
  assert.deepEqual(stepsForPath('certified'), [1, 2, 3, 4, 5, 6, 7, 8]);
  const ok = { first_name: 'Shahlo', last_name: 'Karimova', birth_country: 'UZ', subject: 'russian', proficiency: 'C1', path: 'certified' as const };
  assert.deepEqual(validatePersonal(ok), {});
  assert.equal(validatePersonal({ ...ok, first_name: 'A' }).first_name, 'name');
  assert.equal(validatePersonal({ ...ok, last_name: 'Karimova1' }).last_name, 'name');
  assert.equal(validatePersonal({ ...ok, path: '' }).path, 'path');
  assert.deepEqual(validateSchedule(DEFAULT_SCHEDULE), {});
  assert.equal(Object.keys(validateSchedule({ timezone: 'Asia/Tashkent', slots: [] })).length, 1);
  const overlap = normalizeSchedule({ timezone: 'Asia/Tashkent', slots: [{ weekday: 1, start: '09:00', end: '12:00' }, { weekday: 1, start: '11:00', end: '13:00' }] });
  assert.ok(Object.values(validateSchedule(overlap)).includes('overlap'));
  const touching = normalizeSchedule({ timezone: 'Asia/Tashkent', slots: [{ weekday: 1, start: '09:00', end: '12:00' }, { weekday: 1, start: '12:00', end: '13:00' }] });
  assert.deepEqual(validateSchedule(touching), {}, 'back-to-back intervals are fine');
  assert.equal(Object.values(validateSchedule({ timezone: 'Asia/Tashkent', slots: [{ weekday: 2, start: '14:00', end: '10:00' }] }))[0], 'interval');
  assert.match(aboutFromTemplate({ who: 'Toshkentdanman', method: 'Gaplashib' }, 'uz'), /Darslarim qanday oʻtadi: Gaplashib\./);
  const ru = termsText(DEFAULT_SETTINGS, 'ru').join(' ');
  assert.match(ru, /100%/);
  assert.match(ru, /21–50-й урок — 28%/);
  assert.match(ru, /с 401-го урока и далее — 18%/);
});

/* ───────────── API (PGlite) ───────────── */

async function setup() {
  const db = await PGlite.create();
  await db.exec(`
    CREATE TABLE users (id integer PRIMARY KEY, account_type text, avatar_url text, phone text, email text);
    CREATE TABLE teacher_profiles (
      user_id integer PRIMARY KEY REFERENCES users(id), first_name text NOT NULL, last_name text NOT NULL, age integer NOT NULL DEFAULT 30,
      avatar_url text, region text NOT NULL DEFAULT '', city text NOT NULL DEFAULT '', headline text NOT NULL DEFAULT '', about text NOT NULL DEFAULT '',
      subjects text[] NOT NULL DEFAULT ARRAY[]::text[], education jsonb NOT NULL DEFAULT '[]', certificates jsonb NOT NULL DEFAULT '[]',
      weekly_availability jsonb NOT NULL DEFAULT '[]', video_url text,
      profile_status text NOT NULL DEFAULT 'draft', updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT teacher_profiles_profile_status_check CHECK (profile_status IN ('draft', 'pending_review', 'active', 'paused', 'rejected')));
    CREATE TABLE teacher_documents (id bigserial PRIMARY KEY, teacher_user_id integer NOT NULL REFERENCES teacher_profiles(user_id) ON DELETE CASCADE,
      kind text NOT NULL, file_url text NOT NULL, original_name text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'pending',
      admin_note text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE teacher_availability_rules (id bigserial PRIMARY KEY, teacher_user_id integer, weekday smallint CHECK (weekday BETWEEN 0 AND 6),
      start_time time, end_time time, timezone text);
    CREATE TABLE teacher_notifications (id bigserial PRIMARY KEY, recipient_user_id integer, type text, title text, body text);
    CREATE TABLE teacher_trial_lessons (id bigserial PRIMARY KEY, teacher_user_id integer, status text);
    CREATE TABLE teacher_meet_sessions (id bigserial PRIMARY KEY, teacher_user_id integer, status text);
    CREATE TABLE teacher_lessons (id bigserial PRIMARY KEY, teacher_user_id integer, status text);
    INSERT INTO users (id, account_type) VALUES (10, 'teacher'), (11, 'teacher'), (12, 'student'), (13, 'teacher');
    -- Old teacher: certificate in the old shape, must become the certified path.
    INSERT INTO teacher_profiles (user_id, first_name, last_name, certificates, profile_status) VALUES
      (13, 'Old', 'Teacher', '[{"title":"RKI","issuer":"MGU","year":"2015","image_url":""}]', 'active');
  `);
  await db.exec(await readFile('db/migrations/212_teacher_onboarding_v2.sql', 'utf8'));
  const q: OnboardingQuery = (sql, params) => db.query(sql, params as unknown[]);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'onb-'));
  const durations: Record<string, number | null> = {};
  let user = 10;
  const app = express();
  app.use(express.json());
  const deps = {
    q, uploadsDir: path.join(tmp, 'public'), privateDir: path.join(tmp, 'private'),
    generateAbout: async () => { throw new Error('AI is down'); },
    // The test names the file size to decide the "duration".
    probeVideo: async (file: string) => ({ duration: durations[String(fs.statSync(file).size)] ?? null, hasVideo: true }),
  };
  app.use('/api', createTeacherOnboardingRoutes((req: any, _res: any, next: any) => { req.userId = user; next(); }, deps));
  app.use('/api/admin', createAdminTeacherOnboardingRoutes(deps));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;
  const call = async (method: string, p: string, body?: unknown) => {
    const r = await fetch(url + p, { method, headers: body instanceof FormData || body instanceof Uint8Array ? {} : { 'Content-Type': 'application/json' },
      body: body instanceof FormData || body instanceof Uint8Array ? body as BodyInit : body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, data: await r.json().catch(() => null) as any };
  };
  const close = async () => { await new Promise<void>((r, j) => server.close((e) => (e ? j(e) : r()))); await db.close(); fs.rmSync(tmp, { recursive: true, force: true }); };
  return { db, call, close, durations, tmp, as: (id: number) => { user = id; } };
}

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082', 'hex');
const PDF = Buffer.from('%PDF-1.4\n%test\n');
const form = (buf: Buffer, name: string) => { const f = new FormData(); f.append('file', new Blob([buf]), name); return f; };

async function uploadVideo(t: Awaited<ReturnType<typeof setup>>, bytes: number, seconds: number) {
  t.durations[String(bytes)] = seconds;
  const init = await t.call('POST', '/teacher/onboarding/video/uploads', { size: bytes, mime: 'video/mp4', name: `v${bytes}.mp4` });
  assert.equal(init.status, 201, JSON.stringify(init.data));
  const data = Buffer.alloc(bytes, 7);
  const half = Math.floor(bytes / 2);
  assert.equal((await t.call('PUT', `/teacher/onboarding/video/uploads/${init.data.id}?offset=0`, new Uint8Array(data.subarray(0, half)))).status, 200);
  // "Connection dropped": the client re-sends from a wrong offset and is told where to continue.
  const wrong = await t.call('PUT', `/teacher/onboarding/video/uploads/${init.data.id}?offset=0`, new Uint8Array(data.subarray(0, 10)));
  assert.equal(wrong.status, 409);
  assert.equal(wrong.data.received, half);
  // Re-selecting the same file resumes the same upload.
  const again = await t.call('POST', '/teacher/onboarding/video/uploads', { size: bytes, mime: 'video/mp4', name: `v${bytes}.mp4` });
  assert.equal(again.data.id, init.data.id);
  assert.equal(again.data.received, half);
  assert.equal((await t.call('PUT', `/teacher/onboarding/video/uploads/${init.data.id}?offset=${half}`, new Uint8Array(data.subarray(half)))).status, 200);
  return t.call('POST', `/teacher/onboarding/video/uploads/${init.data.id}/complete`);
}

const answers = { who: 'Toshkentdanman, filologman', background: 'Maktabda rus tili oʻqituvchisi edim', years: '8 yil', students: 'Boshlangʻich va oʻrta daraja, kattalar', method: 'Har darsda gaplashamiz va xatolarni tushuntiraman', why: 'Sabrli va tushunarli tushuntiraman' };
const longAbout = 'Men Toshkentdanman. '.repeat(20);

test('experienced path: all steps, reload keeps data, video checks, submit once, admin decisions', async () => {
  const t = await setup();
  try {
    assert.equal((await t.call('GET', '/teacher/onboarding')).data.step, 1);
    t.as(12);
    assert.equal((await t.call('GET', '/teacher/onboarding')).status, 403, 'students cannot open it');
    t.as(10);
    assert.equal((await t.call('PUT', '/teacher/onboarding/steps/4', { education: [] })).status, 409, 'step 1 first');
    const bad = await t.call('PUT', '/teacher/onboarding/steps/1', { first_name: 'A', last_name: 'Karimova', birth_country: 'UZ', subject: 'russian', proficiency: 'C1' });
    assert.equal(bad.status, 422);
    assert.equal(bad.data.fields.first_name.code, 'name');
    assert.ok(bad.data.fields.path.ru);
    // Autosave of a half-filled step keeps the text and does not move the step.
    assert.equal((await t.call('PUT', '/teacher/onboarding/steps/1?draft=1', { first_name: 'Shahlo', last_name: '' })).status, 200);
    let s = (await t.call('GET', '/teacher/onboarding')).data;
    assert.equal(s.data.personal.first_name, 'Shahlo');
    assert.equal(s.step, 1);
    s = (await t.call('PUT', '/teacher/onboarding/steps/1', { first_name: 'Shahlo', last_name: 'Karimova', birth_country: 'UZ', subject: 'russian', proficiency: 'C1', path: 'experienced' })).data;
    assert.equal(s.step, 2);

    const notImage = await t.call('POST', '/teacher/onboarding/photo', form(PDF, 'me.png'));
    assert.equal(notImage.status, 415, 'file content is checked, not the name');
    s = (await t.call('POST', '/teacher/onboarding/photo', form(PNG, 'me.png'))).data;
    assert.equal(s.step, 4, 'experienced path skips certification');
    assert.ok(fs.existsSync(path.join(t.tmp, 'public', s.data.avatar_url.replace('/uploads/', ''))));

    s = (await t.call('PUT', '/teacher/onboarding/steps/4', { education: [{ institution: 'TDPU', specialty: 'Rus filologiyasi', degree: 'bachelor', year_from: 2010, year_to: 2014 }] })).data;
    assert.equal(s.step, 5);
    const gen = await t.call('POST', '/teacher/onboarding/about/generate', { answers, lang: 'uz' });
    assert.equal(gen.data.source, 'template', 'AI failure falls back to the template');
    assert.match(gen.data.text, /Toshkentdanman/);
    assert.equal((await t.call('PUT', '/teacher/onboarding/steps/5', { answers, about: 'qisqa' })).data.fields.about.code, 'aboutLength');
    s = (await t.call('PUT', '/teacher/onboarding/steps/5', { answers, about: longAbout })).data;
    assert.equal(s.step, 6);

    const short = await uploadVideo(t, 2048, 42);
    assert.equal(short.status, 422);
    assert.equal(short.data.code, 'VIDEO_TOO_SHORT');
    const okVideo = await uploadVideo(t, 4096, 95);
    assert.equal(okVideo.status, 200, JSON.stringify(okVideo.data));
    assert.equal(okVideo.data.data.video_duration_sec, 95);
    assert.equal(okVideo.data.step, 7);

    assert.deepEqual((await t.call('GET', '/teacher/onboarding')).data.data.schedule, DEFAULT_SCHEDULE, 'template is offered');
    const overlap = await t.call('PUT', '/teacher/onboarding/steps/7', { schedule: { timezone: 'Asia/Tashkent', slots: [{ weekday: 1, start: '09:00', end: '12:00' }, { weekday: 1, start: '10:00', end: '11:00' }] } });
    assert.equal(overlap.status, 422);
    s = (await t.call('PUT', '/teacher/onboarding/steps/7', { schedule: { timezone: 'Europe/Moscow', slots: [{ weekday: 7, start: '10:00', end: '14:00' }, { weekday: 3, start: '18:00', end: '21:00' }] } })).data;
    assert.equal(s.step, 8);
    const rules = await t.db.query<any>('SELECT weekday, timezone FROM teacher_availability_rules WHERE teacher_user_id = 10 ORDER BY weekday');
    assert.deepEqual(rules.rows.map((r) => [r.weekday, r.timezone]), [[0, 'Europe/Moscow'], [3, 'Europe/Moscow']], 'Sunday is stored as 0 for the calendar');

    assert.equal((await t.call('PUT', '/teacher/onboarding/steps/8', { lesson_price_uzs: 10_000, terms_accepted: true })).data.fields.lesson_price_uzs.code, 'price');
    assert.equal((await t.call('PUT', '/teacher/onboarding/steps/8', { lesson_price_uzs: 80_000, terms_accepted: false })).data.fields.terms.code, 'terms');
    s = (await t.call('PUT', '/teacher/onboarding/steps/8', { lesson_price_uzs: 80_000, terms_accepted: true })).data;
    assert.equal(s.data.terms_accepted, true);
    assert.equal(s.ready_step, null, 'everything is filled');
    const acc = await t.db.query<any>('SELECT terms_version, lesson_price_uzs FROM teacher_terms_acceptances WHERE teacher_user_id = 10');
    assert.deepEqual(acc.rows, [{ terms_version: '2026-10-23', lesson_price_uzs: 80_000 }]);

    // Reload: everything is still there.
    const reloaded = (await t.call('GET', '/teacher/onboarding')).data;
    assert.equal(reloaded.data.personal.last_name, 'Karimova');
    assert.equal(reloaded.data.education[0].institution, 'TDPU');
    assert.equal(reloaded.data.lesson_price_uzs, 80_000);

    const sub1 = await t.call('POST', '/teacher/onboarding/submit');
    const sub2 = await t.call('POST', '/teacher/onboarding/submit');
    assert.equal(sub1.data.status, 'pending_review');
    assert.equal(sub2.status, 200, 'a second click is harmless');
    assert.equal((await t.db.query<any>(`SELECT count(*)::int AS n FROM teacher_review_events WHERE action = 'submitted'`)).rows[0].n, 1);
    assert.equal((await t.call('PUT', '/teacher/onboarding/steps/4', { education: [] })).status, 409, 'locked while in review');

    // Admin returns it to step 5, the teacher fixes it and sends again, admin approves.
    assert.equal((await t.call('POST', '/admin/teacher-applications/10/decision', { decision: 'revision', step: 5 })).status, 400, 'a comment is required');
    assert.equal((await t.call('POST', '/admin/teacher-applications/10/decision', { decision: 'revision', step: 5, comment: 'Metodikangizni batafsilroq yozing' })).data.status, 'needs_revision');
    s = (await t.call('GET', '/teacher/onboarding')).data;
    assert.deepEqual([s.status, s.step, s.review.step], ['needs_revision', 5, 5]);
    await t.call('PUT', '/teacher/onboarding/steps/5', { answers, about: longAbout + ' Har darsda gaplashamiz.' });
    assert.equal((await t.call('POST', '/teacher/onboarding/submit')).data.status, 'pending_review');
    assert.equal((await t.call('POST', '/admin/teacher-applications/10/decision', { decision: 'approve' })).data.status, 'active');
    const notes = await t.db.query<any>('SELECT title FROM teacher_notifications WHERE recipient_user_id = 10 ORDER BY id');
    assert.equal(notes.rows.length, 2);
    const detail = (await t.call('GET', '/admin/teacher-applications/10')).data;
    assert.deepEqual(detail.events.map((e: any) => e.action), ['approved', 'submitted', 'needs_revision', 'submitted']);

    // Commission widget counts completed trial lessons and ended video lessons.
    await t.db.exec(`INSERT INTO teacher_trial_lessons (teacher_user_id, status) SELECT 10, 'completed' FROM generate_series(1, 19);
      INSERT INTO teacher_trial_lessons (teacher_user_id, status) VALUES (10, 'pending_payment'); INSERT INTO teacher_meet_sessions (teacher_user_id, status) VALUES (10, 'ended');`);
    const c = (await t.call('GET', '/teacher/commission')).data;
    assert.deepEqual([c.completed, c.percent, c.next_percent, c.lessons_until_next], [20, 28, 25, 30]);
  } finally {
    await t.close();
  }
});

test('certified path needs a private certificate scan; settings change asks for new consent; old teachers are migrated', async () => {
  const t = await setup();
  try {
    t.as(11);
    await t.call('PUT', '/teacher/onboarding/steps/1', { first_name: 'Aziz', last_name: 'Rahimov', birth_country: 'RU', subject: 'russian', proficiency: 'native', path: 'certified' });
    const s = (await t.call('POST', '/teacher/onboarding/photo', form(PNG, 'a.png'))).data;
    assert.equal(s.step, 3, 'certified path does not skip certification');
    const noDoc = await t.call('PUT', '/teacher/onboarding/steps/3', { certificates: [{ title: 'RKI', institution: 'MGU', year_from: 2012, year_to: 2016, document_ids: [] }] });
    assert.equal(noDoc.data.fields['certificates.0.documents'].code, 'certDocument');
    const doc = await t.call('POST', '/teacher/onboarding/documents', form(PDF, 'diplom.pdf'));
    assert.equal(doc.status, 201);
    const saved = await t.call('PUT', '/teacher/onboarding/steps/3', { certificates: [{ title: 'RKI', institution: 'MGU', year_from: 2012, year_to: 2016, document_ids: [doc.data.id] }] });
    assert.equal(saved.data.step, 4);
    // The scan is not public: not under uploads, readable by its owner and by the admin only.
    assert.equal(fs.existsSync(path.join(t.tmp, 'public', 'teacher-docs')), false);
    const own = await t.call('GET', `/teacher/onboarding/documents/${doc.data.id}/file`);
    assert.equal(own.status, 200);
    t.as(10);
    await t.call('PUT', '/teacher/onboarding/steps/1', { first_name: 'Boshqa', last_name: 'Ustoz', birth_country: 'UZ', subject: 'russian', proficiency: 'C1', path: 'certified' });
    assert.equal((await t.call('GET', `/teacher/onboarding/documents/${doc.data.id}/file`)).status, 404, 'another teacher cannot read it');
    assert.equal((await t.call('PUT', '/teacher/onboarding/steps/3', { certificates: [{ title: 'Diplom', institution: 'TDPU', document_ids: [doc.data.id] }] })).status, 400, 'nor attach it');
    assert.equal((await t.call('GET', `/admin/teacher-applications/11/documents/${doc.data.id}/file`)).status, 200);

    // Admin changes the scale: the teacher's consent no longer counts until accepted again.
    t.as(11);
    await t.call('PUT', '/teacher/onboarding/steps/8', { lesson_price_uzs: 120_000, terms_accepted: true });
    assert.equal((await t.call('GET', '/teacher/onboarding')).data.data.terms_accepted, true);
    const badTiers = await t.call('PUT', '/admin/teacher-onboarding-settings', { price_min_uzs: 30000, price_max_uzs: 500000, commission_tiers: [{ up_to: 10, percent: 30 }] });
    assert.equal(badTiers.status, 400);
    const upd = await t.call('PUT', '/admin/teacher-onboarding-settings', { price_min_uzs: 30000, price_max_uzs: 500000, commission_tiers: [{ up_to: 30, percent: 30 }, { up_to: null, percent: 20 }] });
    assert.equal(upd.status, 200);
    const after = (await t.call('GET', '/teacher/onboarding')).data;
    assert.equal(after.data.terms_accepted, false);
    assert.match(after.terms.ru.join(' '), /1–30-й урок — 30%/);

    const old = await t.db.query<any>(`SELECT onboarding_path, profile_status FROM teacher_profiles WHERE user_id = 13`);
    assert.deepEqual(old.rows[0], { onboarding_path: 'certified', profile_status: 'active' });
    t.as(13);
    const oldState = (await t.call('GET', '/teacher/onboarding')).data;
    assert.equal(oldState.data.certificates[0].institution, 'MGU', 'old issuer field is read as institution');
    assert.equal(oldState.data.certificates[0].year_to, 2015);
  } finally {
    await t.close();
  }
});

test('schedule slots are computed in the teacher time zone', () => {
  assert.equal(new Date(zonedToUtc(2026, 10, 26, 9, 0, 'Asia/Tashkent')).toISOString(), '2026-10-26T04:00:00.000Z');
  assert.equal(new Date(zonedToUtc(2026, 10, 26, 9, 0, 'Europe/Moscow')).toISOString(), '2026-10-26T06:00:00.000Z');
  // Monday 2026-10-26, 09:00–11:00 Tashkent → two lessons at 04:00 and 05:00 UTC.
  const now = Date.parse('2026-10-25T20:00:00Z');
  const slots = upcomingSlotStarts({ timezone: 'Asia/Tashkent', slots: [{ weekday: 1, start: '09:00', end: '11:00' }] }, now, 2);
  assert.deepEqual(slots.map((t) => new Date(t).toISOString()), ['2026-10-26T04:00:00.000Z', '2026-10-26T05:00:00.000Z']);
});
