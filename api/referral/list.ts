import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase.js';
import { setCors, handleOptions } from '../_lib/cors.js';
import { requireAuth } from '../_lib/auth.js';
import { getReferralList } from '../_lib/referral.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = requireAuth(req, res);
  if (userId == null) return;

  try {
    const list = await getReferralList(supabase, userId);
    return res.status(200).json(list);
  } catch (e) {
    console.error('[api/referral/list]', e);
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
}
