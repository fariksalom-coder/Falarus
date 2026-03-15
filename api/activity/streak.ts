import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase.js';
import { setCors, handleOptions } from '../_lib/cors.js';
import { requireAuth } from '../_lib/auth.js';

function todayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const userId = requireAuth(req, res);
  if (userId == null) return;

  try {
    const { data: rows, error } = await supabase
      .from('user_activity_dates')
      .select('activity_date')
      .eq('user_id', userId)
      .order('activity_date', { ascending: false })
      .limit(365);
    if (error) {
      console.error('[api/activity/streak]', error.message);
      return res.status(200).json({ streak_days: 0, last_7_days: [false, false, false, false, false, false, false] });
    }
    const dates = new Set((rows ?? []).map((r: { activity_date: string }) => r.activity_date));
    const today = todayDateString();
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (dates.has(key)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    const last7: boolean[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
      last7.push(dates.has(key));
    }
    return res.status(200).json({ streak_days: streak, last_7_days: last7 });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('[api/activity/streak]', err.message);
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
}
