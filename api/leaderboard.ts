import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_lib/supabase.js';
import { setCors, handleOptions } from './_lib/cors.js';
import { requireAuth } from './_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const userId = requireAuth(req, res);
  if (userId == null) return;

  const period = (typeof req.query.period === 'string' ? req.query.period : 'weekly') || 'weekly';
  const useTotalPoints = period === 'all';

  try {
    if (useTotalPoints) {
      const { data: lbRows, error: lbErr } = await supabase
        .from('leaderboard')
        .select('user_id, total_points, rank')
        .order('rank', { ascending: true })
        .limit(100);
      if (lbErr) throw lbErr;
      const rows = lbRows ?? [];
      if (rows.length === 0) {
        return res.status(200).json({ top: [], myRank: null });
      }
      const userIds = [...new Set(rows.map((r: { user_id: number }) => r.user_id))];
      const { data: users, error: uErr } = await supabase
        .from('users')
        .select('id, first_name, last_name, avatar_url')
        .in('id', userIds);
      if (uErr) throw uErr;
      const byId = (users ?? []).reduce((acc: Record<number, any>, u: any) => {
        acc[u.id] = u;
        return acc;
      }, {});
      const top = rows.map((r: any) => {
        const u = byId[r.user_id];
        return {
          id: u?.id ?? r.user_id,
          firstName: u?.first_name ?? '',
          lastName: u?.last_name ?? '',
          avatarUrl: u?.avatar_url ?? null,
          points: Number(r.total_points),
          rank: Number(r.rank),
        };
      });
      const { data: myRow } = await supabase
        .from('leaderboard')
        .select('rank, total_points')
        .eq('user_id', userId)
        .maybeSingle();
      const { data: me } = await supabase
        .from('users')
        .select('id, first_name, last_name, avatar_url')
        .eq('id', userId)
        .single();
      return res.status(200).json({
        top,
        myRank: myRow && me ? {
          rank: Number(myRow.rank),
          id: me.id,
          firstName: me.first_name,
          lastName: me.last_name,
          avatarUrl: me.avatar_url,
          points: Number(myRow.total_points),
        } : null,
      });
    }

    const col = period === 'monthly' ? 'monthly_points' : 'weekly_points';
    const { data: top, error: topErr } = await supabase
      .from('users')
      .select('id, first_name, last_name, avatar_url, weekly_points, monthly_points')
      .order(col, { ascending: false })
      .limit(100);
    if (topErr) throw topErr;
    const { data: me, error: meErr } = await supabase
      .from('users')
      .select('id, first_name, last_name, avatar_url, weekly_points, monthly_points')
      .eq('id', userId)
      .single();
    if (meErr || !me) {
      return res.status(200).json({ top: top ?? [], myRank: null });
    }
    const myPoints = period === 'monthly' ? (me.monthly_points ?? 0) : (me.weekly_points ?? 0);
    const { count, error: countErr } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gt(col, myPoints);
    const rank = countErr ? null : (count ?? 0) + 1;
    return res.status(200).json({
      top: (top ?? []).map((u: any) => ({
        id: u.id,
        firstName: u.first_name,
        lastName: u.last_name,
        avatarUrl: u.avatar_url,
        points: period === 'monthly' ? (u.monthly_points ?? 0) : (u.weekly_points ?? 0),
      })),
      myRank: rank == null ? null : {
        rank,
        id: me.id,
        firstName: me.first_name,
        lastName: me.last_name,
        avatarUrl: me.avatar_url,
        points: myPoints,
      },
    });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('[api/leaderboard]', err.message);
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
}
