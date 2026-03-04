import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase';
import { setCors, handleOptions } from '../_lib/cors';
import { requireAuth } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const userId = requireAuth(req, res);
  if (userId == null) return;

  const { data: user } = await supabase.from('users').select('level').eq('id', userId).single();
  if (!user?.level) {
    res.status(404).json({ error: 'User topilmadi' });
    return;
  }

  const { data: lessons, error } = await supabase.from('lessons').select('*').eq('level', user.level);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.status(200).json(lessons ?? []);
}
