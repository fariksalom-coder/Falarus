import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase.js';
import { setCors, handleOptions } from '../_lib/cors.js';
import { requireAuth } from '../_lib/auth.js';
import {
  getReferralLink,
  getReferralStats,
  getReferralList,
  createWithdrawal,
} from '../_lib/referral.js';

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

  const userId = requireAuth(req, res);
  if (userId == null) return;

  const path = (req.query.path as string[]) || [];
  const segment = path[0] || '';

  try {
    if (segment === 'link' && req.method === 'GET') {
      const result = await getReferralLink(supabase, userId);
      return res.status(200).json(result);
    }
    if (segment === 'stats' && req.method === 'GET') {
      const stats = await getReferralStats(supabase, userId);
      return res.status(200).json(stats);
    }
    if (segment === 'list' && req.method === 'GET') {
      const list = await getReferralList(supabase, userId);
      return res.status(200).json(list);
    }
    if (segment === 'withdraw' && req.method === 'POST') {
      const body = parseBody(req.body);
      const amount = Math.round(Number(body.amount) || 0);
      const result = await createWithdrawal(supabase, userId, amount);
      return res.status(200).json({ success: true, id: result.id, amount: result.amount });
    }
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('[api/referral]', segment, err.message);
    if (segment === 'link') {
      const isSchema = /referral_code|referrals|relation|column/i.test(err.message);
      return res.status(500).json({
        error: isSchema
          ? "Referral tizimi sozlanmagan. Ma'lumotlar bazasiga 009_referral_system.sql migratsiyasini qo'llang."
          : 'Xatolik yuz berdi',
      });
    }
    if (segment === 'withdraw') {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }

  return res.status(404).json({ error: 'Not found' });
}
