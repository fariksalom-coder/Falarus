import type { Supabase } from '../types/progress';
import type { TaskStatus, LessonStatus } from '../types/progress';
import * as repo from '../repositories/progressRepository';

const PASS_THRESHOLD = 80;

/**
 * Calculate score (percentage) from correct_answers and total_questions.
 */
export function calculateScore(
  correctAnswers: number,
  totalQuestions: number
): number {
  if (totalQuestions <= 0) return 0;
  return Math.round((correctAnswers / totalQuestions) * 100 * 100) / 100;
}

/**
 * Determine task status after finish: PASSED if percentage >= 80, else IN_PROGRESS.
 */
export function getTaskStatusAfterFinish(percentage: number): TaskStatus {
  return percentage >= PASS_THRESHOLD ? 'PASSED' : 'IN_PROGRESS';
}

/**
 * Set task status to IN_PROGRESS and set started_at if not set.
 */
export async function updateTaskStatus(
  supabase: Supabase,
  userId: number,
  taskId: number,
  status: TaskStatus,
  options?: { correctAnswers?: number; totalQuestions?: number; percentage?: number; points?: number }
): Promise<void> {
  const now = new Date().toISOString();
  const existing = await repo.getUserTask(supabase, userId, taskId);

  const startedAt =
    status !== 'NOT_STARTED' ? (existing?.started_at ?? now) : null;
  const completedAt = status === 'PASSED' ? now : existing?.completed_at ?? null;

  await repo.upsertUserTask(supabase, userId, taskId, {
    status,
    started_at: startedAt,
    completed_at: completedAt,
    ...(options?.correctAnswers != null && { correct_answers: options.correctAnswers }),
    ...(options?.totalQuestions != null && { total_questions: options.totalQuestions }),
    ...(options?.percentage != null && { percentage: options.percentage }),
    ...(options?.points != null && { points: options.points }),
  });
}

/**
 * Recompute lesson status from all tasks in the lesson and upsert user_lessons.
 */
export async function updateLessonStatus(
  supabase: Supabase,
  userId: number,
  lessonId: number
): Promise<LessonStatus> {
  const tasks = await repo.getTaskPlanByLesson(supabase, lessonId);
  const taskIds = tasks.map((t) => t.id);
  const userTasks = await repo.getUserTasksForLesson(supabase, userId, taskIds);
  const byTaskId = new Map(userTasks.map((u) => [u.task_id, u]));

  let hasPassed = false;
  let hasInProgress = false;
  let allPassed = true;

  for (const t of tasks) {
    const ut = byTaskId.get(t.id);
    const status = (ut?.status ?? 'NOT_STARTED') as TaskStatus;
    if (status === 'PASSED') hasPassed = true;
    else if (status === 'IN_PROGRESS') hasInProgress = true;
    if (status !== 'PASSED') allPassed = false;
  }

  let lessonStatus: LessonStatus = 'NOT_STARTED';
  if (allPassed) lessonStatus = 'COMPLETED';
  else if (hasPassed || hasInProgress) lessonStatus = 'IN_PROGRESS';

  const existing = await repo.getUserLesson(supabase, userId, lessonId);
  const now = new Date().toISOString();
  const startedAt =
    lessonStatus !== 'NOT_STARTED' ? (existing?.started_at ?? now) : null;
  const completedAt = lessonStatus === 'COMPLETED' ? now : existing?.completed_at ?? null;
  const progress =
    tasks.length > 0
      ? (userTasks.filter((u) => u.status === 'PASSED').length / tasks.length) * 100
      : 0;

  await repo.upsertUserLesson(supabase, userId, lessonId, {
    status: lessonStatus,
    progress: Math.round(progress * 100) / 100,
    started_at: startedAt,
    completed_at: completedAt,
  });

  return lessonStatus;
}

/**
 * Get lesson progress: lesson status + all tasks status (and percentage if completed).
 */
export async function getLessonProgress(
  supabase: Supabase,
  userId: number,
  lessonId: number
) {
  const lesson = await repo.getLessonPlanById(supabase, lessonId);
  if (!lesson) return null;

  const tasks = await repo.getTaskPlanByLesson(supabase, lessonId);
  const taskIds = tasks.map((t) => t.id);
  const userTasks = await repo.getUserTasksForLesson(supabase, userId, taskIds);
  const byTaskId = new Map(userTasks.map((u) => [u.task_id, u]));

  const userLesson = await repo.getUserLesson(supabase, userId, lessonId);
  const lessonStatus = (userLesson?.status ?? 'NOT_STARTED') as LessonStatus;

  const taskStatuses = tasks.map((t) => {
    const ut = byTaskId.get(t.id);
    const status = (ut?.status ?? 'NOT_STARTED') as TaskStatus;
    if (status === 'PASSED' || status === 'IN_PROGRESS') {
      return { id: t.id, status, percentage: ut?.percentage };
    }
    return { id: t.id, status: 'NOT_STARTED' as const };
  });

  return {
    lessonId: lesson.id,
    status: lessonStatus,
    tasks: taskStatuses,
  };
}
