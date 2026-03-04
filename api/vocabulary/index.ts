import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase';
import { setCors, handleOptions } from '../_lib/cors';
import { requireAuth } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);

  const userId = requireAuth(req, res);
  if (userId == null) return;

  if (req.method === 'GET') {
    const { data: words, error } = await supabase.from('vocabulary').select('*').eq('user_id', userId);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.status(200).json(words ?? []);
    return;
  }

  if (req.method === 'POST') {
    const { word_ru, translation_uz, example_ru } = req.body || {};
    const { error } = await supabase.from('vocabulary').insert({
      user_id: userId,
      word_ru: word_ru ?? '',
      translation_uz: translation_uz ?? '',
      example_ru: example_ru ?? '',
    });
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.status(200).json({ success: true });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
