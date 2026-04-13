import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './supabase.js';
import { parseBody } from './request.js';
import { getAccessInfo } from './subscription.js';
import { checkTranslation, transcribeAudio } from './openai.js';
import { buildRequestLogContext, logError } from './logger.js';

async function requireSubscription(userId: number, res: VercelResponse): Promise<boolean> {
  const access = await getAccessInfo(supabase, userId);
  if (!access.subscription_active) {
    res.status(403).json({ error: 'Obuna kerak' });
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// GET /api/speaking/tasks?topic=...&lesson_id=...&limit=10
// ---------------------------------------------------------------------------
async function handleGetTasks(req: VercelRequest, res: VercelResponse) {
  const topic = req.query.topic as string | undefined;
  const lessonId = req.query.lesson_id ? Number(req.query.lesson_id) : undefined;
  const limit = Math.min(Number(req.query.limit) || 10, 50);

  let query = supabase
    .from('speaking_tasks')
    .select('id, uz_text, ru_correct, topic, level, lesson_id, sort_order')
    .order('sort_order', { ascending: true })
    .limit(limit);

  if (topic) query = query.eq('topic', topic);
  if (lessonId) query = query.eq('lesson_id', lessonId);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: 'Xatolik yuz berdi' });
  return res.status(200).json(data ?? []);
}

// ---------------------------------------------------------------------------
// GET /api/speaking/topics — distinct topics with counts
// ---------------------------------------------------------------------------
async function handleGetTopics(res: VercelResponse) {
  const { data, error } = await supabase
    .from('speaking_tasks')
    .select('topic, level');
  if (error) return res.status(500).json({ error: 'Xatolik yuz berdi' });

  const map = new Map<string, { topic: string; level: string; count: number }>();
  for (const row of data ?? []) {
    const existing = map.get(row.topic);
    if (existing) {
      existing.count++;
    } else {
      map.set(row.topic, { topic: row.topic, level: row.level, count: 1 });
    }
  }
  return res.status(200).json(Array.from(map.values()));
}

// ---------------------------------------------------------------------------
// POST /api/speaking/check — AI-powered answer checking
// ---------------------------------------------------------------------------
async function handleCheck(userId: number, req: VercelRequest, res: VercelResponse) {
  const body = parseBody(req.body);
  const taskId = Number(body.task_id);
  const userAnswer = String(body.user_answer ?? '').trim();
  const mode = String(body.mode ?? 'text');
  const attempt = Math.max(1, Number(body.attempt) || 1);

  if (!Number.isFinite(taskId)) return res.status(400).json({ error: 'task_id kerak' });
  if (!userAnswer) return res.status(400).json({ error: 'Javob kiritilmagan' });
  if (mode !== 'text' && mode !== 'voice') return res.status(400).json({ error: 'mode noto\'g\'ri' });

  const { data: task } = await supabase
    .from('speaking_tasks')
    .select('id, uz_text, ru_correct')
    .eq('id', taskId)
    .maybeSingle();
  if (!task) return res.status(404).json({ error: 'Topshiriq topilmadi' });

  const result = await checkTranslation(task.uz_text, task.ru_correct, userAnswer, attempt);

  await supabase.from('speaking_results').insert({
    user_id: userId,
    task_id: taskId,
    user_answer: userAnswer,
    mode,
    status: result.status,
    feedback: result.feedback,
  });

  return res.status(200).json(result);
}

// ---------------------------------------------------------------------------
// POST /api/speaking/transcribe — Whisper speech-to-text
// ---------------------------------------------------------------------------
async function handleTranscribe(req: VercelRequest, res: VercelResponse) {
  const body = parseBody(req.body);
  const audioBase64 = String(body.audio ?? '');

  if (!audioBase64) return res.status(400).json({ error: 'audio kerak' });

  const buffer = Buffer.from(audioBase64, 'base64');
  if (buffer.length > 5 * 1024 * 1024) {
    return res.status(400).json({ error: 'Audio juda katta (max 5MB)' });
  }

  const text = await transcribeAudio(buffer, 'recording.webm');
  return res.status(200).json({ text });
}

// ---------------------------------------------------------------------------
// GET /api/speaking/stats — user's speaking stats
// ---------------------------------------------------------------------------
async function handleGetStats(userId: number, res: VercelResponse) {
  const { data, error } = await supabase
    .from('speaking_results')
    .select('status')
    .eq('user_id', userId);
  if (error) return res.status(500).json({ error: 'Xatolik yuz berdi' });

  const rows = data ?? [];
  const total = rows.length;
  const correct = rows.filter((r) => r.status === 'correct').length;
  const partial = rows.filter((r) => r.status === 'partial').length;
  const wrong = rows.filter((r) => r.status === 'wrong').length;

  return res.status(200).json({ total, correct, partial, wrong });
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
export async function routeSpeakingRequest(
  req: VercelRequest,
  res: VercelResponse,
  userId: number,
  segments: string[]
) {
  try {
    if (!(await requireSubscription(userId, res))) return;

    const s0 = segments[0];

    if (s0 === 'tasks' && req.method === 'GET') {
      return handleGetTasks(req, res);
    }

    if (s0 === 'topics' && req.method === 'GET') {
      return handleGetTopics(res);
    }

    if (s0 === 'check' && req.method === 'POST') {
      return handleCheck(userId, req, res);
    }

    if (s0 === 'transcribe' && req.method === 'POST') {
      return handleTranscribe(req, res);
    }

    if (s0 === 'stats' && req.method === 'GET') {
      return handleGetStats(userId, res);
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logError('api.speaking.failed', err, buildRequestLogContext('vercel', req, { segments, userId }));
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
}
