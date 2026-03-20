import '../../_lib/suppress-dep0169.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors, handleOptions } from '../../_lib/cors.js';
import { requireAuth } from '../../_lib/auth.js';
import { supabase } from '../../_lib/supabase.js';
import { getLessonPreview } from '../../../server/services/accessControl.service.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = requireAuth(req, res);
  if (userId == null) return;

  const lessonId = Number(req.query.id);
  if (!Number.isFinite(lessonId) || lessonId <= 0) {
    return res.status(400).json({ error: 'Invalid lesson id' });
  }

  try {
    const preview = await getLessonPreview(supabase, lessonId);
    if (!preview) {
      return res.status(404).json({ error: 'Dars topilmadi' });
    }
    return res.status(200).json(preview);
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('[api/lessons/:id/preview]', err.message, err.stack);
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
}
