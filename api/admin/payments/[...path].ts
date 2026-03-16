import '../../../_lib/suppress-dep0169.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../../_lib/supabase.js';
import { setCors, handleOptions } from '../../../_lib/cors.js';
import { requireAdmin } from '../../../_lib/adminAuth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);
  const adminId = requireAdmin(req, res);
  if (adminId == null) return;

  const partsRaw = req.query.path;
  const parts = Array.isArray(partsRaw)
    ? partsRaw.map(String).filter(Boolean)
    : typeof partsRaw === 'string'
      ? partsRaw.split('/').filter(Boolean)
      : [];

  try {
    // GET /api/admin/payments
    if (req.method === 'GET' && parts.length === 0) {
      const { data: rows, error } = await supabase
        .from('payments')
        .select('id, user_id, tariff_type, currency, payment_proof_url, payment_time, status, created_at, approved_at')
        .order('created_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      const userIds = [...new Set((rows ?? []).map((r: any) => r.user_id))];
      const { data: users } = await supabase.from('users').select('id, first_name, last_name, email').in('id', userIds);
      const userMap = new Map((users ?? []).map((u: any) => [u.id, u]));
      const planLabel: Record<string, string> = { month: '1 OY', '3months': '3 OY', year: '1 YIL' };
      const list = (rows ?? []).map((r: any) => {
        const u = userMap.get(r.user_id);
        return {
          id: r.id,
          user_id: r.user_id,
          user: u ? [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email : '—',
          user_email: u?.email ?? '—',
          plan: planLabel[r.tariff_type] ?? r.tariff_type,
          tariff_type: r.tariff_type,
          currency: r.currency,
          payment_proof_url: r.payment_proof_url ?? null,
          payment_time: r.payment_time ?? r.created_at ?? '',
          date: r.created_at ?? '',
          status: r.status,
          approved_at: r.approved_at ?? null,
        };
      });
      return res.status(200).json(list);
    }

    // POST /api/admin/payments/:id/confirm|reject
    if (req.method === 'POST' && parts.length >= 2) {
      const payId = Number(parts[0]);
      const action = parts[1];
      if (!payId) return res.status(400).json({ error: 'Invalid id' });

      if (action === 'confirm') {
        const { data: row, error: fe } = await supabase
          .from('payments')
          .select('user_id, tariff_type')
          .eq('id', payId)
          .eq('status', 'pending')
          .single();
        if (fe || !row) return res.status(404).json({ error: "To'lov topilmadi" });

        const userId = (row as any).user_id;
        const tariffType = (row as any).tariff_type; // month | 3months | year
        const planType = tariffType === 'month' ? 'monthly' : tariffType === '3months' ? 'three_months' : 'yearly';
        const now = new Date();
        const planName = tariffType === 'year' ? '1 YIL' : tariffType === '3months' ? '3 OY' : '1 OY';

        await supabase
          .from('payments')
          .update({ status: 'approved', approved_at: now.toISOString(), admin_id: adminId })
          .eq('id', payId);

        const { data: current } = await supabase.from('users').select('plan_expires_at').eq('id', userId).single();
        const currentEnd = current?.plan_expires_at ? new Date(current.plan_expires_at) : null;
        const startFrom = currentEnd && currentEnd > now ? currentEnd : now;
        const ext = new Date(startFrom);
        if (tariffType === 'month') ext.setMonth(ext.getMonth() + 1);
        else if (tariffType === '3months') ext.setMonth(ext.getMonth() + 3);
        else ext.setFullYear(ext.getFullYear() + 1);

        await supabase.from('users').update({ plan_name: planName, plan_expires_at: ext.toISOString() }).eq('id', userId);
        await supabase.from('subscriptions').insert({
          user_id: userId,
          plan_type: planType,
          started_at: now.toISOString(),
          expires_at: ext.toISOString(),
          status: 'active',
        });
        return res.status(200).json({ success: true });
      }

      if (action === 'reject') {
        const { error } = await supabase
          .from('payments')
          .update({ status: 'rejected', admin_id: adminId })
          .eq('id', payId)
          .eq('status', 'pending');
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true });
      }
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (e: any) {
    console.error('[api/admin/payments/[...path]]', e);
    return res.status(500).json({ error: e?.message || 'Xatolik yuz berdi' });
  }
}

