import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { createAdminUserJourneyRoutes, createUserJourneyRoutes, recordJourneyStep, type JourneyQuery } from '../server/routes/userJourneyRoutes';
import { parseVideoReport, summarizeDay0, videoStatus, VIDEO_MAX_WATCHED_PER_REPORT } from '../shared/userJourney';

const emptyDay0 = { grammar_1: false, grammar_2: false, grammar_3: false, words_learned: 0, words_match: false, text_questions_correct: 0, oqish_done: false, speaking_level: 0, suhbat_done: false };

test('video reports are validated and clamped', () => {
  assert.equal(parseVideoReport({ video: 'other', position: 1, watched: 1 }), null);
  assert.equal(parseVideoReport({ video: 'course_intro', position: -1, watched: 1 }), null);
  assert.equal(parseVideoReport({ video: 'course_intro', position: 'x', watched: 1 }), null);
  const r = parseVideoReport({ video: 'course_intro', position: 9999, watched: 500, duration: 300, event: 'play' })!;
  assert.equal(r.position, 300);
  assert.equal(r.watched, VIDEO_MAX_WATCHED_PER_REPORT);
  assert.equal(r.started, true);
  assert.equal(r.ended, true);
  // No media metadata: the known duration is used.
  const fallback = parseVideoReport({ video: 'course_intro', position: 10, watched: 10, duration: 0 })!;
  assert.equal(fallback.duration, 298.6);
  assert.equal(fallback.ended, false);
});

test('day 0 summary follows the five blocks', () => {
  assert.equal(summarizeDay0(null, 3, new Set(), false).status, 'not_started');
  assert.equal(summarizeDay0(null, 3, new Set(), true).status, 'opened');
  const opened = summarizeDay0(null, 3, new Set(['grammatika']), true);
  assert.equal(opened.status, 'in_progress');
  assert.equal(opened.reached, 'grammatika');
  assert.equal(opened.blocks[0].state, 'opened');

  const mid = summarizeDay0({ ...emptyDay0, grammar_1: true, grammar_2: true, grammar_3: true, words_learned: 12, words_match: true, text_questions_correct: 2 }, 3, new Set(['grammatika', 'lugat', 'oqish']), true);
  assert.equal(mid.doneBlocks, 2);
  assert.equal(mid.reached, 'oqish');
  assert.equal(mid.blocks[2].state, 'started');
  assert.equal(mid.blocks[2].detail, "2 to'g'ri javob");

  const full = summarizeDay0({ ...emptyDay0, grammar_1: true, grammar_2: true, grammar_3: true, words_match: true, oqish_done: true, speaking_level: 3, suhbat_done: true }, 3, new Set(), true);
  assert.equal(full.status, 'completed');
  // Without speaking prompts the block passes once reading is done, as in the app.
  const noPrompts = summarizeDay0({ ...emptyDay0, oqish_done: true }, 0, new Set(), true);
  assert.equal(noPrompts.blocks[3].state, 'done');
});

test('video status buckets', () => {
  const row = { duration_seconds: 300, max_position_seconds: 0, watched_seconds: 0, plays: 0, completed_at: null, first_started_at: '', last_watched_at: '' };
  assert.equal(videoStatus(null, false, 300), 'not_opened');
  assert.equal(videoStatus(null, true, 300), 'page_only');
  assert.equal(videoStatus({ ...row, plays: 1, max_position_seconds: 40 }, true, 300), 'started');
  assert.equal(videoStatus({ ...row, plays: 1, max_position_seconds: 160 }, true, 300), 'half');
  assert.equal(videoStatus({ ...row, plays: 1, max_position_seconds: 299, completed_at: 'x' }, true, 300), 'completed');
});

