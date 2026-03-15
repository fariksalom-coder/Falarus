import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase.js';
import { setCors, handleOptions } from '../_lib/cors.js';
import { requireAuth } from '../_lib/auth.js';
import { getReferralLink } from '../_lib/referral.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = requireAuth(req, res);
  if (userId == null) return;

  try {
    const result = await getReferralLink(supabase, userId);
    return res.status(200).json(result);
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('[api/referral/link]', err.message);
    const isSchema = /referral_code|referrals|relation|column/i.test(err.message);
    return res.status(500).json({
      error: isSchema
        ? "Referral tizimi sozlanmagan. Ma'lumotlar bazasiga 009_referral_system.sql migratsiyasini qo'llang."
        : 'Xatolik yuz berdi',
    });
  }
}
