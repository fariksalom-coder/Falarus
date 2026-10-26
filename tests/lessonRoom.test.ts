import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { WebSocket } from 'ws';
import { createLessonRoomServer } from '../server/services/lessonRoom.service';
import { registerWsRoute } from '../server/lib/wsRoutes';
import { ROOM_CLOSE, ROOM_WS_PATH, type ServerMessage } from '../shared/lessonRoom';

async function setup() {
  const db = await PGlite.create();
  await db.exec(`
    CREATE TABLE users (id integer PRIMARY KEY, account_type text);
    CREATE TABLE teacher_lessons (id bigserial PRIMARY KEY, teacher_user_id integer, student_user_id integer, starts_at timestamptz, ends_at timestamptz, status text);
    CREATE TABLE teacher_trial_lessons (id bigserial PRIMARY KEY, teacher_user_id integer, student_user_id integer, status text, scheduled_starts_at timestamptz, scheduled_ends_at timestamptz);
    INSERT INTO users VALUES (1, 'teacher'), (2, 'student'), (3, 'student'), (4, 'teacher');
    INSERT INTO teacher_lessons (teacher_user_id, student_user_id, starts_at, ends_at, status) VALUES
      (1, 2, now() - interval '5 minutes', now() + interval '45 minutes', 'paid'),
      (1, 2, now() + interval '1 day', now() + interval '1 day 50 minutes', 'paid');
  `);
  await db.exec(await readFile('db/migrations/218_teacher_lesson_materials.sql', 'utf8'));
  await db.exec(await readFile('db/migrations/219_teacher_material_pages.sql', 'utf8'));
  await db.exec(await readFile('db/migrations/220_teacher_lesson_ink.sql', 'utf8'));
  await db.exec(`INSERT INTO teacher_materials (teacher_user_id, title, kind, mime, size_bytes, private_path) VALUES
    (1, 'Dars 1', 'pdf', 'application/pdf', 100, 'x/1.pdf'), (4, 'Begona', 'pdf', 'application/pdf', 100, 'x/2.pdf')`);
  const q = (sql: string, params?: unknown[]) => db.query(sql, params);
  const room = createLessonRoomServer({ q, verifyToken: (t) => ({ t1: 1, s2: 2, s3: 3 } as Record<string, number>)[t] ?? null });
  const server = http.createServer();
  registerWsRoute(server, ROOM_WS_PATH, room.wss);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const url = `ws://127.0.0.1:${(server.address() as { port: number }).port}${ROOM_WS_PATH}`;

  /** Ulanadi va xabarlarni navbatga yig'adi; `next(t)` — shu turdagi keyingi xabar. */
  const connect = (token: string, lessonId = 1) => {
    const ws = new WebSocket(url);
    const inbox: ServerMessage[] = [];
    const waiters: Array<{ t: string; ok: (m: ServerMessage) => void }> = [];
    ws.on('message', (d) => {
      const m = JSON.parse(String(d)) as ServerMessage;
      const i = waiters.findIndex((w) => w.t === m.t);
      if (i >= 0) waiters.splice(i, 1)[0].ok(m);
      else inbox.push(m);
    });
    const closed = new Promise<number>((r) => ws.on('close', (code) => r(code)));
    const opened = new Promise<void>((r) => ws.on('open', () => { ws.send(JSON.stringify({ t: 'hello', token, kind: 'lesson', lessonId })); r(); }));
    const next = <T extends ServerMessage['t']>(t: T, ms = 3000) => new Promise<Extract<ServerMessage, { t: T }>>((ok, bad) => {
      const i = inbox.findIndex((m) => m.t === t);
      if (i >= 0) return ok(inbox.splice(i, 1)[0] as Extract<ServerMessage, { t: T }>);
      const waiter = { t, ok: (m: ServerMessage) => { clearTimeout(timer); ok(m as Extract<ServerMessage, { t: T }>); } };
      // Vaqti o'tgan kutish navbatdan olib tashlanadi — keyingi xabarni o'g'irlamasin.
      const timer = setTimeout(() => { waiters.splice(waiters.indexOf(waiter), 1); bad(new Error(`no ${t}`)); }, ms);
      waiters.push(waiter);
    });
    const send = (m: unknown) => ws.send(JSON.stringify(m));
    return { ws, next, send, closed, opened, inbox };
  };

  const close = async () => {
    room.close();
    await new Promise<void>((r) => server.close(() => r()));
    await db.close();
  };
  return { db, connect, close, room };
}

