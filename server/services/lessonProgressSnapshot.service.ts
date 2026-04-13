import type { SupabaseClient } from '@supabase/supabase-js';
import { LESSONS } from '../../src/data/lessonsList.js';

export const LESSON_PASS_THRESHOLD = 0.7;

const LEGACY_EXERCISES_TOTAL: Readonly<Record<string, number>> = {
  '/lesson-4': 2,
  '/lesson-5': 2,
  '/lesson-10': 2,
};

type LessonTaskResultRow = {
  lesson_path: string;
  task_number: number;
  correct: number;
  total: number;
};

type LegacyLessonProgressRow = {
  lesson_id: number;
  completed: number | boolean | null;
};

export function normalizeLessonPathFromId(lessonId: number): string {
  return `/lesson-${lessonId}`;
}

export function isLessonTaskPassed(row: {
  correct: number;
  total: number;
}): boolean {
  if (row.total <= 0) return false;
  return row.correct / row.total >= LESSON_PASS_THRESHOLD;
}

export function getCompletedLessonPathsFromTaskRows(
  rows: LessonTaskResultRow[]
): Set<string> {
  const passedTasksByLesson = new Map<string, Map<number, LessonTaskResultRow>>();

  for (const row of rows) {
    if (!row?.lesson_path || typeof row.task_number !== 'number') continue;
    let tasks = passedTasksByLesson.get(row.lesson_path);
    if (!tasks) {
      tasks = new Map<number, LessonTaskResultRow>();
      passedTasksByLesson.set(row.lesson_path, tasks);
    }
    tasks.set(row.task_number, row);
  }

  const completed = new Set<string>();
  for (const lesson of LESSONS) {
    const tasks = passedTasksByLesson.get(lesson.path);
    if (!tasks) continue;

    let allCurrent = true;
    for (let t = 1; t <= lesson.exercisesTotal; t += 1) {
      const row = tasks.get(t);
      if (!row || !isLessonTaskPassed(row)) { allCurrent = false; break; }
    }
    if (allCurrent) { completed.add(lesson.path); continue; }

    const legacy = LEGACY_EXERCISES_TOTAL[lesson.path];
    if (legacy != null && legacy < lesson.exercisesTotal) {
      let legacyOk = true;
      for (let t = 1; t <= legacy; t += 1) {
        const row = tasks.get(t);
        if (!row || !isLessonTaskPassed(row)) { legacyOk = false; break; }
      }
      if (legacyOk) completed.add(lesson.path);
    }
  }

  return completed;
}

export function getCompletedLessonPathsFromLegacyRows(
  rows: LegacyLessonProgressRow[]
): Set<string> {
  const completed = new Set<string>();
  for (const row of rows) {
    if (!row?.lesson_id) continue;
    if (row.completed === 1 || row.completed === true) {
      completed.add(normalizeLessonPathFromId(row.lesson_id));
    }
  }
  return completed;
}

export function mergeCompletedLessonPathSets(
  ...sets: Array<Set<string>>
): Set<string> {
  const merged = new Set<string>();
  for (const set of sets) {
    for (const path of set) {
      merged.add(path);
    }
  }
  return merged;
}

export async function getUserCompletedLessonPaths(
  supabase: SupabaseClient,
  userId: number
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('lesson_task_results')
    .select('lesson_path, task_number, correct, total')
    .eq('user_id', userId);
  if (error) throw error;
  const taskRows = (data ?? []) as LessonTaskResultRow[];
  return getCompletedLessonPathsFromTaskRows(taskRows);
}

/**
 * Mark every task in a lesson as passed (1/1) in lesson_task_results.
 * Used when the client finishes the lesson flow via POST .../lessons/:id/complete
 * (replaces removed user_progress row).
 */
export async function recordFullLessonPassInTaskResults(
  supabase: SupabaseClient,
  userId: number,
  lessonId: number
): Promise<void> {
  const meta = LESSONS.find((l) => l.id === lessonId);
  if (!meta) throw new Error('Lesson not found');
  const lessonPath = meta.path;
  const n = Math.max(0, Number(meta.exercisesTotal ?? 0));
  const now = new Date().toISOString();
  for (let taskNumber = 1; taskNumber <= n; taskNumber += 1) {
    const { error } = await supabase.from('lesson_task_results').upsert(
      {
        user_id: userId,
        lesson_path: lessonPath,
        task_number: taskNumber,
        correct: 1,
        total: 1,
        updated_at: now,
      },
      { onConflict: 'user_id,lesson_path,task_number' }
    );
    if (error) throw error;
  }
}

export async function getUserCompletedLessonsCount(
  supabase: SupabaseClient,
  userId: number
): Promise<number> {
  const paths = await getUserCompletedLessonPaths(supabase, userId);
  return paths.size;
}

export async function syncUserLessonProgressPercent(
  supabase: SupabaseClient,
  userId: number
): Promise<number> {
  const completedCount = await getUserCompletedLessonsCount(supabase, userId);
  const progress =
    LESSONS.length > 0
      ? Math.round((completedCount / LESSONS.length) * 10000) / 100
      : 0;

  const { error } = await supabase.from('users').update({ progress }).eq('id', userId);
  if (error) throw error;

  return progress;
}
