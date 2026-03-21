import type { VercelRequest, VercelResponse } from '@vercel/node';
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

    const lessonId = Number(segments[0]);
    if (!Number.isFinite(lessonId) || lessonId <= 0) {
      return res.status(400).json({ error: 'Lesson id kerak' });
    }

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
