import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase.js';
import { setCors, handleOptions } from '../_lib/cors.js';
import { requireAuth } from '../_lib/auth.js';

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

  try {
    const body = parseBody(req.body);
    const level = body.level as string | undefined;
    const { error } = await supabase.from('users').update({ level, onboarded: 1 }).eq('id', userId);
    if (error) {
      console.error('[api/user/onboard] Supabase error:', error.message);
      return res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
    return res.status(200).json({ success: true });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('[api/user/onboard]', err.message, err.stack);
    if (err.message.includes('SUPABASE')) {
      return res.status(503).json({ error: 'Server configuration error' });
    }
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
}
