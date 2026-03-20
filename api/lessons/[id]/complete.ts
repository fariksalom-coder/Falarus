import '../../_lib/suppress-dep0169.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../_lib/supabase.js';
import { setCors, handleOptions } from '../../_lib/cors.js';
import { requireAuth } from '../../_lib/auth.js';
import { getAccessInfo } from '../../../server/services/subscription.service.js';
import { canAccessLesson } from '../../../server/services/accessControl.service.js';
import { syncUserLessonProgressPercent } from '../../../server/services/lessonProgressSnapshot.service.js';
import { buildRequestLogContext, logError } from '../../../server/lib/logger.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);
  if (req.method !== 'POST') {
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

    const { error: upsertError } = await supabase.from('user_progress').upsert(
      { user_id: userId, lesson_id: Number(id), completed: 1 },
      { onConflict: 'user_id,lesson_id' }
    );
    if (upsertError) {
      console.error('[api/lessons/:id/complete] Upsert error:', upsertError.message);
      return res.status(500).json({ error: 'Xatolik yuz berdi' });
    }

    const progress = await syncUserLessonProgressPercent(supabase, userId);
    return res.status(200).json({ success: true, progress });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    logError(
      'api.lessons.complete.failed',
      err,
      buildRequestLogContext('vercel', req, { lessonId: id, userId })
    );
    if (err.message.includes('SUPABASE')) {
      return res.status(503).json({ error: 'Server configuration error' });
    }
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
}
