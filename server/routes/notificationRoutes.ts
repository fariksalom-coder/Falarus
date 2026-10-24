/**
 * Bildirishnomalar API.
 *   Foydalanuvchi: /api/notifications (kirish qutisi), /api/push/device (mobil ilova tokeni).
 *   Admin:         /api/admin/notifications/* — qoidalar, ovoz, sinov, ommaviy yuborish.
 */
import path from 'node:path';
import { Router, type Request, type Response, type RequestHandler } from 'express';
import multer from 'multer';
import {
  adminOverview, generateVoice, getRule, inbox, isSegment, markNotification, safeUrl, saveDevice, saveVoiceFile,
  segmentAudience, sendCampaign, updateRule, ruleAudience,
} from '../services/notifications.service.js';

type Req = Request & { userId?: number; adminId?: number };
const wrap = (fn: (req: Req, res: Response) => Promise<unknown>) => (req: Request, res: Response) => {
  fn(req as Req, res).catch((e: Error & { status?: number }) => {
    if (e.status && e.status < 500) return res.status(e.status).json({ error: e.message });
    console.error('[bildirishnoma]', e.message);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  });
};
const bad = (message: string) => Object.assign(new Error(message), { status: 400 });

export function createNotificationRoutes(authenticate: RequestHandler): Router {
  const router = Router();

  router.get('/notifications', authenticate, wrap(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(await inbox(Number(req.userId)));
  }));

  router.post('/notifications/:id/:what', authenticate, wrap(async (req, res) => {
    const what = req.params.what === 'opened' ? 'opened' : req.params.what === 'seen' ? 'seen' : null;
    if (!what) throw bad('Noto‘g‘ri amal');
    await markNotification(Number(req.userId), Number(req.params.id), what);
    res.json({ ok: true });
  }));

  /** Mobil ilova push tokeni (Capacitor PushNotifications → FCM). */
  router.post('/push/device', authenticate, wrap(async (req, res) => {
    const token = String(req.body?.token ?? '').trim();
    const platform = req.body?.platform === 'ios' ? 'ios' : req.body?.platform === 'android' ? 'android' : null;
    if (!platform || token.length < 20) throw bad('Token yoki platforma noto‘g‘ri');
    await saveDevice(Number(req.userId), platform, token);
    res.json({ ok: true });
  }));

  return router;
}

const AUDIO_TYPES: Record<string, string> = { 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/webm': 'webm' };

export function createAdminNotificationRoutes(uploadsDir = path.resolve(process.cwd(), 'uploads')): Router {
  const router = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => (AUDIO_TYPES[file.mimetype] ? cb(null, true) : cb(new Error('Faqat MP3, M4A, OGG yoki WAV'))),
  });

  router.get('/overview', wrap(async (_req, res) => {
    const { pushSozlanganmi } = await import('../services/push.service.js');
    const { fcmSozlanganmi } = await import('../services/fcm.service.js');
    res.json({ ...(await adminOverview()), channels: { web: pushSozlanganmi(), app: fcmSozlanganmi() } });
  }));

  router.put('/rules/:id', wrap(async (req, res) => {
    res.json(await updateRule(Number(req.params.id), req.body ?? {}));
  }));

  /** Qoida matnidan ovoz yaratadi va qoidaga biriktiradi. */
  router.post('/rules/:id/voice', wrap(async (req, res) => {
    const rule = await getRule(Number(req.params.id));
    if (!rule) throw Object.assign(new Error('Qoida topilmadi'), { status: 404 });
    const text = String(req.body?.text ?? rule.voice_text ?? '').trim();
    if (!text) throw bad('Ovoz matnini yozing');
    if (text.length > 200) throw bad('Ovoz matni 200 belgidan oshmasin');
    const url = await generateVoice(text, uploadsDir);
    res.json(await updateRule(rule.id, { voice_text: text, audio_url: url }));
  }));

  /** O'zingiz yozib olgan ovoz (MP3 va h.k.) — qoidaga yoki qo'lda yuboriladigan xabarga. */
  router.post('/voice-upload', (req, res, next) => upload.single('audio')(req, res, (err) => (err ? res.status(400).json({ error: err.message }) : next())),
    wrap(async (req, res) => {
      const file = (req as Req & { file?: Express.Multer.File }).file;
      if (!file) throw bad('Fayl tanlanmagan');
      res.json({ url: await saveVoiceFile(file.buffer, AUDIO_TYPES[file.mimetype], uploadsDir) });
    }));

  /** Nechta odamga ketadi — yuborishdan oldin. */
  router.post('/preview', wrap(async (req, res) => {
    const b = req.body ?? {};
    if (b.rule_id) {
      const rule = await getRule(Number(b.rule_id));
      if (!rule) throw Object.assign(new Error('Qoida topilmadi'), { status: 404 });
      return res.json({ count: (await ruleAudience(rule)).length });
    }
    if (!isSegment(b.segment)) throw bad('Segment noto‘g‘ri');
    res.json({ count: (await segmentAudience(b.segment, Math.max(0, Math.trunc(Number(b.param) || 0)))).length });
  }));

  /** Ommaviy yoki bitta odamga (sinov) yuborish. Matn admin yozganicha ketadi. */
  router.post('/send', wrap(async (req, res) => {
    const b = req.body ?? {};
    if (!isSegment(b.segment)) throw bad('Segment noto‘g‘ri');
    const title = String(b.title ?? '').trim().slice(0, 80);
    const body = String(b.body ?? '').trim().slice(0, 240);
    if (!title || !body) throw bad('Sarlavha va matnni yozing');
    if (b.segment !== 'user' && b.confirm !== 'YUBORISH') throw bad('Tasdiqlash uchun YUBORISH deb yozing');
    const audio = typeof b.audio_url === 'string' && b.audio_url.startsWith('/uploads/bildirishnoma-ovoz/') ? b.audio_url : null;
    const param = Math.max(0, Math.trunc(Number(b.param) || 0));
    if (b.segment === 'user' && !param) throw bad('Foydalanuvchi ID ni yozing');
    const r = await sendCampaign({ segment: b.segment, param, title, body, url: safeUrl(b.url), audio_url: audio, adminId: Number(req.adminId) || null });
    console.log('[bildirishnoma] admin yubordi', { segment: b.segment, total: r.total, pushed: r.pushed, admin: req.adminId });
    res.json(r);
  }));

  return router;
}
