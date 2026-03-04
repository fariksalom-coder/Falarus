import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../_lib/supabase';
import { setCors, handleOptions } from '../../_lib/cors';
import { requireAuth } from '../../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const userId = requireAuth(req, res);
  if (userId == null) return;

  const id = req.query.id as string;
  if (!id) {
    res.status(400).json({ error: 'Lesson id kerak' });
    return;
  }

  const { data: lesson, error: lessonErr } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', id)
    .single();

  if (lessonErr || !lesson) {
    res.status(404).json({ error: 'Dars topilmadi' });
    return;
  }

  const { data: exercises } = await supabase.from('exercises').select('*').eq('lesson_id', id);
  const exercisesParsed = (exercises ?? []).map((e: any) => ({
    ...e,
    options: typeof e.options === 'string' ? JSON.parse(e.options) : e.options,
  }));

  res.status(200).json({ ...lesson, exercises: exercisesParsed });
}
