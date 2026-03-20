import '../_lib/suppress-dep0169.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase.js';
import { setCors, handleOptions } from '../_lib/cors.js';
import { requireAuth } from '../_lib/auth.js';
import { getAccessInfo } from '../../server/services/subscription.service.js';
import { applyLessonsLock } from '../../server/services/accessControl.service.js';
import { buildRequestLogContext, logError } from '../../server/lib/logger.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = requireAuth(req, res);
  if (userId == null) return;

  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('level')
      .eq('id', userId)
      .maybeSingle();
    if (userError) {
      console.error('[api/lessons] User fetch error:', userError.message);
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
      console.error('[api/lessons] Lessons fetch error:', error.message);
      return res.status(500).json({ error: error.message });
    }
    const access = await getAccessInfo(supabase, userId);
    const withLock = applyLessonsLock((lessons ?? []) as Array<{ id: number; [k: string]: unknown }>, access);
    const lessonIds = (lessons ?? []).map((lesson) => lesson.id);
    let countByLesson: Record<number, number> = {};
    if (lessonIds.length > 0) {
      const { data: exerciseRows, error: exerciseError } = await supabase
        .from('exercises')
        .select('lesson_id')
        .in('lesson_id', lessonIds);
      if (exerciseError) {
        console.error('[api/lessons] Exercise count error:', exerciseError.message);
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
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    logError('api.lessons.index.failed', err, buildRequestLogContext('vercel', req, { userId }));
    if (err.message.includes('SUPABASE')) {
      return res.status(503).json({ error: 'Server configuration error' });
    }
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
}
