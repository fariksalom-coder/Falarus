import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import {
  deliver, inbox, markNotification, onDayCompleted, runScheduledRules, safeUrl, sendCampaign, updateRule,
  type Pushers, type Query,
} from '../server/services/notifications.service.js';

async function setup() {
  const db = await PGlite.create();
  await db.exec(`CREATE TABLE users(id bigint PRIMARY KEY, first_name text, created_at timestamptz DEFAULT now(), last_seen_at timestamptz,
      plan_expires_at timestamptz, is_golden boolean, account_type text);
    CREATE TABLE user_kunlik_day_progress(user_id bigint, day_number int, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, day_number));`);
  await db.exec(await readFile(new URL('../db/migrations/216_notifications.sql', import.meta.url), 'utf8'));
  // Idempotent: qayta yurgizish xavfsiz bo'lishi shart.
  await db.exec(await readFile(new URL('../db/migrations/216_notifications.sql', import.meta.url), 'utf8'));
  const q: Query = (sql, params) => db.query(sql, params as unknown[]) as Promise<{ rows: any[] }>;
  return { db, q };
}

function fakePushers() {
  const calls: { web: number[][]; app: number[][] } = { web: [], app: [] };
  const pushers: Pushers = {
    web: async (ids) => { calls.web.push(ids); return ids.filter((id) => id % 2 === 1); },
    app: async (ids) => { calls.app.push(ids); return []; },
  };
  return { calls, pushers };
}

const ruleId = async (q: Query, code: string) => Number((await q('SELECT id FROM notification_rules WHERE code = $1', [code])).rows[0].id);

test('rules start switched off; when enabled they send once per day to the right people', async () => {
  const { db, q } = await setup();
  try {
    await db.exec(`INSERT INTO users(id, created_at, last_seen_at) VALUES
      (1, now() - interval '30 days', now()), (2, now() - interval '30 days', now()), (3, now() - interval '30 days', now()),
      (4, now() - interval '30 days', now()), (5, now() - interval '30 days', now());
      UPDATE users SET is_golden = true WHERE id = 4;
      UPDATE users SET account_type = 'teacher' WHERE id = 5;
      INSERT INTO user_kunlik_day_progress VALUES (1, 3, now() - interval '30 hours'), (2, 4, now()), (4, 1, now() - interval '30 hours'), (5, 1, now() - interval '30 hours');`);
    const { calls, pushers } = fakePushers();
    const now = new Date();
    const hour = new Date(now.getTime() + 5 * 3_600_000).getUTCHours();

    assert.deepEqual(await runScheduledRules(now, pushers, q), [], 'nothing is sent while rules are off');

    const id = await ruleId(q, 'no_study_today');
    await updateRule(id, { enabled: true, send_hour: hour }, q);
    const [first] = await runScheduledRules(now, pushers, q);
    // 1 — kecha o'qigan, bugun yo'q; 2 — bugun o'qigan; 3 — umuman o'qimagan; 4 oltin, 5 o'qituvchi.
    assert.equal(first.created, 1);
    assert.deepEqual(calls.web, [[1]]);
    assert.equal(first.pushed, 1);
    const again = await runScheduledRules(now, pushers, q);
    assert.equal(again[0].created, 0, 'the same rule does not repeat on the same day');
    assert.equal(calls.web.length, 1);

    const other = await runScheduledRules(new Date(now.getTime() + 3_600_000), pushers, q);
    assert.deepEqual(other, [], 'another hour — not this rule');
  } finally { await db.close(); }
});

test('inactive and not-started rules pick the exact day window', async () => {
  const { db, q } = await setup();
  try {
    await db.exec(`INSERT INTO users(id, created_at, last_seen_at) VALUES
      (10, now() - interval '60 days', now() - interval '3 days 6 hours'),
      (11, now() - interval '60 days', now() - interval '5 days'),
      (12, now() - interval '30 hours', now()),
      (13, now() - interval '30 hours', now());
      INSERT INTO user_kunlik_day_progress VALUES (13, 1, now());`);
    const { pushers } = fakePushers();
    const now = new Date();
    const hour = new Date(now.getTime() + 5 * 3_600_000).getUTCHours();
    await updateRule(await ruleId(q, 'inactive_3_days'), { enabled: true, send_hour: hour }, q);
    await updateRule(await ruleId(q, 'registered_not_started'), { enabled: true, send_hour: hour }, q);
    const res = await runScheduledRules(now, pushers, q);
    const by = Object.fromEntries(res.map((r) => [r.rule, r.created]));
    assert.equal(by.inactive_3_days, 1);
    assert.equal(by.registered_not_started, 1);
    const rows = (await q('SELECT user_id FROM notifications ORDER BY user_id')).rows.map((r) => Number(r.user_id));
    assert.deepEqual(rows, [10, 12]);
  } finally { await db.close(); }
});

