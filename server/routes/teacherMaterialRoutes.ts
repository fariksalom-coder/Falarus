/**
 * DARS MATERIALLARI VA DARS DOSKASI.
 *
 * O'qituvchi o'z kutubxonasiga PDF, rasm, audio va video yuklaydi (private-uploads/,
 * ommaviy havolasiz). Darsda bittasini «doskaga» chiqaradi — o'quvchi ekranida shu
 * fayl va o'qituvchi tanlagan sahifa ko'rinadi.
 *
 * O'quvchi faylni faqat o'zi qatnashgan darsda, video xona ochiq paytda va faqat
 * hozir doskada turgan materialni ola oladi. Doskani boshqarish — real vaqt kanalida
 * (server/services/lessonRoom.service.ts).
 */
import { Router, type Request, type Response } from 'express';
import Busboy from 'busboy';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pool } from '../lib/db.js';
import { checkLessonAccess, LessonAccessError, parseLessonKind } from '../services/lessonRoomAccess.js';
import type { LessonRoomServer } from '../services/lessonRoom.service.js';
import {
  MATERIAL_MAX_BYTES, MATERIAL_QUOTA_BYTES, MATERIAL_TITLE_MAX, normalizeMaterialTitle, type MaterialKind,
} from '../../shared/teacherMaterials.js';

export type MaterialQuery = (sql: string, params?: unknown[]) => Promise<{ rows: any[] }>;
export type MaterialDeps = {
  q?: MaterialQuery | null;
  privateDir?: string;
  /** Real vaqt xonalari: doskadagi materialni bilish va o'chirilgan materialni doskadan tushirish. */
  room?: () => LessonRoomServer | null;
};

const poolQuery: MaterialQuery | null = pool ? (sql, params) => pool!.query(sql, params) : null;

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const MATERIAL_COLS = 'id, title, kind, mime, size_bytes, original_name, created_at, updated_at';

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
  // PowerPoint/Word (zip yoki eski OLE) — brauzer ularni ochmaydi.
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

export function createTeacherMaterialRoutes(authenticate: (req: any, res: any, next: any) => void, deps: MaterialDeps = {}): Router {
  const q = deps.q === undefined ? poolQuery : deps.q;
  const privateDir = deps.privateDir ?? path.resolve(process.cwd(), 'private-uploads');
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

  /* ───────────── o'qituvchi kutubxonasi ───────────── */

  router.get('/teacher/materials', authenticate, h(async (req, res) => {
    const id = await teacherId(req);
    const rows = (await db()(`SELECT ${MATERIAL_COLS} FROM teacher_materials WHERE teacher_user_id = $1 ORDER BY created_at DESC`, [id])).rows;
    const used = rows.reduce((s, r) => s + Number(r.size_bytes), 0);
    res.json({ materials: rows.map((r) => ({ ...r, size_bytes: Number(r.size_bytes) })), used_bytes: used, quota_bytes: MATERIAL_QUOTA_BYTES, max_file_bytes: MATERIAL_MAX_BYTES });
  }));

  router.post('/teacher/materials', authenticate, h(async (req, res) => {
    const id = await teacherId(req);
    const used = Number((await db()('SELECT coalesce(sum(size_bytes), 0)::bigint AS n FROM teacher_materials WHERE teacher_user_id = $1', [id])).rows[0].n);
    if (used >= MATERIAL_QUOTA_BYTES) throw new HttpError(413, 'Joy tugadi — keraksiz materiallarni oʻchiring');
    const dir = path.join(privateDir, 'teacher-materials', String(id));
    fs.mkdirSync(dir, { recursive: true });
    const tmp = path.join(dir, `${crypto.randomBytes(12).toString('hex')}.part`);
    const file = await receiveFile(req, tmp, MATERIAL_MAX_BYTES);
    const type = sniffMaterial(file.head);
    if (!type || type === 'office') {
      fs.rmSync(tmp, { force: true });
      throw new HttpError(415, type === 'office'
        ? 'PowerPoint va Word fayllarni darsda ochib boʻlmaydi — «Fayl → PDF qilib saqlash» bilan PDF yuklang'
        : 'Bu fayl turi qoʻllanmaydi: PDF, rasm (JPG, PNG), audio (MP3, M4A) yoki video (MP4) yuklang');
    }
    if (used + file.size > MATERIAL_QUOTA_BYTES) {
      fs.rmSync(tmp, { force: true });
      throw new HttpError(413, 'Joy yetmaydi — keraksiz materiallarni oʻchiring');
    }
    const rel = path.join('teacher-materials', String(id), `${path.basename(tmp, '.part')}.${type.ext}`);
    fs.renameSync(tmp, path.join(privateDir, rel));
    const title = normalizeMaterialTitle(file.fields.title ?? '') || titleFromName(file.name);
    try {
      const row = (await db()(`INSERT INTO teacher_materials (teacher_user_id, title, kind, mime, size_bytes, private_path, original_name)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${MATERIAL_COLS}`,
      [id, title, type.kind, type.mime, file.size, rel, file.name || `material.${type.ext}`])).rows[0];
      res.status(201).json({ ...row, size_bytes: Number(row.size_bytes) });
    } catch (e) {
      fs.rmSync(path.join(privateDir, rel), { force: true });
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
    res.json({ ...row, size_bytes: Number(row.size_bytes) });
  }));

  router.delete('/teacher/materials/:id', authenticate, h(async (req, res) => {
    const id = await teacherId(req);
    const row = (await db()('DELETE FROM teacher_materials WHERE id = $1 AND teacher_user_id = $2 RETURNING private_path', [Number(req.params.id), id])).rows[0];
    if (!row) throw new HttpError(404, 'Material topilmadi');
    fs.rmSync(path.resolve(privateDir, row.private_path), { force: true });
    deps.room?.()?.materialDeleted(Number(req.params.id));
    res.json({ ok: true });
  }));

  router.get('/teacher/materials/:id/file', authenticate, h(async (req, res) => {
    const id = await teacherId(req);
    const m = (await db()('SELECT private_path, mime, original_name FROM teacher_materials WHERE id = $1 AND teacher_user_id = $2', [Number(req.params.id), id])).rows[0];
    if (!m) throw new HttpError(404, 'Material topilmadi');
    sendFile(res, m);
  }));

  /* ───────────── dars doskasi ───────────── */
  // Doskani boshqarish real vaqt kanalida (lessonRoom.service). Bu yerda faqat fayl beriladi.

  /** Doskadagi fayl: ikkala ishtirokchi uchun, xona ochiq paytda, faqat hozir ko'rsatilayotgan material. */
  router.get('/lesson-board/:kind/:id/file', authenticate, h(async (req, res) => {
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
    const m = (await db()('SELECT private_path, mime, original_name FROM teacher_materials WHERE id = $1 AND teacher_user_id = $2',
      [Number(current), access.teacherId])).rows[0];
    if (!m) throw new HttpError(404, 'Doskada material yoʻq');
    sendFile(res, m);
  }));

  return router;
}
