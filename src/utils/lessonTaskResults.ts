const STORAGE_KEY = 'lessonTaskResults';

export type TaskResult = { correct: number; total: number };

type Stored = Record<string, Record<string, TaskResult>>;

function load(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw) as Stored;
    return data ?? {};
  } catch {
    return {};
  }
}

function save(data: Stored) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

/** Get result for one task. Returns null if not completed. */
export function getLessonTaskResult(lessonPath: string, taskNumber: number): TaskResult | null {
  const data = load();
  const lesson = data[lessonPath];
  if (!lesson) return null;
  const result = lesson[String(taskNumber)];
  return result ?? null;
}

/** Get all task results for a lesson. Keys are task numbers (1-based). */
export function getLessonTaskResults(lessonPath: string): Record<number, TaskResult> {
  const data = load();
  const lesson = data[lessonPath];
  if (!lesson) return {};
  const out: Record<number, TaskResult> = {};
  for (const [key, value] of Object.entries(lesson)) {
    const num = parseInt(key, 10);
    if (!Number.isNaN(num) && value && typeof value.correct === 'number' && typeof value.total === 'number') {
      out[num] = { correct: value.correct, total: value.total };
    }
  }
  return out;
}

/** Save result when user completes a task. */
export function setLessonTaskResult(
  lessonPath: string,
  taskNumber: number,
  correct: number,
  total: number
): void {
  const data = load();
  if (!data[lessonPath]) data[lessonPath] = {};
  data[lessonPath][String(taskNumber)] = { correct, total };
  save(data);
}

/** Whether the result is “good” (≥80% correct). */
export function isTaskResultGood(result: TaskResult): boolean {
  if (result.total <= 0) return false;
  return result.correct / result.total >= 0.8;
}

/** Aggregate all lesson task results (for accuracy stats). */
export function getTotalLessonTaskStats(): { correct: number; total: number } {
  const data = load();
  let correct = 0;
  let total = 0;
  for (const lesson of Object.values(data)) {
    for (const r of Object.values(lesson)) {
      if (r && typeof r.correct === 'number' && typeof r.total === 'number') {
        correct += r.correct;
        total += r.total;
      }
    }
  }
  return { correct, total };
}
