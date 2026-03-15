import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_lib/supabase.js';
import { setCors, handleOptions } from './_lib/cors.js';
import { courseData } from '../src/data/courseData.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { count, error: countError } = await supabase
      .from('lessons')
      .select('id', { count: 'exact', head: true });
    if (countError) {
      console.error('[api/seed] Count error:', countError.message);
      return res.status(500).json({ ok: false, error: countError.message });
    }
    if ((count ?? 0) > 0) {
      return res.status(200).json({ ok: true, message: 'Already seeded', count });
    }

    for (const levelData of courseData) {
      for (const module of levelData.modules) {
        for (const lesson of module.lessons) {
          const { data: lessonRow, error: lessonErr } = await supabase
            .from('lessons')
            .insert({
              level: levelData.level,
              module_name: module.name,
              title: lesson.title,
              content_uz: lesson.content_uz,
              content_ru: lesson.content_ru,
            })
            .select('id')
            .single();
          if (lessonErr || !lessonRow) {
            console.error('[api/seed] Lesson insert error:', lessonErr?.message);
            continue;
          }
          for (const ex of lesson.exercises) {
            await supabase.from('exercises').insert({
              lesson_id: lessonRow.id,
              type: ex.type,
              question_uz: ex.question_uz,
              options: JSON.stringify(ex.options),
              correct_answer: ex.correct_answer,
            });
          }
        }
      }
    }

    return res.status(200).json({ ok: true, message: 'Database seeded successfully' });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('[api/seed]', err.message, err.stack);
    if (err.message.includes('SUPABASE')) {
      return res.status(503).json({ ok: false, error: 'Server configuration error' });
    }
    return res.status(500).json({ ok: false, error: err.message });
  }
}
