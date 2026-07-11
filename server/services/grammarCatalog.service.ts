import type { DbClient } from '../types/dbClient';
import { getAccessInfo } from './subscription.service.js';
import { LESSONS } from '../../src/data/lessonsList.js';
import { applyLessonsLock } from './accessControl.service.js';
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
  sb: DbClient,
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

// handleGrammarCatalog (Vercel-shaped wrapper) was removed alongside the
// rest of the Vercel-only api/ directory. Express routes call
// buildGrammarCatalogPayload directly and shape the response themselves.
