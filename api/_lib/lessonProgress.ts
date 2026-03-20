import type { SupabaseClient } from '@supabase/supabase-js';

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

const LESSON_PASS_THRESHOLD = 0.7;

function normalizeLessonPathFromId(lessonId: number): string {
  return `/lesson-${lessonId}`;
}

function parseLessonIdFromPath(path: string): number | null {
  const match = String(path).match(/^\/lesson-(\d+)$/);
  if (!match) return null;
  const lessonId = Number(match[1]);
  return Number.isFinite(lessonId) ? lessonId : null;
}

function isLessonTaskPassed(row: { correct: number; total: number }): boolean {
  if (row.total <= 0) return false;
  return row.correct / row.total >= LESSON_PASS_THRESHOLD;
}

async function getLessonExerciseCounts(supabase: SupabaseClient) {
  const [{ data: lessons, error: lessonsError }, { data: exercises, error: exercisesError }] =
    await Promise.all([
      supabase.from('lessons').select('id').order('id'),
      supabase.from('exercises').select('lesson_id'),
    ]);

  if (lessonsError) throw lessonsError;
  if (exercisesError) throw exercisesError;

  const lessonIds = (lessons ?? []).map((lesson) => Number(lesson.id)).filter(Number.isFinite);
  const countsByLesson = lessonIds.reduce((acc, lessonId) => {
    acc[lessonId] = 0;
    return acc;
  }, {} as Record<number, number>);

  for (const row of exercises ?? []) {
    const lessonId = Number(row.lesson_id);
    if (!Number.isFinite(lessonId)) continue;
    countsByLesson[lessonId] = (countsByLesson[lessonId] ?? 0) + 1;
  }

  return { lessonIds, countsByLesson };
}

function getCompletedLessonIdsFromTaskRows(
  rows: LessonTaskResultRow[],
  lessonIds: number[],
  countsByLesson: Record<number, number>
): Set<number> {
  const passedTasksByLesson = new Map<number, Map<number, LessonTaskResultRow>>();

  for (const row of rows) {
    const lessonId = parseLessonIdFromPath(row.lesson_path);
    if (!lessonId || typeof row.task_number !== 'number') continue;
    let tasks = passedTasksByLesson.get(lessonId);
    if (!tasks) {
      tasks = new Map<number, LessonTaskResultRow>();
      passedTasksByLesson.set(lessonId, tasks);
    }
    tasks.set(row.task_number, row);
  }

  const completed = new Set<number>();
  for (const lessonId of lessonIds) {
    const requiredTasks = countsByLesson[lessonId] ?? 0;
    if (requiredTasks <= 0) continue;
    const tasks = passedTasksByLesson.get(lessonId);
    if (!tasks) continue;

    let allPassed = true;
    for (let taskNumber = 1; taskNumber <= requiredTasks; taskNumber += 1) {
      const row = tasks.get(taskNumber);
      if (!row || !isLessonTaskPassed(row)) {
        allPassed = false;
        break;
      }
    }
    if (allPassed) completed.add(lessonId);
  }

  return completed;
}

function getCompletedLessonIdsFromLegacyRows(rows: LegacyLessonProgressRow[]): Set<number> {
  const completed = new Set<number>();
  for (const row of rows) {
    const lessonId = Number(row.lesson_id);
    if (!Number.isFinite(lessonId)) continue;
    if (row.completed === 1 || row.completed === true) {
      completed.add(lessonId);
    }
  }
  return completed;
}

async function getUserCompletedLessonIds(
  supabase: SupabaseClient,
  userId: number
): Promise<{ completedIds: Set<number>; totalLessons: number }> {
  const [taskRowsResult, legacyRowsResult, catalog] = await Promise.all([
    supabase
      .from('lesson_task_results')
      .select('lesson_path, task_number, correct, total')
      .eq('user_id', userId),
    supabase
      .from('user_progress')
      .select('lesson_id, completed')
      .eq('user_id', userId),
    getLessonExerciseCounts(supabase),
  ]);

  if (taskRowsResult.error) throw taskRowsResult.error;
  if (legacyRowsResult.error) throw legacyRowsResult.error;

  const taskCompleted = getCompletedLessonIdsFromTaskRows(
    (taskRowsResult.data ?? []) as LessonTaskResultRow[],
    catalog.lessonIds,
    catalog.countsByLesson
  );
  const legacyCompleted = getCompletedLessonIdsFromLegacyRows(
    (legacyRowsResult.data ?? []) as LegacyLessonProgressRow[]
  );

  const completedIds = new Set<number>();
  for (const lessonId of taskCompleted) completedIds.add(lessonId);
  for (const lessonId of legacyCompleted) completedIds.add(lessonId);

  return { completedIds, totalLessons: catalog.lessonIds.length };
}

export async function getUserCompletedLessonsCount(
  supabase: SupabaseClient,
  userId: number
): Promise<number> {
  const { completedIds } = await getUserCompletedLessonIds(supabase, userId);
  return completedIds.size;
}

export async function syncUserLessonProgressPercent(
  supabase: SupabaseClient,
  userId: number
): Promise<number> {
  const { completedIds, totalLessons } = await getUserCompletedLessonIds(supabase, userId);
  const progress =
    totalLessons > 0
      ? Math.round((completedIds.size / totalLessons) * 10000) / 100
      : 0;

  const { error } = await supabase.from('users').update({ progress }).eq('id', userId);
  if (error) throw error;
  return progress;
}
