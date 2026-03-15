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
    const { data: user, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, level, onboarded, progress, plan_name, plan_expires_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('[api/user/me] Supabase error:', error.message);
      return res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
    if (!user) {
      return res.status(404).json({ error: 'User topilmadi' });
    }

    return res.status(200).json({
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      level: user.level,
      onboarded: user.onboarded,
      progress: user.progress,
      planName: user.plan_name ?? null,
      planExpiresAt: user.plan_expires_at ?? null,
    });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('[api/user/me]', err.message, err.stack);
    if (err.message.includes('SUPABASE')) {
      return res.status(503).json({ error: 'Server configuration error' });
    }
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
}
