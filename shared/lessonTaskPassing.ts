/** Progress threshold: ≥70% unlocks next task / counts toward lesson completion. */
export const LESSON_TASK_PASS_RATIO = 0.7;

export function isLessonTaskResultPassing(correct: number, total: number): boolean {
  if (total <= 0) return false;
  return correct / total >= LESSON_TASK_PASS_RATIO;
}

/**
 * If the user already passed (≥70%) and retries with a failing score, keep the stored result
 * (local + server) so progress and locks do not regress.
 */
export function shouldPreservePreviousLessonTaskResult(
  prev: { correct: number; total: number } | null,
  nextCorrect: number,
  nextTotal: number,
): boolean {
  if (!prev || prev.total <= 0 || nextTotal <= 0) return false;
  return (
    isLessonTaskResultPassing(prev.correct, prev.total) &&
    !isLessonTaskResultPassing(nextCorrect, nextTotal)
  );
}
