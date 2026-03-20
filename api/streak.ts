/**
 * GET /api/streak — streak payload (flat route; reliable on Vercel vs nested api/activity/streak).
 * Legacy: /api/activity/streak → rewritten in vercel.json to /api/streak
 */
import './_lib/suppress-dep0169.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_lib/supabase.js';
import { setCors, handleOptions } from './_lib/cors.js';
import { requireAuth } from './_lib/auth.js';
import { getActivityStreakPayload } from './_lib/activityStreak.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = requireAuth(req, res);
  if (userId == null) return;

  try {
    const payload = await getActivityStreakPayload(supabase, userId);
    return res.status(200).json(payload);
  } catch (e) {
    console.error('[api/streak]', e instanceof Error ? e.message : e);
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
}
