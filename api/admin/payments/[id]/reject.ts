import '../../_lib/suppress-dep0169.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { supabase } from '../../_lib/supabase.js';
import { setCors, handleOptions } from '../../_lib/cors.js';

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
    const { error } = await supabase
      .from('payments')
      .update({ status: 'rejected' })
      .eq('id', payId)
      .eq('status', 'pending');
    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('[api/admin/payments/:id/reject]', e);
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
}