test('only the lesson’s teacher and student get in, and only while the room is open', async () => {
  const t = await setup();
  try {
    assert.equal(await t.connect('bad').closed, ROOM_CLOSE.auth);
    assert.equal(await t.connect('s3').closed, ROOM_CLOSE.forbidden, 'not their lesson');
    assert.equal(await t.connect('s2', 2).closed, ROOM_CLOSE.early, 'tomorrow’s lesson');
    const s = t.connect('s2');
    const st = await s.next('state');
    assert.equal(st.role, 'student');
    assert.equal(st.state.material, null);
    s.ws.close();
  } finally {
    await t.close();
  }
});

test('teacher shows a material and turns pages: student follows, duplicates are not applied twice, late joiner gets the state', async () => {
  const t = await setup();
  try {
    const teacher = t.connect('t1');
    const student = t.connect('s2');
    await teacher.next('state');
    await student.next('state');
    assert.deepEqual((await teacher.next('presence')).presence, { teacher: true, student: true });

    teacher.send({ t: 'op', id: 'a1', op: { type: 'show', material: { id: 1 }, page: 1 } });
    const ack = await teacher.next('ack');
    assert.equal(ack.id, 'a1');
    const shown = await student.next('op');
    assert.equal(shown.op.type, 'show');
    assert.equal(shown.op.type === 'show' && shown.op.material?.title, 'Dars 1', 'server fills the material details');

    teacher.send({ t: 'op', id: 'a2', op: { type: 'page', page: 7 } });
    teacher.send({ t: 'op', id: 'a2', op: { type: 'page', page: 7 } });
    const first = await teacher.next('ack');
    const again = await teacher.next('ack');
    assert.equal(first.seq, again.seq, 'resent op is acknowledged with the same seq');
    const paged = await student.next('op');
    assert.equal(paged.op.type === 'page' && paged.op.page, 7);
    await assert.rejects(student.next('op', 300), 'the duplicate is not broadcast');

    // Begona o'qituvchining materiali va o'quvchining boshqaruvi rad etiladi.
    teacher.send({ t: 'op', id: 'a3', op: { type: 'show', material: { id: 2 }, page: 1 } });
    assert.equal((await teacher.next('reject')).id, 'a3');
    student.send({ t: 'op', id: 'b1', op: { type: 'page', page: 2 } });
    assert.equal((await student.next('reject')).id, 'b1');

    // Uzilib qayta ulangan o'quvchi darhol joriy holatni oladi.
    student.ws.close();
    await student.closed;
    const back = t.connect('s2');
    const restored = (await back.next('state')).state;
    assert.equal(restored.material?.id, 1);
    assert.equal(restored.page, 7);
    assert.equal(restored.seq, 2);
    back.ws.close();
    teacher.ws.close();
    await teacher.closed;

    // Hamma chiqqandan keyin ham holat bazadan tiklanadi.
    await new Promise((r) => setTimeout(r, 50));
    const fresh = t.connect('t1');
    assert.equal((await fresh.next('state')).state.page, 7);
    fresh.ws.close();
  } finally {
    await t.close();
  }
});

test('laser is relayed to the other side only and only from the teacher; deleting a material clears the board', async () => {
  const t = await setup();
  try {
    const teacher = t.connect('t1');
    const student = t.connect('s2');
    await teacher.next('state');
    await student.next('state');
    teacher.send({ t: 'laser', x: 0.25, y: 0.5 });
    const dot = await student.next('laser');
    assert.deepEqual(dot, { t: 'laser', x: 0.25, y: 0.5 });
    await assert.rejects(teacher.next('laser', 200), 'not echoed back');
    teacher.send({ t: 'laser', x: 3, y: 0.5 });
    student.send({ t: 'laser', x: 0.1, y: 0.1 });
    await assert.rejects(teacher.next('laser', 200), 'student cannot point, out-of-page points dropped');

    teacher.send({ t: 'op', id: 'x', op: { type: 'show', material: { id: 1 }, page: 3 } });
    await student.next('op');
    assert.equal(t.room.currentMaterialId('lesson', 1), 1);
    t.room.materialDeleted(1);
    const cleared = await student.next('op');
    assert.equal(cleared.op.type === 'show' && cleared.op.material, null);

    teacher.send({ t: 'ping', c: 123 });
    const pong = await teacher.next('pong');
    assert.equal(pong.c, 123);
    assert.ok(Math.abs(pong.s - Date.now()) < 5000);
    teacher.ws.close();
    student.ws.close();
  } finally {
    await t.close();
  }
});

