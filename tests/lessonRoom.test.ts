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
      const timer = setTimeout(() => bad(new Error(`no ${t}`)), ms);
      waiters.push({ t, ok: (m) => { clearTimeout(timer); ok(m as Extract<ServerMessage, { t: T }>); } });
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
