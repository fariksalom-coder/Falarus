import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase';
import { setCors, handleOptions } from '../_lib/cors';
import { requireAuth } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const userId = requireAuth(req, res);
  if (userId == null) return;

  const { level } = req.body || {};
  await supabase.from('users').update({ level, onboarded: 1 }).eq('id', userId);
  res.status(200).json({ success: true });
}
