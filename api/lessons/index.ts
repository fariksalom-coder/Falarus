import '../_lib/suppress-dep0169.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase.js';
import { setCors, handleOptions } from '../_lib/cors.js';
import { requireAuth } from '../_lib/auth.js';

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
    return res.status(200).json(lessons ?? []);
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('[api/lessons]', err.message, err.stack);
    if (err.message.includes('SUPABASE')) {
      return res.status(503).json({ error: 'Server configuration error' });
    }
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
}
