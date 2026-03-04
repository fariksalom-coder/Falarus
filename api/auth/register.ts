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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = parseBody(req.body);
    const firstName = body.firstName as string | undefined;
    const lastName = body.lastName as string | undefined;
    const email = body.email as string | undefined;
    const password = body.password as string | undefined;
    if (!email || !password) {
      res.status(400).json({ error: 'Email va parol kiritilishi shart' });
      return;
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
        res.status(400).json({ error: 'Email allaqachon mavjud' });
        return;
      }
      throw error;
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET);
    res.status(200).json({
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
    console.error(e);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
}