async function setup() {
  const db = await PGlite.create();
  await db.exec(`
    CREATE TABLE users(id bigint PRIMARY KEY, first_name text, last_name text, phone text, email text,
      created_at timestamptz NOT NULL DEFAULT now(), last_seen_at timestamptz, plan_expires_at timestamptz,
      is_golden boolean NOT NULL DEFAULT false, account_type text);
    CREATE TABLE support_crm_user_visits(user_id bigint, activity_date date, PRIMARY KEY(user_id, activity_date));
    CREATE TABLE daily_practice_prompts(id serial, day_number int);
    CREATE TABLE user_kunlik_day_progress(user_id bigint, day_number int, grammar_1 bool DEFAULT false, grammar_2 bool DEFAULT false,
      grammar_3 bool DEFAULT false, words_learned int DEFAULT 0, words_match bool DEFAULT false, text_questions_correct int DEFAULT 0,
      oqish_done bool DEFAULT false, speaking_level int DEFAULT 0, suhbat_done bool DEFAULT false, updated_at timestamptz DEFAULT now(),
      PRIMARY KEY(user_id, day_number));
    INSERT INTO daily_practice_prompts(day_number) VALUES (0), (0), (1);
    INSERT INTO users(id, first_name, phone, created_at, last_seen_at, plan_expires_at) VALUES
      (1, 'Ali', '+998901111111', now() - interval '2 days', now(), now() + interval '30 days'),
      (2, 'Vali', '+998902222222', now() - interval '1 day', null, null),
      (3, 'Old', '+998903333333', now() - interval '90 days', now() - interval '80 days', null);
    INSERT INTO users(id, first_name, is_golden) VALUES (4, 'Support', true);
    INSERT INTO users(id, first_name, account_type) VALUES (5, 'Teacher', 'teacher');
    INSERT INTO support_crm_user_visits VALUES (1, current_date), (1, current_date - 1);
    INSERT INTO user_kunlik_day_progress(user_id, day_number, grammar_1, grammar_2, grammar_3, words_learned, words_match, oqish_done, speaking_level, suhbat_done)
      VALUES (1, 0, true, true, true, 8, true, true, 2, true), (1, 1, true, false, false, 0, false, false, 0, false);
  `);
  await db.exec(await readFile('db/migrations/211_user_journey_tracking.sql', 'utf8'));
  const q: JourneyQuery = (sql, params) => db.query(sql, params as unknown[]);
  let userId = 2;
  const app = express();
  app.use(express.json());
  app.use('/api', createUserJourneyRoutes((req: any, _res: any, next: any) => { req.userId = userId; next(); }, q));
  app.use('/api/admin/user-journey', createAdminUserJourneyRoutes(q));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const post = (path: string, body: unknown) => fetch(url + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const get = async (path: string) => { const r = await fetch(url + path); assert.equal(r.status, 200, path); return r.json() as Promise<any>; };
  const close = async () => { await new Promise<void>((resolve, reject) => server.close((e) => e ? reject(e) : resolve())); await db.close(); };
  return { db, q, post, get, close, as: (id: number) => { userId = id; } };
}

test('journey steps and video progress are recorded and reported to admin', async () => {
  const t = await setup();
  try {
    assert.equal((await t.post('/api/journey/step', { step: 'nope' })).status, 400);
    assert.equal((await t.post('/api/journey/step', { step: 'login' })).status, 400, 'login comes only from the server');
    assert.equal((await t.post('/api/journey/step', { step: 'day0_open' })).status, 204);
    assert.equal((await t.post('/api/journey/step', { step: 'day0_open' })).status, 204);
    assert.equal((await t.post('/api/journey/step', { step: 'day0:grammatika' })).status, 204);
    assert.equal((await t.post('/api/journey/step', { step: 'course_video_page' })).status, 204);
    const steps = await t.db.query<any>(`SELECT step_key, hits FROM user_journey_steps WHERE user_id = 2 ORDER BY step_key`);
    assert.deepEqual(steps.rows.map((r) => [r.step_key, r.hits]), [['course_video_page', 1], ['day0:grammatika', 1], ['day0_open', 2]]);

    // Two sessions: the furthest point is kept, watched seconds add up, plays count starts.
    assert.equal((await t.post('/api/journey/video', { video: 'course_intro', position: 0, watched: 0, duration: 300, event: 'play' })).status, 204);
    await t.post('/api/journey/video', { video: 'course_intro', position: 95, watched: 95, duration: 300, event: 'progress' });
    await t.post('/api/journey/video', { video: 'course_intro', position: 20, watched: 0, duration: 300, event: 'play' });
    await t.post('/api/journey/video', { video: 'course_intro', position: 40, watched: 20, duration: 300, event: 'pause' });
    let v = (await t.db.query<any>(`SELECT * FROM user_video_progress WHERE user_id = 2`)).rows[0];
    assert.equal(v.max_position_seconds, 95);
    assert.equal(v.watched_seconds, 90 + 20, 'a single report is capped');
    assert.equal(v.plays, 2);
    assert.equal(v.completed_at, null);

    t.as(1);
    await recordJourneyStep(t.q, 1, 'login');
    await t.post('/api/journey/video', { video: 'course_intro', position: 0, watched: 0, duration: 300, event: 'play' });
    await t.post('/api/journey/video', { video: 'course_intro', position: 300, watched: 60, duration: 300, event: 'ended' });
    v = (await t.db.query<any>(`SELECT * FROM user_video_progress WHERE user_id = 1`)).rows[0];
    assert.ok(v.completed_at);

    const list = await t.get('/api/admin/user-journey/list?days=30');
    assert.equal(list.total, 2, 'support, teacher and old registrations are excluded');
    const [vali, ali] = list.rows;
    assert.equal(vali.id, 2);
    assert.equal(vali.day0.status, 'in_progress');
    assert.equal(vali.day0.reached, 'grammatika');
    assert.equal(vali.video.status, 'started');
    assert.equal(vali.video.max_position_seconds, 95);
    assert.equal(ali.day0.status, 'completed');
    assert.equal(ali.login_count, 1);
    assert.equal(ali.visit_days, 2);
    assert.equal(ali.video.status, 'completed');
    assert.equal(ali.premium, true);

    assert.equal((await t.get('/api/admin/user-journey/list?status=day0_none')).rows.map((r: any) => r.id).join(), '3');
    assert.equal((await t.get('/api/admin/user-journey/list?status=video_completed')).rows.map((r: any) => r.id).join(), '1');
    assert.equal((await t.get('/api/admin/user-journey/list?q=vali')).rows.map((r: any) => r.id).join(), '2');
    assert.equal((await t.get('/api/admin/user-journey/list?q=%25')).total, 0, 'LIKE wildcards are escaped');

    const summary = await t.get('/api/admin/user-journey/summary?days=30');
    assert.deepEqual(
      [summary.totals.registered, summary.totals.day0_opened, summary.totals.day0_completed, summary.totals.video_started, summary.totals.video_completed, summary.totals.premium],
      [2, 2, 1, 2, 1, 1],
    );
    assert.deepEqual(summary.video_dropoff, [{ from_seconds: 90, count: 1 }]);
    const all = await t.get('/api/admin/user-journey/summary');
    assert.equal(all.totals.registered, 3);

    const one = await t.get('/api/admin/user-journey/user/2');
    assert.equal(one.user.name, 'Vali');
    assert.equal(one.steps.length, 3);
  } finally {
    await t.close();
  }
});
