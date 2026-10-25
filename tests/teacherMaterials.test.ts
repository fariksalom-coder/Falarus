import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { createTeacherMaterialRoutes, sniffMaterial, type MaterialQuery } from '../server/routes/teacherMaterialRoutes';

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');
const DOCX = Buffer.concat([Buffer.from('PK\u0003\u0004', 'latin1'), Buffer.alloc(40)]);

async function setup() {
  const db = await PGlite.create();
  await db.exec(`
    CREATE TABLE users (id integer PRIMARY KEY, account_type text);
    CREATE TABLE teacher_lessons (id bigserial PRIMARY KEY, teacher_user_id integer, student_user_id integer,
      starts_at timestamptz, ends_at timestamptz, status text);
    CREATE TABLE teacher_trial_lessons (id bigserial PRIMARY KEY, teacher_user_id integer, student_user_id integer, status text,
      scheduled_starts_at timestamptz, scheduled_ends_at timestamptz);
    INSERT INTO users VALUES (1, 'teacher'), (2, 'student'), (3, 'student'), (4, 'teacher');
    -- 1: hozir ketayotgan dars, 2: ertaga, 3: to'lanmagan
    INSERT INTO teacher_lessons (teacher_user_id, student_user_id, starts_at, ends_at, status) VALUES
      (1, 2, now() - interval '5 minutes', now() + interval '45 minutes', 'paid'),
      (1, 2, now() + interval '1 day', now() + interval '1 day 50 minutes', 'paid'),
      (1, 2, now() - interval '5 minutes', now() + interval '45 minutes', 'pending_payment');
    INSERT INTO teacher_trial_lessons (teacher_user_id, student_user_id, status, scheduled_starts_at) VALUES (1, 3, 'scheduled', now());
  `);
  await db.exec(await readFile('db/migrations/218_teacher_lesson_materials.sql', 'utf8'));
  const q: MaterialQuery = (sql, params) => db.query(sql, params as unknown[]);
  const privateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'materials-'));
  let user = 1;
  const app = express();
  app.use(express.json());
  // Xona holati: test o'zi belgilaydi (undefined — xona xotirada yo'q, bazadan o'qiladi).
  const live = { material: undefined as number | null | undefined, deleted: [] as number[] };
  const room = () => ({ currentMaterialId: () => live.material, materialDeleted: (id: number) => { live.deleted.push(id); } }) as any;
  app.use('/api', createTeacherMaterialRoutes((req: any, _res: any, next: any) => { req.userId = user; next(); }, { q, privateDir, room }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;
  const call = async (method: string, p: string, body?: unknown) => {
    const r = await fetch(url + p, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await r.text();
    let data: any = text;
    try { data = JSON.parse(text); } catch { /* fayl */ }
    return { status: r.status, data, type: r.headers.get('content-type') };
  };
  const upload = async (buf: Buffer, name: string, title?: string) => {
    const f = new FormData();
    if (title) f.append('title', title);
    f.append('file', new Blob([buf]), name);
    const r = await fetch(`${url}/teacher/materials`, { method: 'POST', body: f });
    return { status: r.status, data: await r.json() as any };
  };
  const close = async () => {
    await new Promise<void>((r, j) => server.close((e) => (e ? j(e) : r())));
    await db.close();
    fs.rmSync(privateDir, { recursive: true, force: true });
  };
  return { q, call, upload, close, privateDir, live, as: (id: number) => { user = id; } };
}

test('file types are recognised by their bytes, office files get a hint', () => {
  assert.deepEqual(sniffMaterial(PDF), { kind: 'pdf', mime: 'application/pdf', ext: 'pdf' });
  assert.equal(sniffMaterial(DOCX), 'office');
  assert.equal((sniffMaterial(Buffer.from('\u0000\u0000\u0000\u0018ftypM4A \u0000', 'latin1')) as any).kind, 'audio');
  assert.equal((sniffMaterial(Buffer.from('\u0000\u0000\u0000\u0018ftypisom\u0000', 'latin1')) as any).kind, 'video');
  assert.equal(sniffMaterial(Buffer.from('hello world, plain')), null);
});

test('teacher library: upload, rename, delete; students and strangers are kept out', async () => {
  const t = await setup();
  try {
    const up = await t.upload(PDF, 'Dars_1 Salomlashish.pdf');
    assert.equal(up.status, 201, JSON.stringify(up.data));
    assert.equal(up.data.title, 'Dars 1 Salomlashish');
    assert.equal(up.data.kind, 'pdf');
    assert.equal((await t.upload(DOCX, 'slides.pptx')).status, 415);
    assert.equal((await t.upload(PDF, 'Урок 2 — глаголы.pdf')).data.title, 'Урок 2 — глаголы', 'utf-8 file names');

    const list = await t.call('GET', '/teacher/materials');
    assert.equal(list.data.materials.length, 2);
    assert.equal(list.data.used_bytes, PDF.length * 2);

    assert.equal((await t.call('PATCH', `/teacher/materials/${up.data.id}`, { title: '  Birinchi   dars ' })).data.title, 'Birinchi dars');
    const file = await t.call('GET', `/teacher/materials/${up.data.id}/file`);
    assert.equal(file.type, 'application/pdf');

    t.as(2);
    assert.equal((await t.call('GET', '/teacher/materials')).status, 403);
    t.as(4);
    assert.equal((await t.call('GET', `/teacher/materials/${up.data.id}/file`)).status, 404, 'another teacher');
    assert.equal((await t.call('DELETE', `/teacher/materials/${up.data.id}`)).status, 404);

    t.as(1);
    assert.equal((await t.call('DELETE', `/teacher/materials/${up.data.id}`)).status, 200);
    assert.equal(fs.readdirSync(path.join(t.privateDir, 'teacher-materials', '1')).length, 1, 'file removed from disk');
  } finally {
    await t.close();
  }
});

test('board file: only participants, only while the room is open, only the material that is on the board', async () => {
  const t = await setup();
  try {
    const m = (await t.upload(PDF, 'grammatika.pdf')).data;
    const file = (p: string) => t.call('GET', p);

    t.as(2);
    assert.equal((await file('/lesson-board/lesson/1/file')).status, 404, 'nothing on the board yet');

    // Holat bazada (xona xotirada emas).
    await t.q(`INSERT INTO teacher_lesson_boards (lesson_kind, lesson_id, material_id, page) VALUES ('lesson', 1, $1, 3)`, [m.id]);
    assert.equal((await file('/lesson-board/lesson/1/file')).type, 'application/pdf');
    assert.equal((await file(`/lesson-board/lesson/1/file?material=${m.id}`)).status, 200);
    assert.equal((await file('/lesson-board/lesson/1/file?material=999')).status, 404, 'teacher already switched to another file');
    assert.equal((await t.call('GET', `/teacher/materials/${m.id}/file`)).status, 403, 'library itself stays closed');

    // Xona xotirada: uning holati ustun (bazaga yozuv kechikishi mumkin).
    t.live.material = null;
    assert.equal((await file('/lesson-board/lesson/1/file')).status, 404, 'board closed in the live room');
    t.live.material = m.id;
    assert.equal((await file('/lesson-board/lesson/1/file')).status, 200);

    t.as(3);
    assert.equal((await file('/lesson-board/lesson/1/file')).status, 404, 'not their lesson');
    t.as(2);
    assert.equal((await file('/lesson-board/lesson/2/file')).status, 425, 'tomorrow');
    assert.equal((await file('/lesson-board/lesson/3/file')).status, 409, 'unpaid');

    t.as(1);
    await t.call('DELETE', `/teacher/materials/${m.id}`);
    assert.deepEqual(t.live.deleted, [m.id], 'open rooms are told to clear the board');
  } finally {
    await t.close();
  }
});
