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

    const { error } = await supabase
      .from('payments')
      .update({ status: 'rejected', admin_id: adminId })
      .eq('id', payId)
      .eq('status', 'pending');

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  } catch (e: any) {
    console.error('[api/admin/payments/:id/reject]', e);
    return res.status(500).json({ error: e?.message || 'Xatolik yuz berdi' });
  }
}