test('two WebSocket endpoints share one HTTP server (lesson room next to the live voice chat)', async () => {
  const { WebSocketServer } = await import('ws');
  const server = http.createServer();
  const a = new WebSocketServer({ noServer: true });
  const b = new WebSocketServer({ noServer: true });
  a.on('connection', (ws) => ws.send('a'));
  b.on('connection', (ws) => ws.send('b'));
  registerWsRoute(server, '/api/ustoz/live', a);
  registerWsRoute(server, ROOM_WS_PATH, b);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const base = `ws://127.0.0.1:${(server.address() as { port: number }).port}`;
  const first = (path: string) => new Promise<string>((ok) => {
    const ws = new WebSocket(base + path);
    ws.on('message', (d) => { ok(String(d)); ws.close(); });
    ws.on('error', () => ok('error'));
  });
  try {
    assert.equal(await first('/api/ustoz/live?token=x'), 'a', 'query string does not matter');
    assert.equal(await first(ROOM_WS_PATH), 'b');
    assert.equal(await first('/api/unknown'), 'error');
  } finally {
    a.close(); b.close();
    await new Promise<void>((r) => server.close(() => r()));
  }
});

test('page turns stop at the last page of the material on the board', async () => {
  const { applyRoomOp, emptyRoomState } = await import('../shared/lessonRoom');
  const shown = applyRoomOp(emptyRoomState(), { type: 'show', material: { id: 1, title: 'k', kind: 'pdf', mime: 'application/pdf', size_bytes: 1, page_count: 12 }, page: 1 });
  assert.equal(applyRoomOp(shown, { type: 'page', page: 99 }).page, 12);
  assert.equal(applyRoomOp(shown, { type: 'page', page: 0 }).page, 1);
  assert.equal(applyRoomOp(emptyRoomState(), { type: 'page', page: 5 }).page, 1, 'no material — nothing to turn');
});

const stroke = (id: string, x = 0.1) => ({ id, tool: 'pen', color: '#EF4444', size: 4, pts: [x, 0.1, x + 0.1, 0.2] });

test('drawing: teacher draws, the student draws only when allowed, only on the current page and erases only their own', async () => {
  const t = await setup();
  try {
    const teacher = t.connect('t1');
    const student = t.connect('s2');
    await teacher.next('state');
    await student.next('state');
    teacher.send({ t: 'op', id: 's', op: { type: 'show', material: { id: 1 }, page: 2 } });
    await student.next('op');

    teacher.send({ t: 'op', id: 'i1', op: { type: 'ink', key: 'm1:2', add: [stroke('a')] } });
    const drawn = await student.next('op');
    assert.equal(drawn.op.type === 'ink' && drawn.op.add?.[0].by, 'teacher', 'server stamps the author');

    student.send({ t: 'op', id: 'x1', op: { type: 'ink', key: 'm1:2', add: [stroke('b')] } });
    assert.equal((await student.next('reject')).id, 'x1', 'no permission yet');
    student.send({ t: 'draft', key: 'm1:2', id: 'b', tool: 'pen', color: '#EF4444', size: 4, pts: [0.1, 0.1] });
    await assert.rejects(teacher.next('draft', 200), 'drafts from a student without permission are dropped');

    teacher.send({ t: 'op', id: 'p1', op: { type: 'permit', studentCanDraw: true } });
    await student.next('op');
    student.send({ t: 'draft', key: 'm1:2', id: 'b', tool: 'pen', color: '#EF4444', size: 4, pts: [0.1, 0.1, 0.2, 0.2] });
    const draft = await teacher.next('draft');
    assert.equal(draft.by, 'student');
    student.send({ t: 'op', id: 'x2', op: { type: 'ink', key: 'm1:2', add: [stroke('b')] } });
    assert.equal((await student.next('ack')).id, 'x2');
    await teacher.next('op');

    student.send({ t: 'op', id: 'x3', op: { type: 'ink', key: 'm1:3', add: [stroke('c')] } });
    assert.equal((await student.next('reject')).id, 'x3', 'only the page on the board');
    student.send({ t: 'op', id: 'x4', op: { type: 'ink', key: 'm1:2', remove: ['a'] } });
    assert.equal((await student.next('reject')).id, 'x4', 'cannot erase the teacher’s ink');
    student.send({ t: 'op', id: 'x5', op: { type: 'ink', key: 'm1:2', clear: true } });
    assert.equal((await student.next('reject')).id, 'x5', 'cannot clear the page');
    student.send({ t: 'op', id: 'x6', op: { type: 'ink', key: 'm1:2', remove: ['b'] } });
    assert.equal((await student.next('ack')).id, 'x6', 'own stroke can be erased');
    await teacher.next('op');

    // Hamma chiqdi — chizmalar bazadan qaytadi (yozuv bir oz kechiktirib qilinadi).
    teacher.ws.close();
    student.ws.close();
    await teacher.closed;
    await student.closed;
    await new Promise((r) => setTimeout(r, 100));
    const back = t.connect('s2');
    const restored = (await back.next('state')).state;
    assert.deepEqual(restored.ink['m1:2'].map((s) => s.id), ['a']);
    assert.equal(restored.studentCanDraw, true);
    back.ws.close();
  } finally {
    await t.close();
  }
});

