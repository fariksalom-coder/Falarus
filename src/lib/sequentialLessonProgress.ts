/**
 * Sequential (progress-based) access to lessons and tasks.
 * Pass threshold: ≥70% correct to unlock next task / complete lesson.
 */
import { LESSONS } from '../data/lessonsList';
import type { TaskResult } from '../utils/lessonTaskResults';

export const PASS_THRESHOLD = 0.7;

export type TaskResultsMap = Record<string, Record<number, TaskResult>>;

/**
 * Lessons whose exercisesTotal was raised from 2 → 3 during the task-type split.
 * Users who already passed the old 2 tasks should not lose access to later lessons.
 */
const LEGACY_EXERCISES_TOTAL: Readonly<Record<string, number>> = {
  '/lesson-4': 2,
  '/lesson-5': 2,
  '/lesson-10': 2,
};

/** Percentage 0..100 */
export function taskScorePercent(result: TaskResult): number {
  if (result.total <= 0) return 0;
  return (result.correct / result.total) * 100;
}

/** For progression (unlock next): ≥70% */
export function isTaskPassedForProgress(result: TaskResult, threshold = PASS_THRESHOLD): boolean {
  if (result.total <= 0) return false;
  return result.correct / result.total >= threshold;
}

/** All tasks 1..totalTasks must pass for lesson completion */
export function isLessonFullyPassed(
  lessonPath: string,
  totalTasks: number,
  results: TaskResultsMap
): boolean {
  if (totalTasks <= 0) return true;
  const lesson = results[lessonPath] ?? {};
  let allCurrent = true;
  for (let t = 1; t <= totalTasks; t += 1) {
    const r = lesson[t];
    if (!r || !isTaskPassedForProgress(r)) { allCurrent = false; break; }
  }
  if (allCurrent) return true;

  const legacy = LEGACY_EXERCISES_TOTAL[lessonPath];
  if (legacy != null && legacy < totalTasks) {
    for (let t = 1; t <= legacy; t += 1) {
      const r = lesson[t];
      if (!r || !isTaskPassedForProgress(r)) return false;
    }
    return true;
  }
  return false;
}

/** Lesson index 0 = first lesson — always sequentially unlockable (subject to subscription). */
export function isLessonUnlockedBySequence(lessonIndex: number, results: TaskResultsMap): boolean {
  if (lessonIndex <= 0) return true;
  const prev = LESSONS[lessonIndex - 1];
  if (!prev) return false;
  return isLessonFullyPassed(prev.path, prev.exercisesTotal, results);
}

/**
 * Task N is unlocked iff:
 * - lesson is sequentially unlocked, AND
 * - N === 1 OR task N-1 passed (≥70%)
 */
export function isTaskUnlocked(
  lessonPath: string,
  taskNumber: number,
  totalTasks: number,
  results: TaskResultsMap
): boolean {
  if (taskNumber < 1 || taskNumber > totalTasks) return false;
  const lessonIndex = LESSONS.findIndex((l) => l.path === lessonPath);
  if (lessonIndex < 0) return false;
  if (!isLessonUnlockedBySequence(lessonIndex, results)) return false;
  if (taskNumber === 1) return true;
  const prev = results[lessonPath]?.[taskNumber - 1];
  return prev != null && isTaskPassedForProgress(prev);
}

export type LessonSequentialState = {
  lessonPath: string;
  lessonIndex: number;
  title: string;
  taskCount: number;
  isUnlocked: boolean;
  isCompleted: boolean;
  /** First task not yet passed (≥70%), or null if all completed */
  firstBlockedTask: number | null;
};

export function computeLessonStates(results: TaskResultsMap): LessonSequentialState[] {
  return LESSONS.map((l, lessonIndex) => {
    const isUnlocked = isLessonUnlockedBySequence(lessonIndex, results);
    const completed = isLessonFullyPassed(l.path, l.exercisesTotal, results);
    let firstBlockedTask: number | null = null;
    if (isUnlocked && !completed) {
      for (let t = 1; t <= l.exercisesTotal; t += 1) {
        const r = results[l.path]?.[t];
        if (!r || !isTaskPassedForProgress(r)) {
          firstBlockedTask = t;
          break;
        }
      }
    }
    return {
      lessonPath: l.path,
      lessonIndex,
      title: l.title,
      taskCount: l.exercisesTotal,
      isUnlocked,
      isCompleted: completed,
      firstBlockedTask,
    };
  });
}

export function handleTaskResultLogic(
  results: TaskResultsMap,
  lessonPath: string,
  taskNumber: number,
  correct: number,
  total: number
): TaskResultsMap {
  const next: TaskResultsMap = { ...results };
  const lesson = { ...(next[lessonPath] ?? {}) };
  lesson[taskNumber] = { correct, total };
  next[lessonPath] = lesson;
  return next;
}

/**
 * After saving a task result, optionally sync completed-lesson count for legacy code.
 * Not required if UI uses computeLessonStates only.
 */
export function getCompletedLessonsCount(results: TaskResultsMap): number {
  let n = 0;
  for (const l of LESSONS) {
    if (isLessonFullyPassed(l.path, l.exercisesTotal, results)) n += 1;
  }
  return n;
}
