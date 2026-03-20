import type { SupabaseClient } from '@supabase/supabase-js';
import { LESSONS } from '../../src/data/lessonsList.js';

export const LESSON_PASS_THRESHOLD = 0.7;

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
    let allPassed = true;
    for (let taskNumber = 1; taskNumber <= lesson.exercisesTotal; taskNumber += 1) {
      const row = tasks.get(taskNumber);
      if (!row || !isLessonTaskPassed(row)) {
        allPassed = false;
        break;
      }
    }
    if (allPassed) {
      completed.add(lesson.path);
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
  const [taskRowsResult, legacyRowsResult] = await Promise.allSettled([
    supabase
      .from('lesson_task_results')
      .select('lesson_path, task_number, correct, total')
      .eq('user_id', userId),
    supabase
      .from('user_progress')
      .select('lesson_id, completed')
      .eq('user_id', userId),
  ]);

  const taskRows =
    taskRowsResult.status === 'fulfilled' && !taskRowsResult.value.error
      ? ((taskRowsResult.value.data ?? []) as LessonTaskResultRow[])
      : [];
  const legacyRows =
    legacyRowsResult.status === 'fulfilled' && !legacyRowsResult.value.error
      ? ((legacyRowsResult.value.data ?? []) as LegacyLessonProgressRow[])
      : [];

  if (
    taskRowsResult.status === 'rejected' &&
    legacyRowsResult.status === 'rejected'
  ) {
    throw taskRowsResult.reason;
  }

  if (
    taskRowsResult.status === 'fulfilled' &&
    taskRowsResult.value.error &&
    legacyRowsResult.status === 'fulfilled' &&
    legacyRowsResult.value.error
  ) {
    throw taskRowsResult.value.error;
  }

  return mergeCompletedLessonPathSets(
    getCompletedLessonPathsFromTaskRows(taskRows),
    getCompletedLessonPathsFromLegacyRows(legacyRows)
  );
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
