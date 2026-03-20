const STORAGE_KEY = 'lessonTaskResults';

export type LessonTaskSavedEventDetail = {
  source: 'local' | 'server';
  lessonPath?: string;
  taskNumber?: number;
  correct?: number;
  total?: number;
};

export type TaskResult = { correct: number; total: number };
export type LessonTaskResultSnapshot = {
  lesson_path: string;
  task_number: number;
  correct: number;
  total: number;
};

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

export function mergeLessonTaskResultsFromServer(items: LessonTaskResultSnapshot[]): void {
  const data = load();
  for (const item of items) {
    if (!item?.lesson_path || typeof item.task_number !== 'number') continue;
    if (!data[item.lesson_path]) data[item.lesson_path] = {};
    data[item.lesson_path][String(item.task_number)] = {
      correct: Number(item.correct ?? 0),
      total: Number(item.total ?? 0),
    };
  }
  save(data);
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

export type LessonCompletionStatus = 'not_started' | 'in_progress' | 'completed';

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
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<LessonTaskSavedEventDetail>('lesson-task-saved', {
        detail: {
          source: 'local',
          lessonPath,
          taskNumber,
          correct,
          total,
        },
      })
    );
  }
}

/** Progress threshold: ≥70% unlocks next task / counts toward lesson completion. */
const PASS_RATIO = 0.7;

/** Whether the result passes the course threshold (≥70%). */
export function isTaskResultGood(result: TaskResult): boolean {
  if (result.total <= 0) return false;
  return result.correct / result.total >= PASS_RATIO;
}

/** Shared task button className: not started = white, in progress = orange, passed = green. */
export function getTaskButtonClassName(
  lessonPath: string,
  taskNumber: number,
  isFirst?: boolean,
  resultsOverride?: Record<number, TaskResult>
): string {
  const margin = isFirst ? 'mt-4' : 'mt-2';
  const base = `${margin} w-full rounded-xl border px-4 py-3 font-semibold transition-colors active:scale-[0.99]`;
  const results = resultsOverride ?? getLessonTaskResults(lessonPath);
  const result = results[taskNumber];
  if (!result) {
    return `${base} border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50`;
  }
  if (isTaskResultGood(result)) {
    return `${base} border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100`;
  }
  return `${base} border-orange-200 bg-orange-100 text-orange-800 hover:bg-orange-200`;
}

/** For one lesson: how many tasks passed (≥80%) and overall status. */
export function getLessonCompletionSummary(
  lessonPath: string,
  totalTasks: number
): { passedTasks: number; totalTasks: number; status: LessonCompletionStatus } {
  const allResults = getLessonTaskResults(lessonPath);
  return getLessonCompletionSummaryFromResults(allResults, totalTasks);
}

export function getLessonCompletionSummaryFromResults(
  allResults: Record<number, TaskResult>,
  totalTasks: number
): { passedTasks: number; totalTasks: number; status: LessonCompletionStatus } {
  let attempted = 0;
  let passed = 0;
  for (let i = 1; i <= totalTasks; i += 1) {
    const r = allResults[i];
    if (!r) continue;
    attempted += 1;
    if (isTaskResultGood(r)) passed += 1;
  }
  let status: LessonCompletionStatus = 'not_started';
  if (attempted > 0) status = 'in_progress';
  if (totalTasks > 0 && passed === totalTasks) status = 'completed';
  return { passedTasks: passed, totalTasks, status };
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
