import '../../_lib/suppress-dep0169.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../_lib/supabase.js';
import { setCors, handleOptions } from '../../_lib/cors.js';
import { requireAuth } from '../../_lib/auth.js';

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
    const { error: upsertError } = await supabase.from('user_progress').upsert(
      { user_id: userId, lesson_id: Number(id), completed: 1 },
      { onConflict: 'user_id,lesson_id' }
    );
    if (upsertError) {
      console.error('[api/lessons/:id/complete] Upsert error:', upsertError.message);
      return res.status(500).json({ error: 'Xatolik yuz berdi' });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('level')
      .eq('id', userId)
      .maybeSingle();
    if (userError || !user?.level) {
      return res.status(200).json({ success: true, progress: 0 });
    }

    const { count: total } = await supabase
      .from('lessons')
      .select('id', { count: 'exact', head: true })
      .eq('level', user.level);
    const { count: completed } = await supabase
      .from('user_progress')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('completed', 1);

    const progress = total && total > 0 ? ((completed ?? 0) / total) * 100 : 0;
    await supabase.from('users').update({ progress }).eq('id', userId);
    return res.status(200).json({ success: true, progress });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('[api/lessons/:id/complete]', err.message, err.stack);
    if (err.message.includes('SUPABASE')) {
      return res.status(503).json({ error: 'Server configuration error' });
    }
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
}
