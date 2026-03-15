/**
 * POST /api/admin/login — admin panel login (Vercel serverless).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../_lib/supabase.js';
import { setCors, handleOptions } from '../_lib/cors.js';

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET || 'super-secret-key-uz-ru';

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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = parseBody(req.body);
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!email || !password) {
      return res.status(400).json({ error: 'Email va parol kerak' });
    }

    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, email, password_hash')
      .eq('email', email)
      .single();

    if (error || !admin) {
      return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri' });
    }

    const hash = (admin as { password_hash: string }).password_hash;
    const valid = await bcrypt.compare(password, hash);
    if (!valid) {
      return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri' });
    }

    const token = jwt.sign(
      { adminId: (admin as { id: number }).id, email: (admin as { email: string }).email },
      JWT_SECRET
    );
    return res.status(200).json({
      token,
      admin: { id: (admin as { id: number }).id, email: (admin as { email: string }).email },
    });
  } catch (e) {
    console.error('[api/admin/login]', e);
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
}
