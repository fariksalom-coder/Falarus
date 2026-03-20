import '../_lib/suppress-dep0169.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase.js';
import { setCors, handleOptions } from '../_lib/cors.js';
import { requireAuth } from '../_lib/auth.js';
import { getAccessInfo } from '../../server/services/subscription.service.js';
import { canAccessLesson } from '../../server/services/accessControl.service.js';
import { buildRequestLogContext, logError } from '../../server/lib/logger.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = requireAuth(req, res);
  if (userId == null) return;

  const id = req.query.id as string;
  if (!id) {
    return res.status(400).json({ error: 'Lesson id kerak' });
  }

  try {
    const access = await getAccessInfo(supabase, userId);
    if (!canAccessLesson(Number(id), access)) {
      return res.status(403).json({ error: 'locked', message: 'Ushbu dars uchun tarif kerak' });
    }

    const { data: lesson, error: lessonErr } = await supabase
      .from('lessons')
      .select('id, level, module_name, title, content_uz, content_ru')
      .eq('id', id)
      .maybeSingle();

    if (lessonErr) {
      console.error('[api/lessons/:id] Lesson fetch error:', lessonErr.message);
      return res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
    if (!lesson) {
      return res.status(404).json({ error: 'Dars topilmadi' });
    }

    const { data: exercises } = await supabase
      .from('exercises')
      .select('id, lesson_id, type, question_uz, options, correct_answer')
      .eq('lesson_id', id)
      .order('id');
    const exercisesParsed = (exercises ?? []).map((e: { options?: unknown; [k: string]: unknown }) => ({
      ...e,
      options:
        typeof e.options === 'string'
          ? (() => {
              try {
                return JSON.parse(e.options);
              } catch {
                return e.options;
              }
            })()
          : e.options,
    }));

    return res.status(200).json({ ...lesson, exercises: exercisesParsed });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    logError(
      'api.lessons.detail.failed',
      err,
      buildRequestLogContext('vercel', req, { lessonId: id, userId })
    );
    if (err.message.includes('SUPABASE')) {
      return res.status(503).json({ error: 'Server configuration error' });
    }
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
}
