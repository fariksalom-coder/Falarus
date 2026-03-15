/**
 * Single handler for /api/leaderboard and /api/activity/streak to stay under 12 serverless functions.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_lib/supabase.js';
import { setCors, handleOptions } from './_lib/cors.js';
import { requireAuth } from './_lib/auth.js';

function getPathParts(req: VercelRequest): string[] {
  const path = req.query.path;
  if (Array.isArray(path)) return path.filter((p): p is string => typeof p === 'string');
  if (typeof path === 'string') return path ? path.split('/').filter(Boolean) : [];
  const url = req.url || (req as any).originalUrl || '';
  const pathname = typeof url === 'string' ? url.split('?')[0] : '';
  const parts = pathname.split('/').filter(Boolean);
  const apiIndex = parts.indexOf('api');
  if (apiIndex >= 0 && apiIndex < parts.length - 1) return parts.slice(apiIndex + 1);
  return [];
}

function todayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);

  const path = getPathParts(req);
  // POST /api/payments — delegate to payments handler (catch-all would otherwise return 405)
  if (path[0] === 'payments' && path.length === 1 && req.method === 'POST') {
    const paymentsHandler = (await import('./payments/index.js')).default;
    return paymentsHandler(req, res);
  }

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // /api/pricing — public active plans (no auth)
  if (path[0] === 'pricing' && path.length === 1) {
    try {
      const { data, error } = await supabase
        .from('pricing_plans')
        .select('id, plan_name, duration_days, price, discount_percent, active')
        .eq('active', true)
        .order('duration_days', { ascending: true });
      if (error) throw error;
      return res.status(200).json(data ?? []);
    } catch (e) {
      console.error('[api/pricing]', e instanceof Error ? e.message : e);
      return res.status(500).json({ error: 'Xatolik' });
    }
  }

  // /api/tariff-prices?currency=UZS — public (no auth)
  if (path[0] === 'tariff-prices' && path.length === 1) {
    const currency = (typeof req.query.currency === 'string' ? req.query.currency : '').toUpperCase();
    if (!['UZS', 'RUB', 'USD'].includes(currency)) {
      return res.status(400).json({ error: 'currency kerak: UZS, RUB, USD' });
    }
    try {
      const { data, error } = await supabase
        .from('tariff_prices')
        .select('tariff_type, price')
        .eq('currency', currency);
      if (error) throw error;
      const rows = (data ?? []) as { tariff_type: string; price: number }[];
      const out: Record<string, number> = {};
      rows.forEach((r) => { out[r.tariff_type] = Number(r.price); });
      return res.status(200).json({ month: out.month, three_months: out.three_months, year: out.year });
    } catch (e) {
      console.error('[api/tariff-prices]', e instanceof Error ? e.message : e);
      return res.status(500).json({ error: 'Xatolik' });
    }
  }

  // /api/payment-methods?currency=RUB — public (no auth)
  if (path[0] === 'payment-methods' && path.length === 1) {
    const currency = (typeof req.query.currency === 'string' ? req.query.currency : '').toUpperCase();
    if (!['UZS', 'RUB', 'USD'].includes(currency)) {
      return res.status(400).json({ error: 'currency kerak: UZS, RUB, USD' });
    }
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('card_number, phone_number, card_holder_name')
        .eq('currency', currency)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return res.status(200).json(data ?? null);
    } catch (e) {
      console.error('[api/payment-methods]', e instanceof Error ? e.message : e);
      return res.status(500).json({ error: 'Xatolik' });
    }
  }

  // /api/leaderboard
  if (path[0] === 'leaderboard') {
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
        if (rows.length === 0) return res.status(200).json({ top: [], myRank: null });
        const userIds = [...new Set(rows.map((r: { user_id: number }) => r.user_id))];
        const { data: users, error: uErr } = await supabase.from('users').select('id, first_name, last_name, avatar_url').in('id', userIds);
        if (uErr) throw uErr;
        const byId = (users ?? []).reduce((acc: Record<number, any>, u: any) => { acc[u.id] = u; return acc; }, {});
        const top = rows.map((r: any) => {
          const u = byId[r.user_id];
          return { id: u?.id ?? r.user_id, firstName: u?.first_name ?? '', lastName: u?.last_name ?? '', avatarUrl: u?.avatar_url ?? null, points: Number(r.total_points), rank: Number(r.rank) };
        });
        const { data: myRow } = await supabase.from('leaderboard').select('rank, total_points').eq('user_id', userId).maybeSingle();
        const { data: me } = await supabase.from('users').select('id, first_name, last_name, avatar_url').eq('id', userId).single();
        return res.status(200).json({
          top,
          myRank: myRow && me ? { rank: Number(myRow.rank), id: me.id, firstName: me.first_name, lastName: me.last_name, avatarUrl: me.avatar_url, points: Number(myRow.total_points) } : null,
        });
      }
      const col = period === 'monthly' ? 'monthly_points' : 'weekly_points';
      const { data: top, error: topErr } = await supabase.from('users').select('id, first_name, last_name, avatar_url, weekly_points, monthly_points').order(col, { ascending: false }).limit(100);
      if (topErr) throw topErr;
      const { data: me, error: meErr } = await supabase.from('users').select('id, first_name, last_name, avatar_url, weekly_points, monthly_points').eq('id', userId).single();
      if (meErr || !me) return res.status(200).json({ top: top ?? [], myRank: null });
      const myPoints = period === 'monthly' ? (me.monthly_points ?? 0) : (me.weekly_points ?? 0);
      const { count, error: countErr } = await supabase.from('users').select('*', { count: 'exact', head: true }).gt(col, myPoints);
      const rank = countErr ? null : (count ?? 0) + 1;
      return res.status(200).json({
        top: (top ?? []).map((u: any) => ({ id: u.id, firstName: u.first_name, lastName: u.last_name, avatarUrl: u.avatar_url, points: period === 'monthly' ? (u.monthly_points ?? 0) : (u.weekly_points ?? 0) })),
        myRank: rank == null ? null : { rank, id: me.id, firstName: me.first_name, lastName: me.last_name, avatarUrl: me.avatar_url, points: myPoints },
      });
    } catch (e) {
      console.error('[api/leaderboard]', e instanceof Error ? e.message : e);
      return res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  }

  // /api/activity/streak
  if (path[0] === 'activity' && path[1] === 'streak') {
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
        if (dates.has(key)) { streak++; d.setDate(d.getDate() - 1); } else break;
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
      console.error('[api/activity/streak]', e instanceof Error ? e.message : e);
      return res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  }

  return res.status(404).json({ error: 'Not found' });
}
