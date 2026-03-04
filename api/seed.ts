import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_lib/supabase';
import { setCors, handleOptions } from './_lib/cors';
// @ts-ignore - path from project root
import { courseData } from '../src/data/courseData';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { count, error: countError } = await supabase.from('lessons').select('*', { count: 'exact', head: true });
  if (countError || (count ?? 0) > 0) {
    res.status(200).json({ ok: true, message: 'Already seeded or error', count: count ?? 0 });
    return;
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
        if (lessonErr || !lessonRow) continue;
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

  res.status(200).json({ ok: true, message: 'Database seeded successfully' });
}
