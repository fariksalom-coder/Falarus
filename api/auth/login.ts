import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../_lib/supabase';
import { setCors, handleOptions } from '../_lib/cors';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-uz-ru';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { email, password } = req.body || {};
  if (!email || !password) {
    res.status(400).json({ error: 'Email va parol kiritilishi shart' });
    return;
  }

  const { data: user, error } = await supabase.from('users').select('*').eq('email', email).single();
  if (error || !user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ error: 'Email yoki parol noto\'g\'ri' });
    return;
  }

  const token = jwt.sign({ id: user.id }, JWT_SECRET);
  res.status(200).json({
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
