import '../../../_lib/suppress-dep0169.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../../_lib/supabase.js';
import { setCors, handleOptions } from '../../../_lib/cors.js';
import { requireAdmin } from '../../../_lib/adminAuth.js';

function parseBody(body: unknown): Record<string, unknown> {
  if (body == null) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
}

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
    // GET /api/admin/referrals/withdrawals
    if (req.method === 'GET' && parts[0] === 'withdrawals') {
      const { data: rows, error } = await supabase
        .from('referral_withdrawals')
        .select('id, user_id, amount, card_number, phone, full_name, status, created_at, processed_at, admin_receipt')
        .order('created_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      const userIds = [...new Set((rows ?? []).map((r: any) => r.user_id))];
      const { data: users } = await supabase.from('users').select('id, first_name, last_name, email').in('id', userIds);
      const userMap = new Map((users ?? []).map((u: any) => [u.id, u]));
      const list = (rows ?? []).map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        user: userMap.get(r.user_id) ? [userMap.get(r.user_id)!.first_name, userMap.get(r.user_id)!.last_name].filter(Boolean).join(' ') || (userMap.get(r.user_id) as any).email : '—',
        amount: r.amount,
        card_number: r.card_number ?? '—',
        phone: r.phone ?? '—',
        full_name: r.full_name ?? '—',
        status: r.status,
        created_at: r.created_at,
        processed_at: r.processed_at,
        admin_receipt: r.admin_receipt,
      }));
      return res.status(200).json(list);
    }

    // POST /api/admin/referrals/:id/approve|reject
    if (req.method === 'POST' && parts.length >= 2) {
      const id = Number(parts[0]);
      const action = parts[1];
      if (!id) return res.status(400).json({ error: 'Invalid id' });
      const { data: row } = await supabase.from('referral_withdrawals').select('user_id, amount, status').eq('id', id).single();
      if (!row || (row as any).status !== 'pending') return res.status(404).json({ error: 'Topilmadi' });

      if (action === 'approve') {
        const body = parseBody(req.body);
        const adminReceipt = body.admin_receipt != null ? String(body.admin_receipt) : null;
        await supabase.from('referral_withdrawals').update({
          status: 'approved',
          processed_at: new Date().toISOString(),
          admin_receipt: adminReceipt,
          admin_id: adminId,
        }).eq('id', id);
        return res.status(200).json({ success: true });
      }

      if (action === 'reject') {
        const userId = (row as any).user_id;
        const amount = Number((row as any).amount);
        const { data: user } = await supabase.from('users').select('referral_balance').eq('id', userId).single();
        const balance = Number((user as any)?.referral_balance ?? 0) + amount;
        await supabase.from('users').update({ referral_balance: balance }).eq('id', userId);
        await supabase.from('referral_withdrawals').update({
          status: 'rejected',
          processed_at: new Date().toISOString(),
          admin_id: adminId,
        }).eq('id', id);
        return res.status(200).json({ success: true });
      }
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (e: any) {
    console.error('[api/admin/referrals/[...path]]', e);
    return res.status(500).json({ error: e?.message || 'Xatolik yuz berdi' });
  }
}

