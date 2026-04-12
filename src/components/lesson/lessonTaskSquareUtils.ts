import type { TaskResult } from '../../utils/lessonTaskResults';
import { getLessonTaskResults, isTaskResultGood } from '../../utils/lessonTaskResults';

/** "Topshiriq 1 — matn" → label + hint */
export function splitTaskTitle(full: string): { label: string; hint: string } {
  const sep = ' — ';
  const idx = full.indexOf(sep);
  if (idx === -1) return { label: full.trim(), hint: 'Mashq' };
  return {
    label: full.slice(0, idx).trim(),
    hint: full.slice(idx + sep.length).trim(),
  };
}

export function getTaskResultsMap(
  lessonPath: string,
  override?: Record<number, TaskResult> | null,
): Record<number, TaskResult> {
  return override ?? getLessonTaskResults(lessonPath);
}

export function isTaskLockedSequential(
  taskNum: number,
  results: Record<number, TaskResult>,
): boolean {
  if (taskNum <= 1) return false;
  const prev = results[taskNum - 1];
  return !prev || !isTaskResultGood(prev);
}

/** Navbatdagi vazifa: ketma-ketlikda keyingi ochiq yoki yechilmagan. */
export function getCurrentTaskNumberSequential(
  taskNums: number[],
  results: Record<number, TaskResult>,
): number | null {
  const sorted = [...taskNums].sort((a, b) => a - b);
  for (const t of sorted) {
    if (isTaskLockedSequential(t, results)) continue;
    const r = results[t];
    if (r && isTaskResultGood(r)) continue;
    return t;
  }
  return null;
}

/** Ketma-ketlik yo‘q: birinchi yaxshi o‘tmagan topshiriq “joriy”. */
export function getCurrentTaskNumberFree(
  taskNums: number[],
  results: Record<number, TaskResult>,
): number | null {
  const sorted = [...taskNums].sort((a, b) => a - b);
  for (const t of sorted) {
    const r = results[t];
    if (!r || !isTaskResultGood(r)) return t;
  }
  return null;
}
