import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import {
  activateTeacherLessonPayment, createAdminTeacherMoneyRoutes, createTeacherLessonRoutes, prepareLessonPayment, type LessonQuery,
} from '../server/routes/teacherLessonRoutes';
import { canCancel, canComplete, joinState, splitLessonPrice, normalizeCardNumber } from '../shared/teacherLessons';
import { DEFAULT_COMMISSION_TIERS, upcomingSlotStarts } from '../shared/teacherOnboarding';

test('lesson rules', () => {
  const start = new Date(Date.now() + 3600_000).toISOString();
  const end = new Date(Date.now() + 7200_000).toISOString();
  assert.equal(joinState(start, end), 'early');
  assert.equal(joinState(start, end, Date.now() + 3600_000 - 5 * 60_000), 'open', '10 minutes before');
  assert.equal(joinState(start, end, Date.now() + 7200_000 + 31 * 60_000), 'late');
  assert.equal(canComplete('paid', start), false);
  assert.equal(canCancel('paid', start), true);
  assert.deepEqual(splitLessonPrice(100_000, 1, DEFAULT_COMMISSION_TIERS), { percent: 33, platform: 33_000, teacher: 67_000 });
  assert.deepEqual(splitLessonPrice(100_000, 21, DEFAULT_COMMISSION_TIERS), { percent: 28, platform: 28_000, teacher: 72_000 });
  assert.equal(normalizeCardNumber('8600 1234 5678 9012'), '8600123456789012');
  assert.equal(normalizeCardNumber('8600 1234'), null);
});

const SCHEDULE = { timezone: 'Asia/Tashkent', slots: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, start: '00:00', end: '24:00' })) };

