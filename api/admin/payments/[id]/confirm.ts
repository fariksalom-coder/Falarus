import '../../../_lib/suppress-dep0169.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../../_lib/supabase.js';
import { setCors, handleOptions } from '../../../_lib/cors.js';
import { requireAdmin } from '../../../_lib/adminAuth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const adminId = requireAdmin(req, res);
  if (adminId == null) return;

  try {
    const payId = Number(req.query.id);
    if (!payId) return res.status(400).json({ error: 'Invalid id' });

    const { data: row, error: fe } = await supabase
      .from('payments')
      .select('user_id, tariff_type')
      .eq('id', payId)
      .eq('status', 'pending')
      .single();
    if (fe || !row) return res.status(404).json({ error: "To'lov topilmadi" });

    const userId = (row as any).user_id as number;
    const tariffType = (row as any).tariff_type as 'month' | '3months' | 'year';
    const planType = tariffType === 'month' ? 'monthly' : tariffType === '3months' ? 'three_months' : 'yearly';
    const planName = tariffType === 'year' ? '1 YIL' : tariffType === '3months' ? '3 OY' : '1 OY';
    const now = new Date();

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

    await supabase
      .from('users')
      .update({ plan_name: planName, plan_expires_at: ext.toISOString() })
      .eq('id', userId);

    await supabase.from('subscriptions').insert({
      user_id: userId,
      plan_type: planType,
      started_at: now.toISOString(),
      expires_at: ext.toISOString(),
      status: 'active',
    });

    return res.status(200).json({ success: true });
  } catch (e: any) {
    console.error('[api/admin/payments/:id/confirm]', e);
    return res.status(500).json({ error: e?.message || 'Xatolik yuz berdi' });
  }
}