test('blank pages: open a new one, move between them, go back to the material, close the board', async () => {
  const t = await setup();
  try {
    const teacher = t.connect('t1');
    await teacher.next('state');
    const op = async (id: string, o: unknown) => { teacher.send({ t: 'op', id, op: o }); return (await teacher.next('ack')).seq; };
    await op('1', { type: 'show', material: { id: 1 }, page: 3 });
    await op('2', { type: 'blank', n: 1 });
    await op('3', { type: 'ink', key: 'b1', add: [stroke('w')] });
    await op('4', { type: 'blank', n: 2 });
    await op('5', { type: 'page', page: 1 });
    await op('6', { type: 'blank', n: 9 });
    const fresh = t.connect('s2');
    const st = (await fresh.next('state')).state;
    assert.equal(st.blank, 3, 'a new blank page is always the next number');
    assert.equal(st.blankCount, 3);
    assert.equal(st.ink.b1.length, 1);
    await op('7', { type: 'blank', n: null });
    const back = await fresh.next('op');
    assert.equal(back.op.type, 'blank');
    await op('8', { type: 'close' });
    await fresh.next('op');
    teacher.ws.close();
    await teacher.closed;
    fresh.ws.close();
    await fresh.closed;
    await new Promise((r) => setTimeout(r, 50));
    const again = t.connect('t1');
    const s2 = (await again.next('state')).state;
    assert.equal(s2.material, null);
    assert.equal(s2.blank, null);
    assert.equal(s2.blankCount, 3, 'blank pages are kept for the lesson');
    again.ws.close();
  } finally {
    await t.close();
  }
});

test('ink ops are validated and page keys follow the board', async () => {
  const { parseRoomOp, inkKeyOf, emptyRoomState } = await import('../shared/lessonRoom');
  assert.equal(parseRoomOp({ type: 'ink', key: 'm1:2', add: [{ ...stroke('a'), pts: [0.1] }] }), null, 'odd point list');
  assert.equal(parseRoomOp({ type: 'ink', key: '../x', add: [stroke('a')] }), null, 'bad key');
  assert.equal(parseRoomOp({ type: 'ink', key: 'm1:2', add: [{ ...stroke('a'), color: 'red' }] }), null, 'bad colour');
  const text = parseRoomOp({ type: 'ink', key: 'b1', add: [{ id: 't', tool: 'text', color: '#2563EB', size: 30, pts: [2, -1], text: '  Salom   dunyo ' }] });
  assert.deepEqual(text && text.type === 'ink' && text.add?.[0].pts, [1, 0], 'points clamped into the page');
  assert.equal(text && text.type === 'ink' && text.add?.[0].text, 'Salom dunyo');
  const s = emptyRoomState();
  assert.equal(inkKeyOf(s), null);
  assert.equal(inkKeyOf({ ...s, material: { id: 7, title: '', kind: 'audio', mime: '', size_bytes: 1, page_count: null } }), null, 'no ink on audio');
  assert.equal(inkKeyOf({ ...s, material: { id: 7, title: '', kind: 'image', mime: '', size_bytes: 1, page_count: 1 }, page: 4 }), 'm7:1');
});

