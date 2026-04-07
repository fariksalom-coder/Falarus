import type { VercelRequest, VercelResponse } from '@vercel/node';

function parseLessonIdFromQuery(req: VercelRequest): number | null {
  const pick = (v: unknown): string => {
    if (typeof v === 'string') return v.trim();
    if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'string') return v[0].trim();
    if (typeof v === 'number' && Number.isFinite(v)) return String(Math.trunc(v));
    return '';
  };
  const raw = pick(req.query.lesson_id) || pick(req.query.lessonId);
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}
import { supabase } from './supabase.js';
import { getAccessInfo } from './subscription.js';
import { LESSONS } from '../../src/data/lessonsList.js';
import { courseData } from '../../src/data/courseData.js';
import {
  applyLessonsLock,
  canAccessLesson,
  getLessonPreview,
} from './accessControl.js';
import {
  recordFullLessonPassInTaskResults,
  syncUserLessonProgressPercent,
} from './lessonProgress.js';
import { buildRequestLogContext, logError } from './logger.js';

type CourseLessonExercise = {
  type: string;
  question_uz: string;
  options: string[];
  correct_answer: string;
};

type CourseLessonDetail = {
  content_uz: string;
  content_ru: string;
  exercises: CourseLessonExercise[];
};

type DbQuestionRow = {
  id: number;
  type: string;
  prompt: string;
  order_index: number;
  version?: number;
  difficulty?: number;
  skill?: string;
  meta?: Record<string, unknown>;
  question_content: { content: Record<string, unknown>; answer: Record<string, unknown> }[] | null;
};

const courseLessonsCatalog: CourseLessonDetail[] = courseData.flatMap((level) =>
  level.modules.flatMap((module) =>
    module.lessons.map((lesson) => ({
      content_uz: lesson.content_uz ?? '',
      content_ru: lesson.content_ru ?? '',
      exercises: (lesson.exercises ?? []).map((ex) => ({
        type: String(ex.type ?? ''),
        question_uz: String(ex.question_uz ?? ''),
        options: Array.isArray(ex.options) ? (ex.options as string[]) : [],
        correct_answer: String(ex.correct_answer ?? ''),
      })),
    }))
  )
);

function getCourseLessonDetail(lessonId: number): CourseLessonDetail | null {
  const idx = lessonId - 1;
  if (idx < 0 || idx >= courseLessonsCatalog.length) return null;
  return courseLessonsCatalog[idx];
}

async function handleLessonsList(userId: number, res: VercelResponse) {
  const access = await getAccessInfo(supabase, userId);
  const listBase = LESSONS.map((l) => ({
    id: l.id,
    title: l.title,
    module_name: undefined,
    content_uz: null as string | null,
    content_ru: null as string | null,
    tasks_count: l.exercisesTotal,
  }));

  return res.status(200).json(applyLessonsLock(listBase as any, access));
}

async function handleLessonDetail(
  userId: number,
  lessonId: number,
  res: VercelResponse
) {
  const access = await getAccessInfo(supabase, userId);
  if (!canAccessLesson(lessonId, access)) {
    return res
      .status(403)
      .json({ error: 'locked', message: 'Ushbu dars uchun tarif kerak' });
  }

  const meta = LESSONS.find((l) => l.id === lessonId);
  if (!meta) return res.status(404).json({ error: 'Dars topilmadi' });

  const courseLesson = getCourseLessonDetail(lessonId);
  return res.status(200).json({
    id: lessonId,
    level: undefined,
    module_name: undefined,
    title: courseLesson ? meta.title : meta.title,
    content_uz: courseLesson?.content_uz ?? '',
    content_ru: courseLesson?.content_ru ?? '',
    exercises: courseLesson?.exercises ?? [],
  });
}

async function handleLessonQuestions(
  userId: number,
  lessonId: number,
  res: VercelResponse
) {
  const access = await getAccessInfo(supabase, userId);
  if (!canAccessLesson(lessonId, access)) {
    return res.status(403).json({ error: 'locked', message: 'Ushbu dars uchun tarif kerak' });
  }

  const { data, error } = await supabase
    .from('questions')
    .select('id,type,prompt,order_index,version,difficulty,skill,meta,question_content(content,answer)')
    .eq('lesson_id', lessonId)
    .eq('is_active', true)
    .order('order_index', { ascending: true });

  if (error) return res.status(500).json({ error: 'Savollar yuklanmadi' });

  const items = ((data as unknown as DbQuestionRow[] | null) ?? []).map((q) => {
    const payload = q.question_content?.[0] ?? { content: {}, answer: {} };
    return {
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      order_index: q.order_index,
      version: q.version ?? 1,
      difficulty: q.difficulty ?? 1,
      skill: q.skill ?? 'grammar',
      meta: q.meta ?? {},
      content: payload.content ?? {},
      answer: payload.answer ?? {},
    };
  });
  return res.status(200).json(items);
}

