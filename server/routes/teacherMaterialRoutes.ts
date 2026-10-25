/**
 * DARS MATERIALLARI VA DARS DOSKASI.
 *
 * O'qituvchi o'z kutubxonasiga PDF, PowerPoint/Word (serverda PDF ga aylanadi), rasm, audio va
 * video yuklaydi (private-uploads/, ommaviy havolasiz) va ularni istalgan darsda qayta ishlatadi.
 * Darsga oldindan biriktirib qo'yishi ham mumkin («Shu dars uchun»).
 *
 * PDF va rasm sahifama-sahifa yengil WebP bo'lib beriladi — telefon butun kitobni yuklamaydi.
 * O'quvchi faylni faqat o'zi qatnashgan darsda, xona ochiq paytda va faqat hozir doskada turgan
 * materialni ola oladi. Doskani boshqarish — real vaqt kanalida (server/services/lessonRoom.service.ts).
 */
import { Router, type Request, type Response } from 'express';
import Busboy from 'busboy';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pool } from '../lib/db.js';
import { checkLessonAccess, LessonAccessError, lessonTeacherId, parseLessonKind } from '../services/lessonRoomAccess.js';
import type { LessonRoomServer } from '../services/lessonRoom.service.js';
import { createMaterialPages, pageWidthFor, pagesDirOf, type MaterialPages } from '../services/materialPages.service.js';
import {
  MATERIAL_MAX_BYTES, MATERIAL_QUOTA_BYTES, MATERIAL_TITLE_MAX, OFFICE_EXTENSIONS, normalizeMaterialTitle, type MaterialKind,
} from '../../shared/teacherMaterials.js';

export type MaterialQuery = (sql: string, params?: unknown[]) => Promise<{ rows: any[] }>;
export type MaterialDeps = {
  q?: MaterialQuery | null;
  privateDir?: string;
  /** Real vaqt xonalari: doskadagi materialni bilish va o'chirilgan materialni doskadan tushirish. */
  room?: () => LessonRoomServer | null;
  /** Sahifa rasmlari va PowerPoint/Word aylantirish (sinovlarda almashtiriladi). */
  pages?: MaterialPages;
};

const poolQuery: MaterialQuery | null = pool ? (sql, params) => pool!.query(sql, params) : null;

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const MATERIAL_COLS = 'id, title, kind, mime, size_bytes, original_name, status, page_count, error, source_kind, created_at, updated_at';
const shapeMaterial = (r: any) => ({ ...r, size_bytes: Number(r.size_bytes), page_count: r.page_count == null ? null : Number(r.page_count) });

/** Fayl turi birinchi baytlardan aniqlanadi — brauzer yuborgan `Content-Type` ga ishonilmaydi. */
export function sniffMaterial(head: Buffer): { kind: MaterialKind; mime: string; ext: string } | 'office' | null {
  const ascii = (from: number, to: number) => head.subarray(from, to).toString('latin1');
  if (ascii(0, 5) === '%PDF-') return { kind: 'pdf', mime: 'application/pdf', ext: 'pdf' };
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return { kind: 'image', mime: 'image/jpeg', ext: 'jpg' };
  if (head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { kind: 'image', mime: 'image/png', ext: 'png' };
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return { kind: 'image', mime: 'image/webp', ext: 'webp' };
  if (ascii(0, 4) === 'GIF8') return { kind: 'image', mime: 'image/gif', ext: 'gif' };
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE') return { kind: 'audio', mime: 'audio/wav', ext: 'wav' };
  if (ascii(0, 3) === 'ID3' || (head[0] === 0xff && (head[1] & 0xe0) === 0xe0)) return { kind: 'audio', mime: 'audio/mpeg', ext: 'mp3' };
  if (ascii(0, 4) === 'OggS') return { kind: 'audio', mime: 'audio/ogg', ext: 'ogg' };
  if (ascii(4, 8) === 'ftyp') {
    const brand = ascii(8, 12);
    if (brand === 'M4A ' || brand === 'M4B ') return { kind: 'audio', mime: 'audio/mp4', ext: 'm4a' };
    if (brand === 'qt  ') return { kind: 'video', mime: 'video/quicktime', ext: 'mov' };
    return { kind: 'video', mime: 'video/mp4', ext: 'mp4' };
  }
  if (head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) return { kind: 'video', mime: 'video/webm', ext: 'webm' };
  // PowerPoint/Word (zip yoki eski OLE) — serverda PDF ga aylantiriladi.
  if (ascii(0, 4) === 'PK\u0003\u0004' || head.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))) return 'office';
  return null;
}

