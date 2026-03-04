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

  const userId = requireAuth(req, res);
  if (userId == null) return;

  try {
    if (req.method === 'GET') {
      const { data: words, error } = await supabase.from('vocabulary').select('*').eq('user_id', userId);
      if (error) {
        console.error('[api/vocabulary] GET error:', error.message);
        return res.status(500).json({ error: error.message });
      }
      return res.status(200).json(words ?? []);
    }

    if (req.method === 'POST') {
      const body = parseBody(req.body);
      const word_ru = body.word_ru as string | undefined;
      const translation_uz = body.translation_uz as string | undefined;
      const example_ru = body.example_ru as string | undefined;
      const { error } = await supabase.from('vocabulary').insert({
        user_id: userId,
        word_ru: word_ru ?? '',
        translation_uz: translation_uz ?? '',
        example_ru: example_ru ?? '',
      });
      if (error) {
        console.error('[api/vocabulary] POST error:', error.message);
        return res.status(500).json({ error: error.message });
      }
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('[api/vocabulary]', err.message, err.stack);
    if (err.message.includes('SUPABASE')) {
      return res.status(503).json({ error: 'Server configuration error' });
    }
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
}
