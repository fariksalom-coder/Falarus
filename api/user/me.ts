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

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, level, onboarded, progress')
      .eq('id', userId)
      .single();

    if (error || !user) {
      res.status(404).json({ error: 'User topilmadi' });
      return;
    }

    res.status(200).json({
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      level: user.level,
      onboarded: user.onboarded,
      progress: user.progress,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
}
