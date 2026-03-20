import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './supabase.js';
import { getAccessInfo } from '../../server/services/subscription.service.js';
import {
  applyLessonsLock,
  canAccessLesson,
  getLessonPreview,
} from '../../server/services/accessControl.service.js';
import { syncUserLessonProgressPercent } from '../../server/services/lessonProgressSnapshot.service.js';
import { buildRequestLogContext, logError } from '../../server/lib/logger.js';

async function handleLessonsList(userId: number, res: VercelResponse) {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('level')
    .eq('id', userId)
    .maybeSingle();
  if (userError) {
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
  if (!user?.level) {
    return res.status(404).json({ error: 'User topilmadi' });
  }

  const { data: lessons, error } = await supabase
    .from('lessons')
    .select('id, level, module_name, title, content_uz, content_ru')
    .eq('level', user.level)
    .order('id');
  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const access = await getAccessInfo(supabase, userId);
  const withLock = applyLessonsLock(
    (lessons ?? []) as Array<{ id: number; [k: string]: unknown }>,
    access
  );
  const lessonIds = (lessons ?? []).map((lesson) => lesson.id);
  let countByLesson: Record<number, number> = {};

  if (lessonIds.length > 0) {
    const { data: exerciseRows, error: exerciseError } = await supabase
      .from('exercises')
      .select('lesson_id')
      .in('lesson_id', lessonIds);
    if (exerciseError) {
      return res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
    countByLesson = (exerciseRows ?? []).reduce((acc, row) => {
      acc[row.lesson_id] = (acc[row.lesson_id] ?? 0) + 1;
      return acc;
    }, {} as Record<number, number>);
  }

  return res.status(200).json(
    withLock.map((lesson) => ({
      ...lesson,
      tasks_count: countByLesson[lesson.id] ?? 0,
    }))
  );
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

  const { data: lesson, error: lessonErr } = await supabase
    .from('lessons')
    .select('id, level, module_name, title, content_uz, content_ru')
    .eq('id', lessonId)
    .maybeSingle();

  if (lessonErr) {
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
  if (!lesson) {
    return res.status(404).json({ error: 'Dars topilmadi' });
  }

  const { data: exercises, error: exercisesError } = await supabase
    .from('exercises')
    .select('id, lesson_id, type, question_uz, options, correct_answer')
    .eq('lesson_id', lessonId)
    .order('id');
  if (exercisesError) {
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }

  const exercisesParsed = (exercises ?? []).map(
    (exercise: { options?: unknown; [k: string]: unknown }) => ({
      ...exercise,
      options:
        typeof exercise.options === 'string'
          ? (() => {
              try {
                return JSON.parse(exercise.options);
              } catch {
                return exercise.options;
              }
            })()
          : exercise.options,
    })
  );

  return res.status(200).json({ ...lesson, exercises: exercisesParsed });
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

  const { error: upsertError } = await supabase.from('user_progress').upsert(
    { user_id: userId, lesson_id: lessonId, completed: 1 },
    { onConflict: 'user_id,lesson_id' }
  );
  if (upsertError) {
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
