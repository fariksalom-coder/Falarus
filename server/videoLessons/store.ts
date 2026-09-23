import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { MAX_VIDEO_SECONDS, type VideoLessonRecord, type VideoLessonDocument } from '../../shared/videoLesson.js';
export class LessonError extends Error { constructor(public status: number, message: string) { super(message); } }
export const ROOT = path.resolve(process.env.VIDEO_LESSONS_DIR || 'var/video-lessons');
export class LessonStore {
  constructor(public root = ROOT) {}
  dir(id: string) { if (!/^[a-f0-9-]{36}$/.test(id)) throw new LessonError(404, 'Урок не найден.'); return path.join(this.root, id); }
  async read(id: string): Promise<VideoLessonRecord> { try { return JSON.parse(await fs.readFile(path.join(this.dir(id), 'lesson.json'), 'utf8')); } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') throw new LessonError(404, 'Урок не найден.'); throw e; } }
  async write(record: VideoLessonRecord) { const dir = this.dir(record.id); await fs.mkdir(dir, { recursive: true, mode: 0o700 }); const temp = path.join(dir, `${randomUUID()}.tmp`); await fs.writeFile(temp, JSON.stringify(record, null, 2), { mode: 0o600 }); await fs.rename(temp, path.join(dir, 'lesson.json')); }
  async list() { await fs.mkdir(this.root, { recursive: true, mode: 0o700 }); const names = await fs.readdir(this.root); const all: VideoLessonRecord[] = []; for (const id of names) { if (/^[a-f0-9-]{36}$/.test(id)) all.push(await this.read(id)); } return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
  async lock<T>(id: string, action: () => Promise<T>): Promise<T> {
    const key = path.join(this.dir(id), '.editing');
    // Short-lived, cross-process lock. A crash only blocks edits for 30 seconds.
    try { const stat = await fs.stat(key); if (Date.now() - stat.mtimeMs > 30000) await fs.unlink(key); } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
    let handle; try { handle = await fs.open(key, 'wx', 0o600); } catch (e) { if ((e as NodeJS.ErrnoException).code === 'EEXIST') throw new LessonError(409, 'Урок сейчас изменяется. Повторите действие.'); throw e; }
    try { return await action(); } finally { await handle.close(); await fs.unlink(key).catch(() => {}); }
  }
}
export function parseDocument(value: unknown, previous: VideoLessonDocument): VideoLessonDocument {
  const raw = value as VideoLessonDocument;
  if (!raw || typeof raw.title !== 'string' || raw.title.length > 180 || !Array.isArray(raw.sentences) || raw.sentences.length > 1000) throw new LessonError(400, 'Некорректный lesson JSON.');
  let count = 0;
  const text = (v: unknown, max: number) => { if (typeof v !== 'string' || v.length > max) throw new LessonError(400, 'Некорректное текстовое поле.'); return v.trim(); };
  const timing = (v: unknown) => { if (v === null) return null; if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > MAX_VIDEO_SECONDS + .1) throw new LessonError(400, 'Некорректный timestamp.'); return v; };
  return { ...previous, title: raw.title.trim(), sentences: raw.sentences.map(s => {
    if (!s || !Array.isArray(s.words) || (count += s.words.length) > 10000) throw new LessonError(400, 'Слишком много слов.');
    return { text: text(s.text, 5000), translation: text(s.translation, 5000), start: timing(s.start), end: timing(s.end), words: s.words.map(w => { if (!w) throw new LessonError(400, 'Некорректное слово.'); return { text: text(w.text, 250), start: timing(w.start), end: timing(w.end) }; }) };
  }) };
}