async function handleLessonTaskQuestionsByPath(
  userId: number,
  lessonPath: string,
  taskNumber: number,
  res: VercelResponse
) {
  const lessonIdMatch = lessonPath.match(/\/lesson-(\d+)/);
  const lessonId = lessonIdMatch ? Number(lessonIdMatch[1]) : null;
  if (!lessonId || lessonId <= 0) return res.status(400).json({ error: 'lessonPath noto‘g‘ri' });

  const access = await getAccessInfo(supabase, userId);
  if (!canAccessLesson(lessonId, access)) {
    return res.status(403).json({ error: 'locked', message: 'Ushbu dars uchun tarif kerak' });
  }

  const start = taskNumber * 1000;
  const end = start + 999;
  const { data, error } = await supabase
    .from('questions')
    .select('id,type,prompt,order_index,version,difficulty,skill,meta,question_content(content,answer)')
    .eq('lesson_id', lessonId)
    .eq('is_active', true)
    .gte('order_index', start)
    .lte('order_index', end)
    .order('order_index', { ascending: true });

  if (error) return res.status(500).json({ error: 'Savollar yuklanmadi' });

  const items = ((data as unknown as DbQuestionRow[] | null) ?? []).map((q) => {
    const payload = q.question_content?.[0] ?? { content: {}, answer: {} };
    return {
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      order_index: q.order_index,
      version: q.version ?? 1,
      difficulty: q.difficulty ?? 1,
      skill: q.skill ?? 'grammar',
      meta: q.meta ?? {},
      content: payload.content ?? {},
      answer: payload.answer ?? {},
    };
  });
  return res.status(200).json(items);
}

async function handleLessonAnswer(
  userId: number,
  lessonId: number,
  req: VercelRequest,
  res: VercelResponse
) {
  const access = await getAccessInfo(supabase, userId);
  if (!canAccessLesson(lessonId, access)) {
    return res.status(403).json({ error: 'locked', message: 'Ushbu dars uchun tarif kerak' });
  }

  const body = (req.body ?? {}) as {
    question_id?: number;
    answer?: unknown;
    is_correct?: boolean;
    duration_ms?: number;
  };

  const questionId = Number(body.question_id);
  if (!Number.isFinite(questionId) || questionId <= 0) {
    return res.status(400).json({ error: 'question_id kerak' });
  }

  const { error } = await supabase.from('user_answers').insert({
    user_id: userId,
    question_id: questionId,
    lesson_id: lessonId,
    answer: (body.answer ?? {}) as Record<string, unknown>,
    is_correct: typeof body.is_correct === 'boolean' ? body.is_correct : null,
    duration_ms: Number.isFinite(Number(body.duration_ms)) ? Number(body.duration_ms) : null,
  });

  if (error) return res.status(500).json({ error: 'Javob saqlanmadi' });
  return res.status(200).json({ success: true });
}

async function handleLessonPreview(lessonId: number, res: VercelResponse) {
  const preview = await getLessonPreview(supabase, lessonId);
  if (!preview) {
    return res.status(404).json({ error: 'Dars topilmadi' });
  }
  return res.status(200).json(preview);
}

async function handleCompleteLesson(
  userId: number,
  lessonId: number,
  res: VercelResponse
) {
  const access = await getAccessInfo(supabase, userId);
  if (!canAccessLesson(lessonId, access)) {
    return res
      .status(403)
      .json({ error: 'locked', message: 'Ushbu dars uchun tarif kerak' });
  }

  try {
    await recordFullLessonPassInTaskResults(supabase, userId, lessonId);
  } catch (e) {
    console.error('[lessons/complete] lesson_task_results', e);
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }

  const progress = await syncUserLessonProgressPercent(supabase, userId);
  return res.status(200).json({ success: true, progress });
}

export async function routeLessonsRequest(
  req: VercelRequest,
  res: VercelResponse,
  userId: number,
  segments: string[]
) {
  try {
    if (segments.length === 0) {
      if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      return await handleLessonsList(userId, res);
    }

    if (segments.length === 4 && segments[0] === 'path' && segments[2] === 'tasks') {
      if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      const lessonPath = decodeURIComponent(segments[1]);
      const taskNumber = Number(segments[3]);
      if (!Number.isFinite(taskNumber) || taskNumber <= 0) {
        return res.status(400).json({ error: 'taskNumber noto‘g‘ri' });
      }
      return await handleLessonTaskQuestionsByPath(userId, lessonPath, taskNumber, res);
    }

    const lessonIdFromPath = Number(segments[0]);
    if (!Number.isFinite(lessonIdFromPath) || lessonIdFromPath <= 0) {
      const qId = parseLessonIdFromQuery(req);
      if (req.method === 'GET' && segments.includes('preview')) {
        if (qId != null) {
          return await handleLessonPreview(qId, res);
        }
        return res.status(400).json({ error: 'lesson_id query parameter required' });
      }
      // Some proxies / serverless path shapes omit "preview" in segments; still honor query.
      if (req.method === 'GET' && qId != null) {
        return await handleLessonPreview(qId, res);
      }
      return res.status(400).json({ error: 'Lesson id kerak' });
    }

    const lessonId = lessonIdFromPath;

    if (segments.length === 1) {
      if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      return await handleLessonDetail(userId, lessonId, res);
    }

    if (segments.length === 2 && segments[1] === 'preview') {
      if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      return await handleLessonPreview(lessonId, res);
    }

    if (segments.length === 2 && segments[1] === 'complete') {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      return await handleCompleteLesson(userId, lessonId, res);
    }

    if (segments.length === 2 && segments[1] === 'questions') {
      if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      return await handleLessonQuestions(userId, lessonId, res);
    }

    if (segments.length === 2 && segments[1] === 'answers') {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      return await handleLessonAnswer(userId, lessonId, req, res);
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logError(
      'api.lessons.failed',
      err,
      buildRequestLogContext('vercel', req, { segments, userId })
    );
    if (err.message.includes('SUPABASE')) {
      return res.status(503).json({ error: 'Server configuration error' });
    }
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
}