async function setup() {
  const db = await PGlite.create();
  await db.exec(`
    CREATE TABLE users (id integer PRIMARY KEY, first_name text, last_name text, account_type text, phone text);
    CREATE TABLE teacher_profiles (user_id integer PRIMARY KEY REFERENCES users(id), first_name text, last_name text, avatar_url text,
      profile_status text, lesson_price_uzs integer, schedule jsonb, terms_accepted_at timestamptz, catalog_visible boolean NOT NULL DEFAULT true);
    CREATE TABLE payments (id bigint PRIMARY KEY, product_code text, discount_meta jsonb);
    CREATE TABLE teacher_trial_lessons (id bigserial PRIMARY KEY, teacher_user_id integer, student_user_id integer, status text,
      scheduled_starts_at timestamptz, scheduled_ends_at timestamptz);
    CREATE TABLE teacher_meet_sessions (id bigserial PRIMARY KEY, teacher_user_id integer, status text);
    CREATE TABLE teacher_notifications (id bigserial PRIMARY KEY, recipient_user_id integer, type text, title text, body text, entity_type text, entity_id bigint);
    CREATE TABLE teacher_onboarding_settings (id boolean PRIMARY KEY DEFAULT true, price_min_uzs int, price_max_uzs int, commission_tiers jsonb, terms_version text);
    INSERT INTO teacher_onboarding_settings VALUES (true, 30000, 500000, '[{"up_to":20,"percent":33},{"up_to":50,"percent":28},{"up_to":200,"percent":25},{"up_to":400,"percent":22},{"up_to":null,"percent":18}]', 'v1');
    INSERT INTO users VALUES (1, 'Ustoz', 'Bir', 'teacher', '+1'), (2, 'Ali', 'Valiyev', 'student', '+2'), (3, 'Vali', 'Aliyev', 'student', '+3');
  `);
  await db.query(`INSERT INTO teacher_profiles VALUES (1, 'Ustoz', 'Bir', null, 'active', 100000, $1, now())`, [JSON.stringify(SCHEDULE)]);
  await db.exec(await readFile('db/migrations/213_teacher_lessons_balance.sql', 'utf8'));
  const q: LessonQuery = (sql, params) => db.query(sql, params as unknown[]);
  const tx = <T,>(fn: (q: LessonQuery) => Promise<T>) => db.transaction((t) => fn((sql, params) => t.query(sql, params as unknown[]))) as Promise<T>;
  let user = 2;
  const app = express();
  app.use(express.json());
  app.use('/api', createTeacherLessonRoutes((req: any, _res: any, next: any) => { req.userId = user; next(); }, { q, tx, meetDomain: 'meet.test' }));
  app.use('/api/admin/teacher-money', createAdminTeacherMoneyRoutes({ q, tx }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;
  const call = async (method: string, p: string, body?: unknown) => {
    const r = await fetch(url + p, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, data: await r.json().catch(() => null) as any };
  };
  const close = async () => { await new Promise<void>((r, j) => server.close((e) => (e ? j(e) : r()))); await db.close(); };
  return { db, q, call, close, as: (id: number) => { user = id; } };
}

let payId = 100;
async function bookAndPay(t: Awaited<ReturnType<typeof setup>>, startMs: number, student = 2) {
  t.as(student);
  const b = await t.call('POST', '/teachers/1/lessons', { starts_at: new Date(startMs).toISOString() });
  assert.equal(b.status, 201, JSON.stringify(b.data));
  const id = ++payId;
  await t.q('INSERT INTO payments (id) VALUES ($1)', [id]);
  await t.q('UPDATE teacher_lessons SET payment_id = $2 WHERE id = $1', [b.data.id, id]);
  await activateTeacherLessonPayment(t.q, id);
  return b.data.id as number;
}
test('a paid first invoice still pays the lesson after the student opened a second one', async () => {
  const t = await setup();
  try {
    const slot = upcomingSlotStarts(SCHEDULE, Date.now() + 2 * 3600_000, 1)[0];
    t.as(2);
    const b = await t.call('POST', '/teachers/1/lessons', { starts_at: new Date(slot).toISOString() });
    await t.q(`INSERT INTO payments (id, product_code, discount_meta) VALUES (501, 'teacher_lesson', $1), (502, 'teacher_lesson', $1)`, [JSON.stringify({ lesson_id: b.data.id })]);
    // The retry re-linked the lesson to 502; Rahmat then confirms the first invoice, 501.
    await t.q('UPDATE teacher_lessons SET payment_id = 502 WHERE id = $1', [b.data.id]);
    await activateTeacherLessonPayment(t.q, 501);
    const l = (await t.q('SELECT status, payment_id FROM teacher_lessons WHERE id = $1', [b.data.id])).rows[0];
    assert.deepEqual([l.status, Number(l.payment_id)], ['paid', 501]);
  } finally {
    await t.close();
  }
});

/** Dars vaqtini o'tmishga surish (sinov uchun). */
const shift = (t: Awaited<ReturnType<typeof setup>>, id: number, startAgoMin: number) =>
  t.q(`UPDATE teacher_lessons SET starts_at = now() - ($2::int * interval '1 minute'), ends_at = now() - ($2::int * interval '1 minute') + interval '1 hour' WHERE id = $1`, [id, startAgoMin]);

test('booking, payment, room, completion with commission, withdrawals', async () => {
  const t = await setup();
  try {
    const slots = upcomingSlotStarts(SCHEDULE, Date.now() + 2 * 3600_000, 3);
    const slots0 = (await t.call('GET', '/teachers/1/lesson-slots')).data;
    assert.equal(slots0.price_uzs, 100000);
    assert.equal(slots0.bookable, true);

    t.as(2);
    assert.equal((await t.call('POST', '/teachers/1/lessons', { starts_at: new Date(Date.now() + 10 * 60_000).toISOString() })).status, 400, 'too soon');
    assert.equal((await t.call('POST', '/teachers/1/lessons', { starts_at: new Date(slots[0] + 30 * 60_000).toISOString() })).status, 400, 'not on the schedule grid');
    const a = await t.call('POST', '/teachers/1/lessons', { starts_at: new Date(slots[0]).toISOString() });
    assert.equal(a.status, 201);
    assert.equal(a.data.status, 'pending_payment');
    assert.equal(a.data.price_uzs, 100000);
    t.as(3);
    assert.equal((await t.call('POST', '/teachers/1/lessons', { starts_at: new Date(slots[0]).toISOString() })).status, 409, 'slot is held');
    assert.ok((await t.call('GET', '/teachers/1/lesson-slots')).data.busy.includes(new Date(slots[0]).toISOString()));

    // An unpaid hold expires after 30 minutes and the slot is free again.
    await t.q(`UPDATE teacher_lessons SET created_at = now() - interval '31 minutes' WHERE id = $1`, [a.data.id]);
    assert.equal((await t.call('POST', '/teachers/1/lessons', { starts_at: new Date(slots[0]).toISOString() })).status, 201);
    await assert.rejects(prepareLessonPayment(2, a.data.id, t.q), /boshqa oʻquvchi/, 'the old hold cannot be revived');

    // Payment → paid, teacher notified; the room opens 10 minutes before the start, only for participants.
    const lessonId = await bookAndPay(t, slots[3], 2);
    let n = await t.q(`SELECT type FROM teacher_notifications WHERE recipient_user_id = 1 ORDER BY id DESC LIMIT 1`);
    assert.equal(n.rows[0].type, 'lesson_paid');
    t.as(2);
    assert.equal((await t.call('GET', `/lessons/${lessonId}/join`)).status, 425);
    await shift(t, lessonId, -5);
    const join = await t.call('GET', `/lessons/${lessonId}/join`);
    assert.equal(join.status, 200);
    assert.match(join.data.room_slug, /^falarus-dars-[0-9a-f]{20}$/);
    assert.equal(join.data.domain, 'meet.test');
    t.as(3);
    assert.equal((await t.call('GET', `/lessons/${lessonId}/join`)).status, 404, 'strangers do not get the room');

    // The teacher cannot complete before the start; after it the balance gets price − 33%.
    t.as(1);
    assert.equal((await t.call('POST', `/teacher/lessons/${lessonId}/complete`)).status, 409);
    await shift(t, lessonId, 70);
    const done = await t.call('POST', `/teacher/lessons/${lessonId}/complete`);
    assert.deepEqual([done.data.lesson_number, done.data.percent, done.data.teacher], [1, 33, 67000]);
    assert.equal((await t.call('POST', `/teacher/lessons/${lessonId}/complete`)).status, 200, 'second click is harmless');
    let bal = (await t.call('GET', '/teacher/balance')).data;
    assert.equal(bal.balance, 67000);
    assert.equal(bal.entries.length, 1);

    // Auto-completion 24h after the end; a dispute stops it until the admin decides.
    const auto = await bookAndPay(t, slots[4], 2);
    await shift(t, auto, 26 * 60);
    const disputed = await bookAndPay(t, slots[5], 3);
    await shift(t, disputed, 90);
    t.as(3);
    assert.equal((await t.call('POST', `/lessons/${disputed}/dispute`, { reason: 'Ustoz kelmadi' })).status, 200);
    await t.q(`UPDATE teacher_lessons SET ends_at = now() - interval '30 hours', starts_at = now() - interval '31 hours' WHERE id = $1`, [disputed]);
    t.as(1);
    bal = (await t.call('GET', '/teacher/balance')).data;
    assert.equal(bal.balance, 67000 + 67000, 'the old lesson was completed automatically');
    assert.equal((await t.q(`SELECT status FROM teacher_lessons WHERE id = $1`, [disputed])).rows[0].status, 'disputed');
    const attention = (await t.call('GET', '/admin/teacher-money/lessons?filter=attention')).data;
    assert.deepEqual(attention.rows.map((r: any) => r.id), [disputed]);
    assert.equal((await t.call('POST', `/admin/teacher-money/lessons/${disputed}/cancel`, { reason: 'Ustoz kelmagan' })).status, 200);
    assert.equal((await t.q(`SELECT refund_due FROM teacher_lessons WHERE id = $1`, [disputed])).rows[0].refund_due, true);
    assert.equal((await t.call('POST', `/admin/teacher-money/lessons/${disputed}/refunded`)).status, 200);

    // Student cancels a paid lesson before the start → refund due; the teacher is told.
    const cancelled = await bookAndPay(t, slots[6], 2);
    t.as(2);
    const c = await t.call('POST', `/lessons/${cancelled}/cancel`, { reason: 'Ishim chiqib qoldi' });
    assert.deepEqual(c.data, { ok: true, refund_due: true });
    n = await t.q(`SELECT type FROM teacher_notifications WHERE recipient_user_id = 1 ORDER BY id DESC LIMIT 1`);
    assert.equal(n.rows[0].type, 'lesson_cancelled');

    // Withdrawals: limits, hold, rejection returns the money, paid stays deducted.
    t.as(1);
    assert.equal((await t.call('POST', '/teacher/withdrawals', { amount_uzs: 1000, card_number: '8600123456789012', card_holder: 'Ustoz Bir' })).status, 400);
    assert.equal((await t.call('POST', '/teacher/withdrawals', { amount_uzs: 200000, card_number: '8600123456789012', card_holder: 'Ustoz Bir' })).status, 400, 'more than balance');
    assert.equal((await t.call('POST', '/teacher/withdrawals', { amount_uzs: 60000, card_number: '8600 1234', card_holder: 'Ustoz Bir' })).status, 400);
    const w1 = await t.call('POST', '/teacher/withdrawals', { amount_uzs: 60000, card_number: '8600 1234 5678 9012', card_holder: 'Ustoz Bir' });
    assert.equal(w1.status, 201);
    assert.equal(w1.data.balance, 74000);
    const w2 = await t.call('POST', '/teacher/withdrawals', { amount_uzs: 70000, card_number: '8600123456789012', card_holder: 'Ustoz Bir' });
    assert.equal(w2.data.balance, 4000);
    assert.equal((await t.call('POST', '/teacher/withdrawals', { amount_uzs: 60000, card_number: '8600123456789012', card_holder: 'Ustoz Bir' })).status, 400, 'held money cannot be requested twice');
    bal = (await t.call('GET', '/teacher/balance')).data;
    assert.equal(bal.withdrawals[0].card_number, '8600 •••• •••• 9012', 'card is masked for the teacher');
    const list = (await t.call('GET', '/admin/teacher-money/withdrawals?status=requested')).data;
    assert.equal(list.rows.length, 2);
    assert.equal(list.rows[0].card_number.length, 16, 'admin sees the full card to pay');
    assert.equal((await t.call('POST', `/admin/teacher-money/withdrawals/${w1.data.id}/reject`, {})).status, 400, 'reason required');
    assert.equal((await t.call('POST', `/admin/teacher-money/withdrawals/${w1.data.id}/reject`, { note: 'Karta egasi mos emas' })).status, 200);
    assert.equal((await t.call('POST', `/admin/teacher-money/withdrawals/${w2.data.id}/paid`, { note: 'Payme orqali' })).status, 200);
    assert.equal((await t.call('POST', `/admin/teacher-money/withdrawals/${w2.data.id}/paid`, {})).status, 409);
    bal = (await t.call('GET', '/teacher/balance')).data;
    assert.equal(bal.balance, 64000);

    // Commission tier: after 20 platform lessons (trials count too) the next one is 28%.
    await t.q(`INSERT INTO teacher_trial_lessons (teacher_user_id, student_user_id, status) SELECT 1, 2, 'completed' FROM generate_series(1, 18)`);
    const tier = await bookAndPay(t, slots[8], 2);
    await shift(t, tier, 70);
    t.as(1);
    const d2 = (await t.call('POST', `/teacher/lessons/${tier}/complete`)).data;
    assert.deepEqual([d2.lesson_number, d2.percent, d2.teacher], [21, 28, 72000]);
  } finally {
    await t.close();
  }
});

test('trial lessons get a private FalaRus room too', async () => {
  const t = await setup();
  try {
    const trial = (await t.q(`INSERT INTO teacher_trial_lessons (teacher_user_id, student_user_id, status, scheduled_starts_at, scheduled_ends_at)
      VALUES (1, 2, 'paid', now() + interval '5 minutes', now() + interval '65 minutes') RETURNING id`)).rows[0].id;
    t.as(2);
    const s = await t.call('GET', `/teacher-trials/${trial}/join`);
    t.as(1);
    const tch = await t.call('GET', `/teacher-trials/${trial}/join`);
    assert.equal(s.status, 200);
    assert.equal(s.data.room_slug, tch.data.room_slug, 'both join the same room');
    assert.equal(tch.data.role, 'teacher');
    t.as(3);
    assert.equal((await t.call('GET', `/teacher-trials/${trial}/join`)).status, 404);
  } finally {
    await t.close();
  }
});
