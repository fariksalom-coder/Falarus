/**
 * Onboarding v2 ko'chirish: eski o'qituvchi hujjatlari (pasport, diplom, sertifikat)
 * ommaviy `uploads/storage/...` dan YOPIQ `private-uploads/teacher-docs/` ga o'tkaziladi,
 * mavjud videolar davomiyligi ffprobe bilan yoziladi. Qayta ishga tushirish xavfsiz.
 *
 *   npx tsx --env-file=.env scripts/ops/teacherDocsToPrivate.ts [--dry]
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pool } from '../../server/lib/db.ts';
import { PRIVATE_UPLOADS_DIR } from '../../server/lib/privateUploads.ts';

const dry = process.argv.includes('--dry');
const uploads = path.resolve(process.cwd(), 'uploads');
if (!pool) throw new Error('DATABASE_URL yoʻq');

const local = (url: string) => {
  const m = /\/uploads\/(.+)$/.exec(url.split('?')[0]);
  return m ? path.join(uploads, decodeURIComponent(m[1])) : null;
};
const MIME: Record<string, string> = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };

const docs = (await pool.query(`SELECT id, teacher_user_id, kind, file_url FROM teacher_documents WHERE private_path IS NULL AND kind <> 'video' AND file_url <> ''`)).rows;
let moved = 0, missing = 0;
for (const d of docs) {
  const src = local(d.file_url);
  if (!src || !fs.existsSync(src)) { missing++; console.log('missing', d.id); continue; }
  const ext = path.extname(src).slice(1).toLowerCase() || 'bin';
  const rel = `teacher-docs/${d.teacher_user_id}/${crypto.randomBytes(12).toString('hex')}.${ext}`;
  if (!dry) {
    fs.mkdirSync(path.dirname(path.join(PRIVATE_UPLOADS_DIR, rel)), { recursive: true });
    fs.copyFileSync(src, path.join(PRIVATE_UPLOADS_DIR, rel));
    await pool.query(`UPDATE teacher_documents SET private_path = $2, mime = $3, size_bytes = $4, file_url = '', updated_at = now() WHERE id = $1`,
      [d.id, rel, MIME[ext] ?? 'application/octet-stream', fs.statSync(src).size]);
    fs.rmSync(src);
  }
  moved++;
}

const vids = (await pool.query(`SELECT user_id, video_url FROM teacher_profiles WHERE video_url IS NOT NULL AND video_url <> '' AND video_duration_sec IS NULL`)).rows;
let measured = 0;
for (const v of vids) {
  const src = local(v.video_url);
  if (!src || !fs.existsSync(src)) continue;
  try {
    const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src], { encoding: 'utf8' }).trim();
    const sec = Math.round(Number(out));
    if (Number.isFinite(sec) && sec > 0) { if (!dry) await pool.query('UPDATE teacher_profiles SET video_duration_sec = $2 WHERE user_id = $1', [v.user_id, sec]); measured++; }
  } catch { /* o'qib bo'lmadi — o'qituvchi videoni qayta yuklaydi */ }
}
console.log(JSON.stringify({ dry, documents: docs.length, moved, missing, videos: vids.length, measured }));
await pool.end();
