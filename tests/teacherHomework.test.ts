import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createTeacherTestRoutes } from '../server/routes/teacherTestRoutes';

async function setup() {
  const db = await PGlite.create();
  await db.exec(`
    CREATE TABLE users (id integer PRIMARY KEY, account_type text, first_name text, last_name text, phone text);
    CREATE TABLE teacher_lessons (id bigserial PRIMARY KEY, teacher_user_id integer, student_user_id integer, starts_at timestamptz, ends_at timestamptz, status text);
    CREATE TABLE teacher_trial_lessons (id bigserial PRIMARY KEY, teacher_user_id integer, student_user_id integer, status text, scheduled_starts_at timestamptz, scheduled_ends_at timestamptz);
    INSERT INTO users VALUES (1, 'teacher', 'Ustoz', 'Bir', null), (2, 'student', 'Ali', 'Valiyev', null), (3, 'student', 'Begona', 'Oquvchi', null);
    INSERT INTO teacher_lessons (teacher_user_id, student_user_id, starts_at, ends_at, status) VALUES (1, 2, now(), now() + interval '50 minutes', 'paid');
  `);
  await db.exec(await readFile('db/migrations/218_teacher_lesson_materials.sql', 'utf8'));
  await db.exec(await readFile('db/migrations/219_teacher_material_pages.sql', 'utf8'));
  await db.exec(await readFile('db/migrations/227_teacher_tests_homework.sql', 'utf8'));
  const app = express();
  app.use(express.json());
  // Sinov: foydalanuvchi sarlavhadan.
  app.use('/api', createTeacherTestRoutes((req, _res, next) => { req.userId = Number(req.headers['x-user']); next(); }, { q: (sql, p) => db.query(sql, p) }));
  const server = http.createServer(app);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;
  const call = async (user: number, method: string, path: string, body?: unknown) => {
    const res = await fetch(base + path, { method, headers: { 'x-user': String(user), 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, data: await res.json() as any };
  };
  return { call, close: async () => { await new Promise<void>((r) => server.close(() => r())); await db.close(); } };
}

test('teacher builds a test and gives it as homework; the student answers, gets right/wrong at once, the test completes', async () => {
  const t = await setup();
  try {
    assert.equal((await t.call(1, 'POST', '/teacher/tests', { title: 'X', questions: [{ text: 'Q', options: ['a', 'b'], correct: -1 }] })).status, 400, 'right answer required');
    const made = await t.call(1, 'POST', '/teacher/tests', {
      title: 'Salom', questions: [
        { text: 'Привет?', options: ['Salom', 'Xayr', ''], correct: 0, explanation: 'Привет = Salom' },
        { text: 'Спасибо?', options: ['Rahmat', 'Salom'], correct: 0 },
      ],
    });
    assert.equal(made.status, 201);
    assert.equal(made.data.questions[0].options.length, 2, 'empty options dropped');
    assert.equal((await t.call(2, 'GET', '/teacher/tests')).status, 403, 'students cannot see teacher tests');

    assert.deepEqual((await t.call(1, 'GET', '/teacher/homework-students')).data.students.map((s: any) => s.id), [2]);
    assert.equal((await t.call(1, 'POST', '/teacher/homework', { student_id: 3, kind: 'test', test_id: made.data.id })).status, 403, 'not their student');
    const hw = await t.call(1, 'POST', '/teacher/homework', { student_id: 2, kind: 'test', test_id: made.data.id, note: '1-darsdan keyin' });
    assert.equal(hw.status, 201);

    const mine = await t.call(2, 'GET', '/my-homework');
    assert.equal(mine.data.homework.length, 1);
    assert.equal(mine.data.new_count, 1);
    const detail = await t.call(2, 'GET', `/my-homework/${hw.data.id}`);
    assert.equal(JSON.stringify(detail.data.questions).includes('correct'), false, 'student does not get the answers');
    assert.equal((await t.call(3, 'GET', `/my-homework/${hw.data.id}`)).status, 404, 'other students cannot open it');

    const wrong = await t.call(2, 'POST', `/my-homework/${hw.data.id}/answer`, { q: 0, choice: 1 });
    assert.deepEqual([wrong.data.correct, wrong.data.right, wrong.data.explanation, wrong.data.done], [false, 0, 'Привет = Salom', false]);
    const again = await t.call(2, 'POST', `/my-homework/${hw.data.id}/answer`, { q: 0, choice: 0 });
    assert.equal(again.data.correct, false, 'the first answer counts');
    const last = await t.call(2, 'POST', `/my-homework/${hw.data.id}/answer`, { q: 1, choice: 0 });
    assert.deepEqual([last.data.correct, last.data.score, last.data.total, last.data.done], [true, 1, 2, true]);

    const seenByTeacher = await t.call(1, 'GET', `/teacher/homework/${hw.data.id}`);
    assert.equal(seenByTeacher.data.status, 'done');
    assert.equal(seenByTeacher.data.answers['0'].choice, 1);
  } finally {
    await t.close();
  }
});

test('word list and file homework: words are parsed, student marks them done', async () => {
  const t = await setup();
  try {
    const words = await t.call(1, 'POST', '/teacher/homework', { student_id: 2, kind: 'words', words: [{ ru: 'привет', uz: 'salom' }, { ru: '', uz: 'x' }] });
    assert.equal(words.status, 201);
    assert.equal(words.data.words.length, 1);
    assert.equal(words.data.title, 'Soʻzlarni yodlash');
    assert.equal((await t.call(1, 'POST', '/teacher/homework', { student_id: 2, kind: 'file', material_id: 999 })).status, 404);
    assert.equal((await t.call(2, 'POST', `/my-homework/${words.data.id}/done`)).status, 200);
    assert.equal((await t.call(2, 'GET', '/my-homework')).data.homework[0].status, 'done');
  } finally {
    await t.close();
  }
});

test('word list text: one pair per line with common separators', async () => {
  const { parseWordList } = await import('../shared/teacherTests');
  assert.deepEqual(parseWordList('привет — salom\nспасибо - rahmat\n\nдом: uy\nкошка\tmushuk\nсобака'), [
    { ru: 'привет', uz: 'salom' }, { ru: 'спасибо', uz: 'rahmat' }, { ru: 'дом', uz: 'uy' }, { ru: 'кошка', uz: 'mushuk' }, { ru: 'собака', uz: '' },
  ]);
});