/**
 * Bitta faylni to'g'ridan-to'g'ri diskka oqizadi (100 MB gacha — xotiraga yig'ilmaydi).
 * Chegaradan oshsa yoki ulanish uzilsa, chala fayl o'chiriladi.
 */
function receiveFile(req: Request, tmpPath: string, maxBytes: number): Promise<{ name: string; size: number; head: Buffer; fields: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    let bb: ReturnType<typeof Busboy>;
    // defParamCharset: brauzer fayl nomini UTF-8 da yuboradi (kirill, «—»); busboy aks holda latin1 deb o'qiydi.
    try { bb = Busboy({ headers: req.headers, defParamCharset: 'utf8', limits: { files: 1, fileSize: maxBytes, fields: 5 } }); }
    catch { return reject(new HttpError(400, 'Fayl yuborilmadi')); }
    const fields: Record<string, string> = {};
    let got: Promise<{ name: string; size: number; head: Buffer }> | null = null;
    let tooBig = false;
    const fail = (e: unknown) => { fs.rmSync(tmpPath, { force: true }); reject(e); };
    bb.on('field', (k, v) => { fields[k] = String(v).slice(0, 300); });
    bb.on('file', (_field, stream, info) => {
      const out = fs.createWriteStream(tmpPath, { mode: 0o640 });
      let size = 0;
      let head = Buffer.alloc(0);
      stream.on('data', (c: Buffer) => { size += c.length; if (head.length < 16) head = Buffer.concat([head, c]).subarray(0, 16); });
      stream.on('limit', () => { tooBig = true; });
      got = new Promise((ok, bad) => {
        out.on('finish', () => ok({ name: String(info.filename ?? '').slice(0, 200), size, head }));
        out.on('error', bad);
      });
      stream.pipe(out);
    });
    bb.on('error', () => fail(new HttpError(400, 'Fayl yuklanmadi')));
    bb.on('close', () => {
      if (!got) return fail(new HttpError(400, 'Fayl tanlanmagan'));
      got.then((file) => {
        if (tooBig) return fail(new HttpError(413, `Fayl ${Math.round(maxBytes / 1024 / 1024)} MB dan katta`));
        if (!file.size) return fail(new HttpError(400, 'Fayl boʻsh'));
        resolve({ ...file, fields });
      }, () => fail(new HttpError(500, 'Faylni saqlab boʻlmadi')));
    });
    req.on('aborted', () => fail(new HttpError(400, 'Yuklash uzildi')));
    req.pipe(bb);
  });
}

/** Fayl nomidan sarlavha: kengaytma va ortiqcha belgilarsiz. */
const titleFromName = (name: string) => normalizeMaterialTitle(name.replace(/\.[a-z0-9]{1,5}$/i, '').replace(/[_]+/g, ' ')) || 'Material';
const extOf = (name: string) => (name.match(/\.([a-z0-9]{1,5})$/i)?.[1] ?? '').toLowerCase();