test('day completed: in-app voice message only, no push, once per day number', async () => {
  const { db, q } = await setup();
  try {
    await db.exec(`INSERT INTO users(id) VALUES (20)`);
    assert.equal((await onDayCompleted(20, 5, q)).created, 0, 'switched off by default');
    const id = await ruleId(q, 'day_completed');
    await updateRule(id, { enabled: true, title: '{kun}-kun yopildi!', audio_url: '/uploads/bildirishnoma-ovoz/abc.mp3' }, q);
    assert.equal((await onDayCompleted(20, 5, q)).created, 1);
    assert.equal((await onDayCompleted(20, 5, q)).created, 0);
    const box = await inbox(20, q);
    assert.equal(box.unseen, 1);
    assert.equal(box.items[0].title, '5-kun yopildi!');
    assert.equal(box.items[0].audio_url, '/uploads/bildirishnoma-ovoz/abc.mp3');
    await markNotification(20, Number(box.items[0].id), 'opened', q);
    await markNotification(999, Number(box.items[0].id), 'seen', q); // boshqa odam belgilay olmaydi
    const after = await inbox(20, q);
    assert.equal(after.unseen, 0);
    assert.ok(after.items[0].opened_at);
  } finally { await db.close(); }
});

test('campaigns: one user for a test, everyone except hidden accounts, push counted', async () => {
  const { db, q } = await setup();
  try {
    await db.exec(`INSERT INTO users(id) VALUES (31), (32), (33); UPDATE users SET is_golden = true WHERE id = 33;`);
    const { calls, pushers } = fakePushers();
    const msg = { title: 'Salom', body: 'Matn', url: '/', audio_url: null, adminId: 1 };
    const test1 = await sendCampaign({ ...msg, segment: 'user', param: 32 }, pushers, q);
    assert.equal(test1.total, 1);
    const all = await sendCampaign({ ...msg, segment: 'all', param: 0 }, pushers, q);
    assert.equal(all.total, 2);
    assert.equal(all.pushed, 1, 'only 31 has a device in the fake pusher');
    assert.deepEqual(calls.web.at(-1), [31, 32]);
    const camp = (await q('SELECT total, pushed FROM notification_campaigns ORDER BY id DESC LIMIT 1')).rows[0];
    assert.deepEqual([camp.total, camp.pushed], [2, 1]);
    // Push xatosi xabarni yo'qotmaydi: kirish qutisida qoladi.
    const failing: Pushers = { web: async () => { throw new Error('down'); }, app: async () => [] };
    const r = await deliver([31], { title: 't', body: 'b', url: '/', audio_url: null }, { dedupeKey: 'x1' }, failing, q);
    assert.deepEqual(r, { created: 1, pushed: 0 });
  } finally { await db.close(); }
});

test('input checks: internal links only, limits, own voice files only', async () => {
  assert.equal(safeUrl('/kunlik-reja'), '/kunlik-reja');
  for (const bad of ['https://evil.uz', '//evil.uz', 'javascript:alert(1)', '/ a', '']) assert.equal(safeUrl(bad), '/');
  const { db, q } = await setup();
  try {
    const id = await ruleId(q, 'inactive_3_days');
    const r = await updateRule(id, { send_hour: 99, param: -5, audio_url: 'https://evil.uz/x.mp3', title: '   ' }, q);
    assert.equal(r.send_hour, 23);
    assert.equal(r.param, 0);
    assert.equal(r.audio_url, null);
    assert.equal(r.title, 'Sizni sog‘indik!');
    await assert.rejects(updateRule(9999, {}, q), { status: 404 });
  } finally { await db.close(); }
});