test('audio playback: the teacher plays, pauses and seeks; times come from the server clock; the student follows', async () => {
  const t = await setup();
  try {
    await t.db.exec(`INSERT INTO teacher_materials (teacher_user_id, title, kind, mime, size_bytes, private_path) VALUES (1, 'Dialog', 'audio', 'audio/mpeg', 100, 'x/3.mp3')`);
    const teacher = t.connect('t1');
    const student = t.connect('s2');
    await teacher.next('state');
    await student.next('state');
    teacher.send({ t: 'op', id: 'show', op: { type: 'show', material: { id: 3 }, page: 1 } });
    const shown = await student.next('op');
    assert.equal(shown.op.type === 'show' && shown.op.material?.kind, 'audio');

    const before = Date.now();
    teacher.send({ t: 'op', id: 'play', op: { type: 'media', playing: true, position: 12.5, at: 1 } });
    const play = await student.next('op');
    assert.ok(play.op.type === 'media');
    if (play.op.type === 'media') {
      assert.equal(play.op.playing, true);
      assert.equal(play.op.position, 12.5);
      assert.ok(play.op.at >= before && play.op.at <= Date.now(), 'the client clock (at: 1) is replaced by the server time');
    }

    student.send({ t: 'op', id: 'nope', op: { type: 'media', playing: false, position: 0, at: 0 } });
    assert.equal((await student.next('reject')).id, 'nope', 'only the teacher controls playback');

    // Kech kirgan o'quvchi ham ijro holatini darhol oladi.
    const late = t.connect('s2');
    const st = (await late.next('state')).state;
    assert.equal(st.media?.playing, true);
    assert.equal(st.media?.position, 12.5);

    teacher.send({ t: 'op', id: 'seek', op: { type: 'media', playing: false, position: 99999999, at: 0 } });
    const paused = await student.next('op');
    assert.equal(paused.op.type === 'media' && paused.op.position, 6 * 3600, 'position is capped');

    teacher.send({ t: 'op', id: 'pdf', op: { type: 'show', material: { id: 1 }, page: 1 } });
    await student.next('op');
    const after = t.connect('s2');
    assert.equal((await after.next('state')).state.media, null, 'a new material starts paused at zero');
    for (const c of [teacher, student, late, after]) c.ws.close();
  } finally {
    await t.close();
  }
});

test('playback position is computed from the server clock', async () => {
  const { mediaPositionAt, applyRoomOp, emptyRoomState } = await import('../shared/lessonRoom');
  assert.equal(mediaPositionAt({ playing: true, position: 10, at: 1000 }, 4000), 13);
  assert.equal(mediaPositionAt({ playing: false, position: 10, at: 1000 }, 4000), 10);
  assert.equal(mediaPositionAt({ playing: true, position: 10, at: 5000 }, 4000), 10, 'a little clock skew never goes backwards');
  const pdf = applyRoomOp(emptyRoomState(), { type: 'show', material: { id: 1, title: '', kind: 'pdf', mime: '', size_bytes: 1, page_count: 2 }, page: 1 });
  assert.equal(applyRoomOp(pdf, { type: 'media', playing: true, position: 1, at: 1 }).media, null, 'no playback for a PDF');
});

test('zoom: the teacher’s zoom and pan reach the student, only for the current page; a late joiner gets the last one', async () => {
  const t = await setup();
  try {
    const teacher = t.connect('t1');
    const student = t.connect('s2');
    await teacher.next('state');
    await student.next('state');
    teacher.send({ t: 'op', id: 'show', op: { type: 'show', material: { id: 1 }, page: 2 } });
    await student.next('op');

    teacher.send({ t: 'view', key: 'm1:2', s: 2.5, x: -0.3, y: 0.12 });
    assert.deepEqual(await student.next('view'), { t: 'view', key: 'm1:2', s: 2.5, x: -0.3, y: 0.12 });
    await assert.rejects(teacher.next('view', 200), 'not echoed back');

    teacher.send({ t: 'view', key: 'm1:5', s: 2, x: 0, y: 0 });
    student.send({ t: 'view', key: 'm1:2', s: 3, x: 0, y: 0 });
    teacher.send({ t: 'view', key: 'm1:2', s: 'big', x: 0, y: 0 });
    await assert.rejects(student.next('view', 200), 'other page, student and broken views are dropped');
    await assert.rejects(teacher.next('view', 200), 'student cannot steer the teacher');

    teacher.send({ t: 'view', key: 'm1:2', s: 99, x: 50, y: -50 });
    assert.deepEqual(await student.next('view'), { t: 'view', key: 'm1:2', s: 4, x: 4, y: -4 }, 'clamped');

    const late = t.connect('s2');
    await late.next('state');
    assert.deepEqual(await late.next('view'), { t: 'view', key: 'm1:2', s: 4, x: 4, y: -4 });
    for (const c of [teacher, student, late]) c.ws.close();
  } finally {
    await t.close();
  }
});
