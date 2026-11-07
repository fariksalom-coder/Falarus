/**
 * O'QITUVCHI TESTLARI VA UY VAZIFALARI.
 *
 *  - O'qituvchi testlar tuzadi (savol, A/B/V/G variantlar, to'g'ri javob, izoh). Test darsda doskaga
 *    chiqariladi (lessonRoom.service) yoki uy vazifasi qilib beriladi.
 *  - Uy vazifasi: test, lug'at ro'yxati yoki fayl (o'qituvchining materiali). Faqat shu o'qituvchi bilan
 *    darsi bo'lgan (yoki bo'ladigan) o'quvchiga beriladi.
 *  - O'quvchi test javobini tanlaydi — server darhol to'g'ri/noto'g'ri va izohni qaytaradi; birinchi
 *    javob hisobga olinadi. Hammasi javob berilgach vazifa «bajarildi» bo'ladi.
 */
import { Router, type Request, type Response } from 'express';
import { pool } from '../lib/db.js';
import {
  HOMEWORK_KINDS, HOMEWORK_NOTE_MAX, HOMEWORK_TITLE_MAX, checkAnswer, normalizeTest, normalizeWords, publicQuestions,
  type HomeworkKind, type TestQuestion,
} from '../../shared/teacherTests.js';

export type TestQuery = (sql: string, params?: unknown[]) => Promise<{ rows: any[] }>;

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const poolQuery: TestQuery | null = pool ? (sql, params) => pool!.query(sql, params) : null;
const clean = (v: unknown, max: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/** Shu o'qituvchi bilan darsi bor o'quvchilar (pullik yoki sinov; bekor qilingan/to'lanmaganlar emas). */
const STUDENTS_SQL = `
  SELECT u.id, u.first_name, u.last_name, u.phone FROM users u WHERE u.id IN (
    SELECT student_user_id FROM teacher_lessons WHERE teacher_user_id = $1 AND status IN ('paid', 'disputed', 'completed')
    UNION
    SELECT student_user_id FROM teacher_trial_lessons WHERE teacher_user_id = $1 AND status NOT IN ('cancelled', 'refunded', 'pending_payment')
  ) ORDER BY u.first_name, u.last_name`;

const HOMEWORK_COLS = `h.id, h.teacher_user_id, h.student_user_id, h.kind, h.title, h.note, h.test_id, h.material_id, h.words,
  h.due_at, h.status, h.answers, h.score, h.total, h.seen_at, h.done_at, h.created_at, h.updated_at,
  jsonb_array_length(COALESCE(h.questions, '[]'::jsonb)) AS question_count`;

function shapeHomework(r: any) {
  return {
    id: Number(r.id),
    kind: r.kind as HomeworkKind,
    title: r.title,
    note: r.note ?? '',
    test_id: r.test_id == null ? null : Number(r.test_id),
    material_id: r.material_id == null ? null : Number(r.material_id),
    words: Array.isArray(r.words) ? r.words : null,
    due_at: r.due_at,
    status: r.status,
    answered: r.answers && typeof r.answers === 'object' ? Object.keys(r.answers).length : 0,
    score: r.score == null ? null : Number(r.score),
    total: r.total == null ? null : Number(r.total),
    question_count: Number(r.question_count) || 0,
    seen_at: r.seen_at,
    done_at: r.done_at,
    created_at: r.created_at,
    ...(r.student_first_name !== undefined ? { student: { id: Number(r.student_user_id), first_name: r.student_first_name, last_name: r.student_last_name } } : {}),
    ...(r.teacher_first_name !== undefined ? { teacher: { id: Number(r.teacher_user_id), first_name: r.teacher_first_name, last_name: r.teacher_last_name } } : {}),
    ...(r.material_title !== undefined && r.material_id != null
      ? { material: { id: Number(r.material_id), title: r.material_title, kind: r.material_kind, page_count: r.material_page_count == null ? null : Number(r.material_page_count), status: r.material_status } }
      : {}),
  };
}

export function createTeacherTestRoutes(authenticate: (req: any, res: any, next: any) => void, deps: { q?: TestQuery | null } = {}): Router {
  const q = deps.q === undefined ? poolQuery : deps.q;
  const router = Router();
  const h = (fn: (req: any, res: Response) => Promise<unknown>) => (req: Request, res: Response) =>
    fn(req, res).catch((e) => {
      if (e instanceof HttpError) return res.status(e.status).json({ error: e.message });
      console.error('[teacher-tests]', e);
      res.status(500).json({ error: 'Server xatosi, qayta urinib koʻring' });
    });
  const db = () => { if (!q) throw new HttpError(503, 'Baza ulanmagan'); return q; };

  async function teacherId(req: any) {
    const u = (await db()('SELECT account_type FROM users WHERE id = $1', [Number(req.userId)])).rows[0];
    if (u?.account_type !== 'teacher') throw new HttpError(403, 'Bu boʻlim faqat oʻqituvchilar uchun');
    return Number(req.userId);
  }

  async function ownTest(req: any, id = Number(req.params.id)) {
    const tid = await teacherId(req);
    const t = (await db()('SELECT id, title, questions, created_at, updated_at FROM teacher_tests WHERE id = $1 AND teacher_user_id = $2', [id, tid])).rows[0];
    if (!t) throw new HttpError(404, 'Test topilmadi');
    return { teacher: tid, test: { ...t, id: Number(t.id), questions: Array.isArray(t.questions) ? t.questions : [] } };
  }

  /* ───────────── testlar (o'qituvchi) ───────────── */

  router.get('/teacher/tests', authenticate, h(async (req, res) => {
    const tid = await teacherId(req);
    const rows = (await db()(`SELECT id, title, jsonb_array_length(questions) AS question_count, created_at, updated_at
      FROM teacher_tests WHERE teacher_user_id = $1 ORDER BY updated_at DESC`, [tid])).rows;
    res.json({ tests: rows.map((r) => ({ ...r, id: Number(r.id), question_count: Number(r.question_count) || 0 })) });
  }));

  router.get('/teacher/tests/:id', authenticate, h(async (req, res) => {
    res.json((await ownTest(req)).test);
  }));

  router.post('/teacher/tests', authenticate, h(async (req, res) => {
    const tid = await teacherId(req);
    const t = normalizeTest(req.body);
    if (typeof t === 'string') throw new HttpError(400, t);
    const count = Number((await db()('SELECT count(*) AS n FROM teacher_tests WHERE teacher_user_id = $1', [tid])).rows[0]?.n) || 0;
    if (count >= 500) throw new HttpError(409, 'Testlar juda koʻp — keraksizlarini oʻchiring');
    const row = (await db()(`INSERT INTO teacher_tests (teacher_user_id, title, questions) VALUES ($1, $2, $3::jsonb)
      RETURNING id, title, questions, created_at, updated_at`, [tid, t.title, JSON.stringify(t.questions)])).rows[0];
    res.status(201).json({ ...row, id: Number(row.id) });
  }));

  router.put('/teacher/tests/:id', authenticate, h(async (req, res) => {
    const { teacher, test } = await ownTest(req);
    const t = normalizeTest(req.body);
    if (typeof t === 'string') throw new HttpError(400, t);
    const row = (await db()(`UPDATE teacher_tests SET title = $3, questions = $4::jsonb, updated_at = now()
      WHERE id = $1 AND teacher_user_id = $2 RETURNING id, title, questions, created_at, updated_at`,
    [test.id, teacher, t.title, JSON.stringify(t.questions)])).rows[0];
    res.json({ ...row, id: Number(row.id) });
  }));

  router.delete('/teacher/tests/:id', authenticate, h(async (req, res) => {
    const { teacher, test } = await ownTest(req);
    await db()('DELETE FROM teacher_tests WHERE id = $1 AND teacher_user_id = $2', [test.id, teacher]);
    res.json({ ok: true });
  }));

  /* ───────────── uy vazifalari (o'qituvchi) ───────────── */

  router.get('/teacher/homework-students', authenticate, h(async (req, res) => {
    const tid = await teacherId(req);
    const rows = (await db()(STUDENTS_SQL, [tid])).rows;
    res.json({ students: rows.map((r) => ({ id: Number(r.id), first_name: r.first_name, last_name: r.last_name })) });
  }));

  router.get('/teacher/homework', authenticate, h(async (req, res) => {
    const tid = await teacherId(req);
    const student = Number(req.query.student) || null;
    const rows = (await db()(`SELECT ${HOMEWORK_COLS}, s.first_name AS student_first_name, s.last_name AS student_last_name
      FROM teacher_homework h JOIN users s ON s.id = h.student_user_id
      WHERE h.teacher_user_id = $1 AND ($2::int IS NULL OR h.student_user_id = $2)
      ORDER BY h.created_at DESC LIMIT 300`, [tid, student])).rows;
    res.json({ homework: rows.map(shapeHomework) });
  }));

  router.post('/teacher/homework', authenticate, h(async (req, res) => {
    const tid = await teacherId(req);
    const b = req.body ?? {};
    const studentId = Number(b.student_id);
    const kind = String(b.kind) as HomeworkKind;
    if (!HOMEWORK_KINDS.includes(kind)) throw new HttpError(400, 'Vazifa turini tanlang');
    const students = (await db()(STUDENTS_SQL, [tid])).rows.map((r) => Number(r.id));
    if (!students.includes(studentId)) throw new HttpError(403, 'Faqat oʻz oʻquvchingizga vazifa bera olasiz');
    let title = clean(b.title, HOMEWORK_TITLE_MAX);
    const note = String(b.note ?? '').trim().slice(0, HOMEWORK_NOTE_MAX);
    const due = b.due_at ? new Date(String(b.due_at)) : null;
    if (due && Number.isNaN(due.getTime())) throw new HttpError(400, 'Muddat notoʻgʻri');
    let testId: number | null = null;
    let questions: TestQuestion[] | null = null;
    let materialId: number | null = null;
    let words: ReturnType<typeof normalizeWords> | null = null;
    if (kind === 'test') {
      const t = (await ownTest(req, Number(b.test_id))).test;
      testId = t.id;
      questions = t.questions;
      title = title || t.title;
    } else if (kind === 'words') {
      words = normalizeWords(b.words);
      if (!words.length) throw new HttpError(400, 'Kamida bitta soʻz yozing');
      title = title || 'Soʻzlarni yodlash';
    } else {
      const m = (await db()(`SELECT id, title, status FROM teacher_materials WHERE id = $1 AND teacher_user_id = $2`, [Number(b.material_id), tid])).rows[0];
      if (!m) throw new HttpError(404, 'Material topilmadi');
      if (m.status !== 'ready') throw new HttpError(409, 'Material hali tayyorlanmoqda');
      materialId = Number(m.id);
      title = title || m.title;
    }
    const row = (await db()(`INSERT INTO teacher_homework (teacher_user_id, student_user_id, kind, title, note, test_id, questions, material_id, words, due_at, total)
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9::jsonb, $10, $11) RETURNING id`,
    [tid, studentId, kind, title, note, testId, questions ? JSON.stringify(questions) : null, materialId, words ? JSON.stringify(words) : null,
      due ? due.toISOString() : null, questions ? questions.length : null])).rows[0];
    const full = (await db()(`SELECT ${HOMEWORK_COLS}, s.first_name AS student_first_name, s.last_name AS student_last_name
      FROM teacher_homework h JOIN users s ON s.id = h.student_user_id WHERE h.id = $1`, [row.id])).rows[0];
    res.status(201).json(shapeHomework(full));
  }));

  router.delete('/teacher/homework/:id', authenticate, h(async (req, res) => {
    const tid = await teacherId(req);
    const r = await db()('DELETE FROM teacher_homework WHERE id = $1 AND teacher_user_id = $2 RETURNING id', [Number(req.params.id), tid]);
    if (!r.rows[0]) throw new HttpError(404, 'Vazifa topilmadi');
    res.json({ ok: true });
  }));

  /** O'qituvchi o'quvchining test javoblarini ko'radi. */
  router.get('/teacher/homework/:id', authenticate, h(async (req, res) => {
    const tid = await teacherId(req);
    const r = (await db()(`SELECT ${HOMEWORK_COLS}, h.questions AS questions_full, s.first_name AS student_first_name, s.last_name AS student_last_name
      FROM teacher_homework h JOIN users s ON s.id = h.student_user_id WHERE h.id = $1 AND h.teacher_user_id = $2`, [Number(req.params.id), tid])).rows[0];
    if (!r) throw new HttpError(404, 'Vazifa topilmadi');
    res.json({ ...shapeHomework(r), questions: Array.isArray(r.questions_full) ? r.questions_full : null, answers: r.answers ?? {} });
  }));

  /* ───────────── uy vazifalari (o'quvchi) ───────────── */

  const STUDENT_SELECT = `SELECT ${HOMEWORK_COLS}, h.questions AS questions_full,
      t.first_name AS teacher_first_name, t.last_name AS teacher_last_name,
      m.title AS material_title, m.kind AS material_kind, m.page_count AS material_page_count, m.status AS material_status
    FROM teacher_homework h JOIN users t ON t.id = h.teacher_user_id LEFT JOIN teacher_materials m ON m.id = h.material_id`;

  async function myHomework(req: any) {
    const r = (await db()(`${STUDENT_SELECT} WHERE h.id = $1 AND h.student_user_id = $2`, [Number(req.params.id), Number(req.userId)])).rows[0];
    if (!r) throw new HttpError(404, 'Vazifa topilmadi');
    return r;
  }

  /** O'quvchiga: savollar to'g'ri javobsiz, berilgan javoblar esa natijasi bilan. */
  function studentView(r: any) {
    const questions: TestQuestion[] = Array.isArray(r.questions_full) ? r.questions_full : [];
    return {
      ...shapeHomework(r),
      questions: r.kind === 'test' ? publicQuestions(questions) : null,
      answers: r.answers ?? {},
    };
  }

  router.get('/my-homework', authenticate, h(async (req, res) => {
    const rows = (await db()(`${STUDENT_SELECT} WHERE h.student_user_id = $1 ORDER BY (h.status = 'done'), h.created_at DESC LIMIT 200`, [Number(req.userId)])).rows;
    res.json({ homework: rows.map(shapeHomework), new_count: rows.filter((r) => !r.seen_at).length });
  }));

  router.get('/my-homework/:id', authenticate, h(async (req, res) => {
    const r = await myHomework(req);
    if (!r.seen_at) await db()('UPDATE teacher_homework SET seen_at = now() WHERE id = $1', [r.id]);
    res.json(studentView(r));
  }));

  router.post('/my-homework/:id/answer', authenticate, h(async (req, res) => {
    const r = await myHomework(req);
    if (r.kind !== 'test') throw new HttpError(400, 'Bu test emas');
    const questions: TestQuestion[] = Array.isArray(r.questions_full) ? r.questions_full : [];
    const qi = Math.floor(Number(req.body?.q));
    const result = checkAnswer(questions, qi, Math.floor(Number(req.body?.choice)));
    if (!result) throw new HttpError(400, 'Javob notoʻgʻri yuborildi');
    const answers = { ...(r.answers ?? {}) };
    // Birinchi javob hisobga olinadi — qayta bosish natijani o'zgartirmaydi.
    if (answers[qi]) return res.json({ ...answers[qi], already: true });
    answers[qi] = result;
    const answered = Object.keys(answers).length;
    const score = Object.values(answers).filter((a: any) => a?.correct).length;
    const done = answered >= questions.length;
    await db()(`UPDATE teacher_homework SET answers = $2::jsonb, score = $3, total = $4,
      status = CASE WHEN $5 THEN 'done' ELSE status END, done_at = CASE WHEN $5 AND done_at IS NULL THEN now() ELSE done_at END,
      updated_at = now() WHERE id = $1`, [r.id, JSON.stringify(answers), score, questions.length, done]);
    res.json({ ...result, score, total: questions.length, done });
  }));

  router.post('/my-homework/:id/done', authenticate, h(async (req, res) => {
    const r = await myHomework(req);
    if (r.kind === 'test') throw new HttpError(400, 'Test barcha savollarga javob berilganda oʻzi yakunlanadi');
    await db()(`UPDATE teacher_homework SET status = 'done', done_at = COALESCE(done_at, now()), updated_at = now() WHERE id = $1`, [r.id]);
    res.json({ ok: true });
  }));

  return router;
}
