import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { LessonError, LessonStore, parseDocument } from './store.js';
import { probe, recognize, translate } from './pipeline.js';
import { lessonIssues, running, type VideoLessonRecord, type VideoSentence } from '../../shared/videoLesson.js';
export class VideoLessonService {
  private active = false;
  constructor(public store = new LessonStore(), private pipeline = { probe, recognize, translate }) {}
  async get(id: string) {
    const record = await this.store.read(id);
    if (running(record.phase) && record.jobOwner) {
      let alive = true; try { process.kill(record.jobOwner, 0); } catch { alive = false; }
      if (!alive) return this.store.lock(id, async () => { const latest = await this.store.read(id); if (running(latest.phase)) { latest.phase = 'error'; latest.error = 'Обработка прервана перезапуском сервера. Запустите её повторно.'; latest.revision++; await this.store.write(latest); } return latest; });
    }
    if (record.phase === 'recognizing') { try { record.progress = JSON.parse(await fs.readFile(path.join(this.store.dir(id), 'progress.json'), 'utf8')); } catch {} }
    return record;
  }
  async upload(file: { path: string; originalname: string; size: number; mimetype: string }) {
    let duration: number;
    try { duration = await this.pipeline.probe(file.path); } catch (e) { throw new LessonError(400, (e as Error).message); }
    const decodedName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const originalname = decodedName.includes('�') ? file.originalname : decodedName;
    const id = randomUUID(); const now = new Date().toISOString();
    const record: VideoLessonRecord = { id, revision: 1, status: 'draft', phase: 'uploaded', filename: path.basename(originalname).slice(0, 180), bytes: file.size, duration, mime: file.mimetype === 'video/webm' ? 'video/webm' : 'video/mp4', createdAt: now, updatedAt: now,
      lesson: { id, title: path.basename(originalname).replace(/\.[^.]+$/, '').slice(0, 180), video: `/api/video-lessons/${id}/video`, language: 'ru', translationLanguage: 'uz', sentences: [] } };
    await fs.mkdir(this.store.dir(id), { recursive: true, mode: 0o700 });
    await fs.rename(file.path, path.join(this.store.dir(id), 'video.mp4'));
    await this.store.write(record); return record;
  }
  async save(id: string, revision: number, value: unknown) {
    return this.store.lock(id, async () => {
      const record = await this.store.read(id); this.editable(record, revision);
      record.lesson = parseDocument(value, record.lesson); record.revision++; record.status = 'draft'; record.updatedAt = new Date().toISOString(); record.error = undefined;
      await this.store.write(record); return record;
    });
  }
  async publish(id: string, revision: number) {
    return this.store.lock(id, async () => {
      const record = await this.store.read(id); this.editable(record, revision);
      const issues = lessonIssues(record.lesson, record.duration);
      if (issues.length) throw new LessonError(400, issues.slice(0, 8).join('\n'));
      record.status = 'published'; record.phase = 'ready'; record.revision++; record.updatedAt = new Date().toISOString();
      await this.store.write(record); return record;
    });
  }
  private editable(record: VideoLessonRecord, revision: number) {
    if (record.revision !== revision) throw new LessonError(409, 'Урок изменился в другой вкладке. Откройте его заново.');
    if (running(record.phase)) throw new LessonError(409, 'Дождитесь завершения обработки.');
  }
  async start(id: string, revision: number, kind: 'recognize' | 'align' | 'translate') {
    if (this.active) throw new LessonError(409, 'Сервер уже обрабатывает видео. Дождитесь завершения.');
    this.active = true;
    try {
      const record = await this.store.lock(id, async () => {
        const rec = await this.store.read(id); this.editable(rec, revision);
        if (rec.status === 'published') throw new LessonError(409, 'Сначала сохраните изменения как черновик.');
        if (kind !== 'recognize' && !rec.lesson.sentences.length) throw new LessonError(400, 'Нет текста для обработки.');
        if (kind === 'align' && rec.lesson.sentences.some(s => !s.text.trim() || s.start === null || s.end === null || s.start >= s.end || s.end > rec.duration + .05)) throw new LessonError(400, 'Для перепривязки задайте текст и правильные границы предложений.');
        await fs.unlink(path.join(this.store.dir(id), 'progress.json')).catch(() => {});
        rec.phase = kind === 'translate' ? 'translating' : 'recognizing'; rec.error = undefined; rec.jobOwner = process.pid; rec.revision++; await this.store.write(rec); return rec;
      });
      void this.process(record, kind).catch(e => console.error('[video-lessons worker]', e.message)).finally(() => { this.active = false; });
      return record;
    } catch (e) { this.active = false; throw e; }
  }
  private async process(record: VideoLessonRecord, kind: 'recognize' | 'align' | 'translate') {
    const began = Date.now();
    try {
      if (kind !== 'translate') {
        const result = await this.pipeline.recognize(this.store.dir(record.id), kind === 'align' ? record.lesson.sentences : undefined);
        record.lesson = parseDocument({ ...record.lesson, sentences: result }, record.lesson);
        record.phase = 'translating'; record.revision++; await this.store.write(record);
      }
      record.lesson.sentences = await this.pipeline.translate(record.lesson.sentences);
      record.phase = 'ready'; record.error = undefined;
    } catch (e) {
      record.phase = 'error'; record.error = (e as Error).message.slice(0, 3000);
      await fs.writeFile(path.join(this.store.dir(record.id), 'last-error.txt'), String((e as Error).stack || e), { mode: 0o600 }).catch(() => {});
    } finally {
      record.processingSeconds = Math.round((Date.now() - began) / 10) / 100; record.jobOwner = undefined; record.revision++; record.updatedAt = new Date().toISOString();
      await this.store.write(record);
    }
  }
}
export const videoLessons = new VideoLessonService();
