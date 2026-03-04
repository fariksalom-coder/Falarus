import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../_lib/supabase';
import { setCors, handleOptions } from '../_lib/cors';

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

function sendJson(res: VercelResponse, status: number, body: object) {
  res.setHeader('Content-Type', 'application/json');
  return res.status(status).json(body);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    setCors(res);
    if (req.method === 'OPTIONS') return handleOptions(res);
    if (req.method !== 'POST') {
      return sendJson(res, 405, { error: 'Method not allowed' });
    }
    const body = parseBody(req.body);
    const firstName = body.firstName as string | undefined;
    const lastName = body.lastName as string | undefined;
    const email = body.email as string | undefined;
    const password = body.password as string | undefined;
    if (!email || !password) {
      return sendJson(res, 400, { error: 'Email va parol kiritilishi shart' });
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
      if (error.code === '23505') {
        return sendJson(res, 400, { error: 'Email allaqachon mavjud' });
      }
      console.error('[api/auth/register] Supabase error:', error.code, error.message);
      return sendJson(res, 500, { error: 'Xatolik yuz berdi' });
    }
    if (!user) {
      console.error('[api/auth/register] No user returned after insert');
      return sendJson(res, 500, { error: 'Xatolik yuz berdi' });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET);
    return sendJson(res, 200, {
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
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('[api/auth/register]', err.message, err.stack);
    try {
      if (err.message.includes('SUPABASE')) {
        return sendJson(res, 503, { error: 'Server configuration error' });
      }
      return sendJson(res, 500, { error: 'Xatolik yuz berdi' });
    } catch (_) {
      res.status(500).end(JSON.stringify({ error: 'Xatolik yuz berdi' }));
    }
  }
}
