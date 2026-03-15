import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase.js';
import { setCors, handleOptions } from '../_lib/cors.js';
import { requireAuth } from '../_lib/auth.js';
import { createWithdrawal } from '../_lib/referral.js';

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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = requireAuth(req, res);
  if (userId == null) return;

  const body = parseBody(req.body);
  const amount = Math.round(Number(body.amount) || 0);

  try {
    const result = await createWithdrawal(supabase, userId, amount);
    return res.status(200).json({ success: true, id: result.id, amount: result.amount });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('[api/referral/withdraw]', err.message);
    return res.status(400).json({ error: err.message });
  }
}
