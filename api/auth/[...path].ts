/**
 * Single handler for POST /api/auth/register and POST /api/auth/login (Vercel 12-function limit).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../_lib/supabase.js';
import { setCors, handleOptions } from '../_lib/cors.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-uz-ru';

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

function getPathSegment(req: VercelRequest): string | undefined {
  const path = req.query.path;
  if (path !== undefined) {
    const seg = Array.isArray(path) ? path[0] : path;
    if (typeof seg === 'string') return seg;
  }
  const url = req.url || (req as any).originalUrl || '';
  const pathname = typeof url === 'string' ? url.split('?')[0] : '';
  const parts = pathname.split('/').filter(Boolean);
  const authIndex = parts.indexOf('auth');
  if (authIndex >= 0 && authIndex < parts.length - 1) return parts[authIndex + 1];
  return undefined;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const segment = getPathSegment(req);

  try {
    if (segment === 'login') {
      const body = parseBody(req.body);
      const email = body.email as string | undefined;
      const password = body.password as string | undefined;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email va parol kiritilishi shart' });
      }
      const { data: user, error } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
      if (error) {
        console.error('[api/auth/login]', error.message);
        return res.status(500).json({ error: 'Xatolik yuz berdi' });
      }
      if (!user) return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri' });
      const hash = user.password;
      if (typeof hash !== 'string') return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri' });
      const valid = await bcrypt.compare(password, hash);
      if (!valid) return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri' });
      const token = jwt.sign({ id: user.id }, JWT_SECRET);
      return res.status(200).json({
        token,
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          level: user.level,
          onboarded: user.onboarded,
        },
      });
    }

    if (segment === 'register') {
      const body = parseBody(req.body);
      const firstName = body.firstName as string | undefined;
      const lastName = body.lastName as string | undefined;
      const email = body.email as string | undefined;
      const password = body.password as string | undefined;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email va parol kiritilishi shart' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const { data: user, error } = await supabase
        .from('users')
        .insert({
          first_name: firstName ?? '',
          last_name: lastName ?? '',
          email,
          password: hashedPassword,
        })
        .select('id, first_name, last_name, email, level, onboarded')
        .single();
      if (error) {
        if (error.code === '23505') return res.status(400).json({ error: 'Email allaqachon mavjud' });
        console.error('[api/auth/register]', error.message);
        return res.status(500).json({ error: 'Xatolik yuz berdi' });
      }
      if (!user) return res.status(500).json({ error: 'Xatolik yuz berdi' });
      const refCode = typeof body.ref === 'string' ? body.ref.trim() : '';
      if (refCode) {
        const { data: referrer } = await supabase.from('users').select('id').eq('referral_code', refCode).single();
        if (referrer && referrer.id !== user.id) {
          await supabase.from('users').update({ referred_by: referrer.id }).eq('id', user.id);
          await supabase.from('referrals').insert({
            referrer_id: referrer.id,
            referred_user_id: user.id,
            status: 'registered',
            discount_used: false,
          });
        }
      }
      const token = jwt.sign({ id: user.id }, JWT_SECRET);
      return res.status(200).json({
        token,
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          level: user.level ?? 'A0',
          onboarded: user.onboarded ?? 0,
        },
      });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('[api/auth/[...path]]', err.message);
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
}
