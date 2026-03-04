import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../_lib/supabase';
import { setCors, handleOptions } from '../../_lib/cors';
import { requireAuth } from '../../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);
  if (req.method !== 'POST') {
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

  await supabase.from('user_progress').upsert(
    { user_id: userId, lesson_id: Number(id), completed: 1 },
    { onConflict: 'user_id,lesson_id' }
  );

  const { data: user } = await supabase.from('users').select('level').eq('id', userId).single();
  if (!user?.level) {
    res.status(200).json({ success: true, progress: 0 });
    return;
  }

  const { count: total } = await supabase
    .from('lessons')
    .select('*', { count: 'exact', head: true })
    .eq('level', user.level);
  const { count: completed } = await supabase
    .from('user_progress')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('completed', 1);

  const progress = total && total > 0 ? ((completed ?? 0) / total) * 100 : 0;
  await supabase.from('users').update({ progress }).eq('id', userId);
  res.status(200).json({ success: true, progress });
}
