import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_lib/supabase.js';
import { setCors, handleOptions } from './_lib/cors.js';
import { requireAuth } from './_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);

  const userId = requireAuth(req, res);
  if (userId == null) return;

  try {
    if (req.method === 'GET') {
      const lessonPath = req.query.lesson_path as string | undefined;
      let q = supabase
        .from('lesson_task_results')
        .select('lesson_path, task_number, correct, total')
        .eq('user_id', userId);
      if (lessonPath) q = q.eq('lesson_path', lessonPath);
      const { data: rows, error } = await q;
      if (error) {
        console.error('[api/lesson-task-results] GET error:', error.message);
        return res.status(500).json({ error: error.message });
      }
      return res.status(200).json(rows ?? []);
    }

    if (req.method === 'POST') {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const lessonPath = body.lesson_path as string | undefined;
      const taskNumber = body.task_number;
      const correct = Number(body.correct) || 0;
      const total = Number(body.total) || 0;

      if (!lessonPath || taskNumber == null) {
        return res.status(400).json({ error: 'lesson_path va task_number kerak' });
      }

      const row = {
        user_id: userId,
        lesson_path: String(lessonPath),
        task_number: Number(taskNumber),
        correct,
        total,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('lesson_task_results').upsert(row, {
        onConflict: 'user_id,lesson_path,task_number',
      });
      if (error) {
        console.error('[api/lesson-task-results] POST error:', error.message);
        return res.status(500).json({ error: error.message });
      }
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('[api/lesson-task-results]', err.message, err.stack);
    if (err.message.includes('SUPABASE')) {
      return res.status(503).json({ error: 'Server configuration error' });
    }
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
}
