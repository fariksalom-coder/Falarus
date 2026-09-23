import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { videoLessons, type VideoLessonService } from '../videoLessons/service.js';
import { LessonError } from '../videoLessons/store.js';
import { MAX_VIDEO_BYTES, lessonIssues } from '../../shared/videoLesson.js';
const handle = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => { void fn(req, res).catch(next); };
const errorHandler = (error: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (res.headersSent) return _next(error);
  const status = error instanceof LessonError ? error.status : error instanceof multer.MulterError ? 400 : 500;
  if (status === 500) console.error('[video-lessons]', error.message);
  res.status(status).json({ error: status === 500 ? 'Не удалось выполнить действие. Проверьте журнал сервера.' : error.message });
};
export function createAdminVideoLessonRoutes(service: VideoLessonService = videoLessons) {
  const router = Router();
  router.use((_req,res,next) => { res.setHeader('Cache-Control','no-store'); next(); });
  const upload = multer({ storage: multer.diskStorage({
    destination: (_req, _file, cb) => { const dir = path.join(service.store.root, '.incoming'); fs.mkdir(dir, { recursive: true, mode: 0o700 }).then(() => cb(null, dir), error => cb(error, dir)); },
    filename: (_req, _file, cb) => cb(null, randomUUID()),
  }), limits: { fileSize: MAX_VIDEO_BYTES, files: 1, fields: 0 }, fileFilter: (_req, file, cb) => {
    if (!['video/mp4','video/webm','video/quicktime'].includes(file.mimetype)) cb(new LessonError(400, 'Выберите видео MP4, WebM или MOV.')); else cb(null, true);
  } });
  router.get('/', handle(async (_req,res) => res.json((await service.store.list()).map(({ lesson, ...record }) => ({ ...record, title: lesson.title, sentences: lesson.sentences.length })))));
  router.post('/upload', upload.single('video'), handle(async (req,res) => {
    if (!req.file) throw new LessonError(400, 'Выберите видео.');
    try { res.status(201).json(await service.upload(req.file)); } finally { await fs.unlink(req.file.path).catch(() => {}); }
  }));
  router.get('/:id', handle(async (req,res) => { const record = await service.get(String(req.params.id)); return res.json({ ...record, issues: lessonIssues(record.lesson,record.duration) }); }));
  router.get('/:id/video', handle(async (req,res) => { const record = await service.get(String(req.params.id)); res.type(record.mime).sendFile(path.join(service.store.dir(record.id),'video.mp4')); }));
  router.get('/:id/export', handle(async (req,res) => { const record = await service.get(String(req.params.id)); res.attachment(`${record.id}.json`).json(record.lesson); }));
  router.put('/:id', handle(async (req,res) => res.json(await service.save(String(req.params.id), req.body.revision, req.body.lesson))));
  router.post('/:id/process', handle(async (req,res) => { if (!['recognize','align','translate'].includes(req.body.kind)) throw new LessonError(400,'Неизвестное действие.'); res.status(202).json(await service.start(String(req.params.id), req.body.revision, req.body.kind)); }));
  router.post('/:id/publish', handle(async (req,res) => res.json(await service.publish(String(req.params.id),req.body.revision))));
  router.use(errorHandler); return router;
}
export function createPublicVideoLessonRoutes(service: VideoLessonService = videoLessons) {
  const router = Router(); router.use((_req,res,next) => { res.setHeader('Cache-Control','no-store'); next(); });
  router.get('/', handle(async (_req,res) => res.json((await service.store.list()).filter(r=>r.status==='published').map(r=>({id:r.id,title:r.lesson.title,duration:r.duration})))));
  router.get('/:id', handle(async (req,res) => { const record = await service.get(String(req.params.id)); if(record.status!=='published') throw new LessonError(404,'Урок не найден.'); res.json(record.lesson); }));
  router.get('/:id/video', handle(async (req,res) => { const record = await service.get(String(req.params.id)); if(record.status!=='published') throw new LessonError(404,'Видео не найдено.'); res.type(record.mime).sendFile(path.join(service.store.dir(record.id),'video.mp4')); }));
  router.use(errorHandler); return router;
}
