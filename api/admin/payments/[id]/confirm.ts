import '../../../_lib/suppress-dep0169.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { supabase } from '../../../_lib/supabase.js';
import { setCors, handleOptions } from '../../../_lib/cors.js';

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET || 'super-secret-key-uz-ru';

function getAdminId(req: VercelRequest): number | null {
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { adminId?: number; id?: number };
    const adminId = decoded.adminId ?? decoded.id;
    return adminId != null && typeof adminId === 'number' ? adminId : null;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const adminId = getAdminId(req);
  if (adminId == null) return res.status(401).json({ error: 'Token kerak' });

  const idParam = (req.query.id ?? (req as any).query?.id) as string | string[] | undefined;
  const idStr = Array.isArray(idParam) ? idParam[0] : idParam;
  const payId = Number(idStr);
  if (!payId) return res.status(400).json({ error: 'Invalid id' });

  try {
    const { data: row, error: fe } = await supabase
      .from('payments')
      .select('user_id, tariff_type, status')
      .eq('id', payId)
      .maybeSingle();
    if (fe) return res.status(500).json({ error: fe.message });
    if (!row || (row as any).status !== 'pending') {
      return res.status(404).json({ error: "To'lov topilmadi" });
    }

    const userId = Number((row as any).user_id);
    if (!Number.isFinite(userId)) return res.status(400).json({ error: "To'lovda user_id xato" });
    const tariffType = (row as any).tariff_type as string; // month | 3months | year
    const planType = tariffType === 'month' ? 'monthly' : tariffType === '3months' ? 'three_months' : 'yearly';
    const now = new Date();
    const planName = tariffType === 'year' ? '1 YIL' : tariffType === '3months' ? '3 OY' : '1 OY';

    const { error: updErr } = await supabase
      .from('payments')
      .update({ status: 'approved', approved_at: now.toISOString(), admin_id: adminId })
      .eq('id', payId)
      .eq('status', 'pending');
    if (updErr) return res.status(500).json({ error: updErr.message });

    const { data: current, error: curErr } = await supabase
      .from('users')
      .select('plan_expires_at')
      .eq('id', userId)
      .maybeSingle();
    if (curErr) return res.status(500).json({ error: curErr.message });

    const currentEnd = current?.plan_expires_at ? new Date(current.plan_expires_at as any) : null;
    const startFrom = currentEnd && currentEnd > now ? currentEnd : now;
    const ext = new Date(startFrom);
    if (tariffType === 'month') ext.setMonth(ext.getMonth() + 1);
    else if (tariffType === '3months') ext.setMonth(ext.getMonth() + 3);
    else ext.setFullYear(ext.getFullYear() + 1);

    const { error: userErr } = await supabase
      .from('users')
      .update({ plan_name: planName, plan_expires_at: ext.toISOString() })
      .eq('id', userId);
    if (userErr) return res.status(500).json({ error: userErr.message });

    const { error: subErr } = await supabase.from('subscriptions').insert({
      user_id: userId,
      plan_type: planType,
      started_at: now.toISOString(),
      expires_at: ext.toISOString(),
      status: 'active',
    });
    if (subErr) return res.status(500).json({ error: subErr.message });

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('[api/admin/payments/:id/confirm]', e);
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
}

