import type { VercelResponse } from '@vercel/node';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase.js';
import { getAccessInfo } from './subscription.js';
import { LESSONS } from '../../src/data/lessonsList.js';
import { applyLessonsLock } from './accessControl.js';
import { aggregateTasksByLesson, lessonTaskListFromAggregate, type QuestionRow } from '../../shared/grammarCatalog.js';

export type GrammarCatalogPayload = {
  lessons: Array<{
    id: number;
    path: string;
    title: string;
    titleUz: string;
    titleRu: string;
    locked: boolean;
    exercisesTotal: number;
    tasks: Array<{ taskNumber: number; questionCount: number }>;
  }>;
};

export async function buildGrammarCatalogPayload(
  sb: SupabaseClient,
  userId: number,
): Promise<{ ok: true; payload: GrammarCatalogPayload } | { ok: false; error: string }> {
  const access = await getAccessInfo(sb, userId);
  const lockedList = applyLessonsLock(
    LESSONS.map((l) => ({ id: l.id, title: l.title })),
    access,
  );
  const lockById = new Map(lockedList.map((x) => [x.id, x.locked]));

  const ids = LESSONS.map((l) => l.id);
  const { data: qrows, error } = await sb
    .from('questions')
    .select('lesson_id, order_index')
    .in('lesson_id', ids)
    .eq('is_active', true);

  if (error) {
    return { ok: false, error: 'Savollar yuklanmadi' };
  }

  const agg = aggregateTasksByLesson((qrows ?? []) as QuestionRow[]);

  const lessons = LESSONS.map((meta) => ({
    id: meta.id,
    path: meta.path,
    title: meta.title,
    titleUz: meta.titleUz ?? meta.title,
    titleRu: meta.titleRu ?? meta.title,
    locked: lockById.get(meta.id) ?? true,
    exercisesTotal: meta.exercisesTotal,
    tasks: lessonTaskListFromAggregate(meta.id, meta.exercisesTotal, agg),
  }));

  return { ok: true, payload: { lessons } };
}

export async function handleGrammarCatalog(userId: number, res: VercelResponse): Promise<VercelResponse> {
  const result = await buildGrammarCatalogPayload(supabase, userId);
  if (result.ok === false) return res.status(500).json({ error: result.error });
  return res.status(200).json(result.payload);
}