export function createTeacherMaterialRoutes(authenticate: (req: any, res: any, next: any) => void, deps: MaterialDeps = {}): Router {
  const q = deps.q === undefined ? poolQuery : deps.q;
  const privateDir = deps.privateDir ?? path.resolve(process.cwd(), 'private-uploads');
  const pages = deps.pages ?? createMaterialPages({ q, privateDir });
  const router = Router();
  const h = (fn: (req: any, res: Response) => Promise<unknown>) => (req: Request, res: Response) =>
    fn(req, res).catch((e) => {
      if (e instanceof HttpError) return res.status(e.status).json({ error: e.message });
      console.error('[materials]', e);
      res.status(500).json({ error: 'Server xatosi, qayta urinib koʻring' });
    });
  const db = () => { if (!q) throw new HttpError(503, 'Baza ulanmagan'); return q; };

  async function teacherId(req: any) {
    const u = (await db()('SELECT account_type FROM users WHERE id = $1', [Number(req.userId)])).rows[0];
    if (u?.account_type !== 'teacher') throw new HttpError(403, 'Bu boʻlim faqat oʻqituvchilar uchun');
    return Number(req.userId);
  }

  function sendFile(res: Response, m: { private_path: string; mime: string; original_name: string | null }) {
    const full = path.resolve(privateDir, m.private_path);
    if (!full.startsWith(path.resolve(privateDir) + path.sep) || !fs.existsSync(full)) throw new HttpError(404, 'Fayl topilmadi');
    res.setHeader('Content-Type', m.mime);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(m.original_name || 'material')}`);
    // sendFile Range so'rovlarini qo'llaydi — audio/video oldinga o'tkazish ishlaydi.
    res.sendFile(full, { headers: { 'Content-Type': m.mime }, lastModified: false, etag: false });
  }

  /** PDF sahifasi yoki rasm — WebP. Manzilda material raqami bor, shuning uchun brauzer keshlay oladi. */
  async function sendPage(req: any, res: Response, m: { private_path: string; kind: string; status: string; page_count: number | null }) {
    if (m.status !== 'ready') throw new HttpError(409, 'Material hali tayyorlanmoqda');
    if (m.kind !== 'pdf' && m.kind !== 'image') throw new HttpError(400, 'Bu materialda sahifa yoʻq');
    const page = Math.floor(Number(req.params.page));
    const last = m.kind === 'image' ? 1 : Number(m.page_count) || 1;
    if (!Number.isInteger(page) || page < 1 || page > last) throw new HttpError(404, 'Bunday sahifa yoʻq');
    let file: string;
    try {
      file = await pages.renderPage(m, page, pageWidthFor(req.query.w));
    } catch (e) {
      console.error('[materials] render', (e as Error).message);
      throw new HttpError(422, 'Sahifani koʻrsatib boʻlmadi');
    }
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'private, max-age=86400, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(file, { lastModified: false, etag: false });
  }

  async function ownMaterial(req: any) {
    const id = await teacherId(req);
    const m = (await db()(`SELECT ${MATERIAL_COLS}, private_path FROM teacher_materials WHERE id = $1 AND teacher_user_id = $2`, [Number(req.params.id), id])).rows[0];
    if (!m) throw new HttpError(404, 'Material topilmadi');
    return m;
  }

  /* ───────────── o'qituvchi kutubxonasi ───────────── */

  router.get('/teacher/materials', authenticate, h(async (req, res) => {
    const id = await teacherId(req);
    const rows = (await db()(`SELECT ${MATERIAL_COLS} FROM teacher_materials WHERE teacher_user_id = $1 ORDER BY created_at DESC`, [id])).rows;
    const used = rows.reduce((s, r) => s + Number(r.size_bytes), 0);
    res.json({ materials: rows.map(shapeMaterial), used_bytes: used, quota_bytes: MATERIAL_QUOTA_BYTES, max_file_bytes: MATERIAL_MAX_BYTES });
  }));

  /** Bitta material — PowerPoint aylantirilayotganda holatini so'rab turish uchun. */
  router.get('/teacher/materials/:id', authenticate, h(async (req, res) => {
    const { private_path: _hidden, ...m } = await ownMaterial(req);
    res.json(shapeMaterial(m));
  }));

  router.post('/teacher/materials', authenticate, h(async (req, res) => {
    const id = await teacherId(req);
    const used = Number((await db()('SELECT coalesce(sum(size_bytes), 0)::bigint AS n FROM teacher_materials WHERE teacher_user_id = $1', [id])).rows[0].n);
    if (used >= MATERIAL_QUOTA_BYTES) throw new HttpError(413, 'Joy tugadi — keraksiz materiallarni oʻchiring');
    const dir = path.join(privateDir, 'teacher-materials', String(id));
    fs.mkdirSync(dir, { recursive: true });
    const base = crypto.randomBytes(12).toString('hex');
    const tmp = path.join(dir, `${base}.part`);
    const file = await receiveFile(req, tmp, MATERIAL_MAX_BYTES);
    const drop = (status: number, message: string): never => { fs.rmSync(tmp, { force: true }); throw new HttpError(status, message); };
    if (used + file.size > MATERIAL_QUOTA_BYTES) drop(413, 'Joy yetmaydi — keraksiz materiallarni oʻchiring');

    const type = sniffMaterial(file.head);
    const ext = extOf(file.name);
    if (!type) drop(415, 'Bu fayl turi qoʻllanmaydi: PDF, PowerPoint, Word, rasm (JPG, PNG), audio (MP3, M4A, OGG) yoki video (MP4) yuklang');
    if (type === 'office' && !(OFFICE_EXTENSIONS as readonly string[]).includes(ext)) drop(415, 'Faqat PowerPoint (pptx, ppt) va Word (docx, doc) fayllar qabul qilinadi');

    const title = normalizeMaterialTitle(file.fields.title ?? '') || titleFromName(file.name);
    const originalName = file.name || `material.${type === 'office' ? ext : type!.ext}`;
    const rel = path.join('teacher-materials', String(id), `${base}.${type === 'office' ? ext : type!.ext}`);
    const full = path.join(privateDir, rel);
    fs.renameSync(tmp, full);
    try {
      if (type === 'office') {
        // Aylantirish bir necha soniya oladi — javob darhol, holat «tayyorlanmoqda».
        const row = (await db()(`INSERT INTO teacher_materials (teacher_user_id, title, kind, mime, size_bytes, private_path, original_name, status, source_kind)
          VALUES ($1, $2, 'pdf', 'application/pdf', $3, $4, $5, 'processing', $6) RETURNING ${MATERIAL_COLS}`,
        [id, title, file.size, rel, originalName, ext])).rows[0];
        void pages.processOffice(Number(row.id));
        return res.status(201).json(shapeMaterial(row));
      }
      let pageCount: number | null = type!.kind === 'image' ? 1 : null;
      if (type!.kind === 'pdf') {
        try {
          pageCount = await pages.pageCount(full);
        } catch {
          throw new HttpError(415, 'PDF ochilmadi: fayl buzilgan yoki parol bilan himoyalangan');
        }
      }
      const row = (await db()(`INSERT INTO teacher_materials (teacher_user_id, title, kind, mime, size_bytes, private_path, original_name, page_count)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING ${MATERIAL_COLS}`,
      [id, title, type!.kind, type!.mime, file.size, rel, originalName, pageCount])).rows[0];
      res.status(201).json(shapeMaterial(row));
    } catch (e) {
      fs.rmSync(full, { force: true });
      throw e;
    }
  }));

  router.patch('/teacher/materials/:id', authenticate, h(async (req, res) => {
    const id = await teacherId(req);
    const title = normalizeMaterialTitle(req.body?.title);
    if (!title) throw new HttpError(400, `Nomni yozing (${MATERIAL_TITLE_MAX} belgigacha)`);
    const row = (await db()(`UPDATE teacher_materials SET title = $3, updated_at = now() WHERE id = $1 AND teacher_user_id = $2 RETURNING ${MATERIAL_COLS}`,
      [Number(req.params.id), id, title])).rows[0];
    if (!row) throw new HttpError(404, 'Material topilmadi');
    res.json(shapeMaterial(row));
  }));

  router.delete('/teacher/materials/:id', authenticate, h(async (req, res) => {
    const id = await teacherId(req);
    const row = (await db()('DELETE FROM teacher_materials WHERE id = $1 AND teacher_user_id = $2 RETURNING private_path', [Number(req.params.id), id])).rows[0];
    if (!row) throw new HttpError(404, 'Material topilmadi');
    fs.rmSync(path.resolve(privateDir, row.private_path), { force: true });
    fs.rmSync(pagesDirOf(privateDir, row.private_path), { recursive: true, force: true });
    deps.room?.()?.materialDeleted(Number(req.params.id));
    res.json({ ok: true });
  }));

  router.get('/teacher/materials/:id/file', authenticate, h(async (req, res) => {
    sendFile(res, await ownMaterial(req));
  }));

  router.get('/teacher/materials/:id/page/:page', authenticate, h(async (req, res) => {
    await sendPage(req, res, await ownMaterial(req));
  }));

  /* ───────────── darsga oldindan biriktirish ───────────── */

  async function ownLesson(req: any) {
    const id = await teacherId(req);
    const kind = parseLessonKind(req.params.kind);
    const lessonId = Number(req.params.id);
    if (!kind || (await lessonTeacherId(db(), kind, lessonId)) !== id) throw new HttpError(404, 'Dars topilmadi');
    return { teacher: id, kind, lessonId };
  }

  router.get('/teacher/lesson-materials/:kind/:id', authenticate, h(async (req, res) => {
    const l = await ownLesson(req);
    const rows = (await db()(`SELECT material_id FROM teacher_lesson_materials WHERE lesson_kind = $1 AND lesson_id = $2 ORDER BY position, created_at`,
      [l.kind, l.lessonId])).rows;
    res.json({ material_ids: rows.map((r) => Number(r.material_id)) });
  }));

  /** Ro'yxatni to'liq almashtiradi (tartib — yuborilgan tartib). */
  router.put('/teacher/lesson-materials/:kind/:id', authenticate, h(async (req, res) => {
    const l = await ownLesson(req);
    const ids = [...new Set((Array.isArray(req.body?.material_ids) ? req.body.material_ids : []).map(Number).filter((n: number) => Number.isInteger(n) && n > 0))].slice(0, 50) as number[];
    const own = ids.length
      ? new Set((await db()('SELECT id FROM teacher_materials WHERE teacher_user_id = $1 AND id = ANY($2::bigint[])', [l.teacher, ids])).rows.map((r) => Number(r.id)))
      : new Set<number>();
    const keep = ids.filter((m) => own.has(m));
    await db()('DELETE FROM teacher_lesson_materials WHERE lesson_kind = $1 AND lesson_id = $2', [l.kind, l.lessonId]);
    for (const [i, m] of keep.entries()) {
      await db()('INSERT INTO teacher_lesson_materials (lesson_kind, lesson_id, material_id, position) VALUES ($1, $2, $3, $4)', [l.kind, l.lessonId, m, i]);
    }
    res.json({ material_ids: keep });
  }));

  /* ───────────── dars doskasi ───────────── */
  // Doskani boshqarish real vaqt kanalida (lessonRoom.service). Bu yerda faqat fayl va sahifalar beriladi.

  /** Doskadagi material: ikkala ishtirokchi uchun, xona ochiq paytda, faqat hozir ko'rsatilayotgani. */
  async function boardMaterial(req: any) {
    const kind = parseLessonKind(req.params.kind);
    if (!kind) throw new HttpError(404, 'Dars topilmadi');
    let access;
    try {
      access = await checkLessonAccess(db(), kind, Number(req.params.id), Number(req.userId));
    } catch (e) {
      if (e instanceof LessonAccessError) throw new HttpError(e.reason === 'not_found' ? 404 : e.reason === 'unpaid' ? 409 : 425, e.message);
      throw e;
    }
    // Xona xotirada bo'lsa uning holati aniq (bazaga yozuv bir lahza kechikishi mumkin).
    const live = deps.room ? deps.room()?.currentMaterialId(access.kind, access.lessonId) : undefined;
    const current = live !== undefined ? live : (await db()(`SELECT material_id FROM teacher_lesson_boards WHERE lesson_kind = $1 AND lesson_id = $2`,
      [access.kind, access.lessonId])).rows[0]?.material_id ?? null;
    const wanted = req.query.material ? Number(req.query.material) || 0 : null;
    if (current == null || (wanted !== null && Number(current) !== wanted)) throw new HttpError(404, 'Doskada material yoʻq');
    const m = (await db()(`SELECT private_path, mime, original_name, kind, status, page_count FROM teacher_materials WHERE id = $1 AND teacher_user_id = $2`,
      [Number(current), access.teacherId])).rows[0];
    if (!m) throw new HttpError(404, 'Doskada material yoʻq');
    return m;
  }

  router.get('/lesson-board/:kind/:id/file', authenticate, h(async (req, res) => {
    sendFile(res, await boardMaterial(req));
  }));

  router.get('/lesson-board/:kind/:id/page/:page', authenticate, h(async (req, res) => {
    await sendPage(req, res, await boardMaterial(req));
  }));

  return router;
}
