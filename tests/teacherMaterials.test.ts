import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { createTeacherMaterialRoutes, sniffMaterial, type MaterialQuery } from '../server/routes/teacherMaterialRoutes';
import { createMaterialPages } from '../server/services/materialPages.service';

/** Haqiqiy, ichida `pages` ta sahifa bor kichik PDF (pdfinfo/pdftoppm o'qiy oladi). */
function makePdf(pages: number): Buffer {
  const objs: string[] = [];
  const add = (o: string) => objs.push(o);
  add('<< /Type /Catalog /Pages 2 0 R >>');
  add(`<< /Type /Pages /Kids [${Array.from({ length: pages }, (_, i) => `${3 + i * 2} 0 R`).join(' ')}] /Count ${pages} >>`);
  for (let i = 0; i < pages; i++) {
    const stream = `0.15 0.39 0.92 rg 20 20 ${100 + i * 20} 60 re f`;
    add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 300] /Contents ${4 + i * 2} 0 R >>`);
    add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  }
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

const PDF = makePdf(4);
const BROKEN_PDF = Buffer.from('%PDF-1.4\nthis is not really a pdf');
const ZIP_HEAD = Buffer.concat([Buffer.from('PK\u0003\u0004', 'latin1'), Buffer.alloc(40)]);
const hasPoppler = (() => { try { execFileSync('pdftoppm', ['-v'], { stdio: 'ignore' }); return true; } catch { return false; } })();

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
  await db.exec(await readFile('db/migrations/219_teacher_material_pages.sql', 'utf8'));
  const q: MaterialQuery = (sql, params) => db.query(sql, params as unknown[]);
  const privateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'materials-'));

  // LibreOffice o'rniga: --outdir ga 3 sahifali PDF yozadigan kichik skript (haqiqiy aylantirish prodda sinaladi).
  const fakeSoffice = path.join(privateDir, 'fake-soffice.sh');
  const fixture = path.join(privateDir, 'fixture.pdf');
  fs.writeFileSync(fixture, makePdf(3));
  fs.writeFileSync(fakeSoffice, `#!/bin/sh
out=""; prev=""; for a in "$@"; do [ "$prev" = "--outdir" ] && out="$a"; prev="$a"; last="$a"; done
name=$(basename "$last"); cp "${fixture}" "$out/\${name%.*}.pdf"
`, { mode: 0o755 });
  const pages = createMaterialPages({ q, privateDir, bin: { soffice: fakeSoffice } });

  let user = 1;
  const app = express();
  app.use(express.json());
  // Xona holati: test o'zi belgilaydi (undefined — xona xotirada yo'q, bazadan o'qiladi).
  const live = { material: undefined as number | null | undefined, deleted: [] as number[] };
  const room = () => ({ currentMaterialId: () => live.material, materialDeleted: (id: number) => { live.deleted.push(id); } }) as any;
  app.use('/api', createTeacherMaterialRoutes((req: any, _res: any, next: any) => { req.userId = user; next(); }, { q, privateDir, room, pages }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;
  const call = async (method: string, p: string, body?: unknown) => {
    const r = await fetch(url + p, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    const buf = Buffer.from(await r.arrayBuffer());
    let data: any = buf;
    try { data = JSON.parse(buf.toString()); } catch { /* fayl */ }
    return { status: r.status, data, type: r.headers.get('content-type'), cache: r.headers.get('cache-control') };
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

test('file types are recognised by their bytes, office files go to conversion', () => {
  assert.deepEqual(sniffMaterial(PDF), { kind: 'pdf', mime: 'application/pdf', ext: 'pdf' });
  assert.equal(sniffMaterial(ZIP_HEAD), 'office');
  assert.equal((sniffMaterial(Buffer.from('OggS\u0000\u0002', 'latin1')) as any).kind, 'audio');
  assert.equal((sniffMaterial(Buffer.from('\u0000\u0000\u0000\u0018ftypM4A \u0000', 'latin1')) as any).kind, 'audio');
  assert.equal((sniffMaterial(Buffer.from('\u0000\u0000\u0000\u0018ftypisom\u0000', 'latin1')) as any).kind, 'video');
  assert.equal(sniffMaterial(Buffer.from('hello world, plain')), null);
});

test('teacher library: upload, rename, delete; students and strangers are kept out', { skip: !hasPoppler && 'pdfinfo yoʻq' }, async () => {
  const t = await setup();
  try {
    const up = await t.upload(PDF, 'Dars_1 Salomlashish.pdf');
    assert.equal(up.status, 201, JSON.stringify(up.data));
    assert.equal(up.data.title, 'Dars 1 Salomlashish');
    assert.equal(up.data.kind, 'pdf');
    assert.equal(up.data.page_count, 4);
    assert.equal(up.data.status, 'ready');
    assert.equal((await t.upload(ZIP_HEAD, 'jadval.xlsx')).status, 415, 'Excel is not accepted');
    assert.equal((await t.upload(BROKEN_PDF, 'buzuq.pdf')).status, 415, 'unreadable PDF');
    assert.equal((await t.upload(PDF, 'Урок 2 — глаголы.pdf')).data.title, 'Урок 2 — глаголы', 'utf-8 file names');

    const list = await t.call('GET', '/teacher/materials');
    assert.equal(list.data.materials.length, 2);
    assert.equal(list.data.used_bytes, PDF.length * 2);

    assert.equal((await t.call('PATCH', `/teacher/materials/${up.data.id}`, { title: '  Birinchi   dars ' })).data.title, 'Birinchi dars');
    assert.equal((await t.call('GET', `/teacher/materials/${up.data.id}/file`)).type, 'application/pdf');

    t.as(2);
    assert.equal((await t.call('GET', '/teacher/materials')).status, 403);
    t.as(4);
    assert.equal((await t.call('GET', `/teacher/materials/${up.data.id}/file`)).status, 404, 'another teacher');
    assert.equal((await t.call('DELETE', `/teacher/materials/${up.data.id}`)).status, 404);

    t.as(1);
    assert.equal((await t.call('GET', `/teacher/materials/${up.data.id}/page/1?w=480`)).status, 200);
    assert.equal((await t.call('DELETE', `/teacher/materials/${up.data.id}`)).status, 200);
    const left = fs.readdirSync(path.join(t.privateDir, 'teacher-materials', '1'));
    assert.equal(left.length, 1, 'file and its page images removed from disk');
  } finally {
    await t.close();
  }
});

test('pages are light WebP images, one page at a time, cached on disk', { skip: !hasPoppler && 'pdftoppm yoʻq' }, async () => {
  const t = await setup();
  try {
    const m = (await t.upload(PDF, 'kitob.pdf')).data;
    const page = await t.call('GET', `/teacher/materials/${m.id}/page/3?w=900`);
    assert.equal(page.status, 200, JSON.stringify(page.data));
    assert.equal(page.type, 'image/webp');
    assert.match(String(page.cache), /max-age/);
    assert.ok(page.data.length > 100 && page.data.length < 200_000);
    const cached = path.join(t.privateDir, 'teacher-materials', '1');
    const pagesDir = fs.readdirSync(cached).find((f) => f.endsWith('.pages'))!;
    assert.deepEqual(fs.readdirSync(path.join(cached, pagesDir)), ['w1280'], 'width snapped to a standard size');
    assert.equal((await t.call('GET', `/teacher/materials/${m.id}/page/5`)).status, 404, 'past the last page');
    assert.equal((await t.call('GET', `/teacher/materials/${m.id}/page/0`)).status, 404);
  } finally {
    await t.close();
  }
});

test('PowerPoint is converted to PDF in the background', { skip: !hasPoppler && 'pdfinfo yoʻq' }, async () => {
  const t = await setup();
  try {
    const up = await t.upload(ZIP_HEAD, 'Taqdimot.pptx');
    assert.equal(up.status, 201, JSON.stringify(up.data));
    assert.equal(up.data.status, 'processing');
    assert.equal(up.data.source_kind, 'pptx');
    assert.equal((await t.call('GET', `/teacher/materials/${up.data.id}/page/1`)).status, 409, 'not ready yet');

    let m = up.data;
    for (let i = 0; i < 50 && m.status === 'processing'; i++) {
      await new Promise((r) => setTimeout(r, 100));
      m = (await t.call('GET', `/teacher/materials/${up.data.id}`)).data;
    }
    assert.equal(m.status, 'ready', JSON.stringify(m));
    assert.equal(m.kind, 'pdf');
    assert.equal(m.page_count, 3);
    assert.equal(m.title, 'Taqdimot');
    const files = fs.readdirSync(path.join(t.privateDir, 'teacher-materials', '1'));
    assert.ok(files.some((f) => f.endsWith('.pdf')) && !files.some((f) => f.endsWith('.pptx')), 'original replaced by the PDF');
  } finally {
    await t.close();
  }
});

test('materials prepared for a lesson: only the lesson’s teacher, only own materials', { skip: !hasPoppler && 'pdfinfo yoʻq' }, async () => {
  const t = await setup();
  try {
    const a = (await t.upload(PDF, 'a.pdf')).data;
    const b = (await t.upload(PDF, 'b.pdf')).data;
    t.as(4);
    const foreign = (await t.upload(PDF, 'begona.pdf')).data;
    assert.equal((await t.call('GET', '/teacher/lesson-materials/lesson/2')).status, 404, 'not their lesson');

    t.as(1);
    const saved = await t.call('PUT', '/teacher/lesson-materials/lesson/2', { material_ids: [b.id, a.id, foreign.id, b.id] });
    assert.deepEqual(saved.data.material_ids, [b.id, a.id], 'order kept, duplicates and foreign files dropped');
    assert.deepEqual((await t.call('GET', '/teacher/lesson-materials/lesson/2')).data.material_ids, [b.id, a.id]);
    await t.call('DELETE', `/teacher/materials/${a.id}`);
    assert.deepEqual((await t.call('GET', '/teacher/lesson-materials/lesson/2')).data.material_ids, [b.id], 'deleted material leaves the list');
    t.as(2);
    assert.equal((await t.call('GET', '/teacher/lesson-materials/lesson/2')).status, 403, 'students cannot read it');
  } finally {
    await t.close();
  }
});

test('board file and pages: only participants, only while the room is open, only the material on the board', { skip: !hasPoppler && 'pdftoppm yoʻq' }, async () => {
  const t = await setup();
  try {
    const m = (await t.upload(PDF, 'grammatika.pdf')).data;
    const get = (p: string) => t.call('GET', p);

    t.as(2);
    assert.equal((await get('/lesson-board/lesson/1/file')).status, 404, 'nothing on the board yet');

    // Holat bazada (xona xotirada emas).
    await t.q(`INSERT INTO teacher_lesson_boards (lesson_kind, lesson_id, material_id, page) VALUES ('lesson', 1, $1, 3)`, [m.id]);
    assert.equal((await get('/lesson-board/lesson/1/file')).type, 'application/pdf');
    assert.equal((await get(`/lesson-board/lesson/1/page/2?material=${m.id}&w=480`)).type, 'image/webp');
    assert.equal((await get('/lesson-board/lesson/1/page/2?material=999')).status, 404, 'teacher already switched to another file');
    assert.equal((await get(`/teacher/materials/${m.id}/file`)).status, 403, 'library itself stays closed');

    // Xona xotirada: uning holati ustun (bazaga yozuv kechikishi mumkin).
    t.live.material = null;
    assert.equal((await get('/lesson-board/lesson/1/file')).status, 404, 'board closed in the live room');
    t.live.material = m.id;
    assert.equal((await get('/lesson-board/lesson/1/file')).status, 200);

    t.as(3);
    assert.equal((await get('/lesson-board/lesson/1/file')).status, 404, 'not their lesson');
    t.as(2);
    assert.equal((await get('/lesson-board/lesson/2/file')).status, 425, 'tomorrow');
    assert.equal((await get('/lesson-board/lesson/3/file')).status, 409, 'unpaid');

    t.as(1);
    await t.call('DELETE', `/teacher/materials/${m.id}`);
    assert.deepEqual(t.live.deleted, [m.id], 'open rooms are told to clear the board');
  } finally {
    await t.close();
  }
});
