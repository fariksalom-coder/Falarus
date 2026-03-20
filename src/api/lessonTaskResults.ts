import { apiUrl } from '../api';
import type { LessonTaskSavedEventDetail } from '../utils/lessonTaskResults';

export type LessonTaskResultItem = {
  lesson_path: string;
  task_number: number;
  correct: number;
  total: number;
};

/** Fetch lesson task results from server. Optionally filter by lessonPath (e.g. '/lesson-14'). */
export async function fetchLessonTaskResults(
  token: string | null,
  lessonPath?: string
): Promise<LessonTaskResultItem[]> {
  if (!token) return [];
  try {
    const url = lessonPath
      ? apiUrl(`/api/lesson-task-results?lesson_path=${encodeURIComponent(lessonPath)}`)
      : apiUrl('/api/lesson-task-results');
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as LessonTaskResultItem[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** Save one task result to the server. */
export async function saveLessonTaskResult(
  token: string | null,
  lessonPath: string,
  taskNumber: number,
  correct: number,
  total: number
): Promise<void> {
  if (!token) return;
  try {
    const res = await fetch(apiUrl('/api/lesson-task-results'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        lesson_path: lessonPath,
        task_number: taskNumber,
        correct,
        total,
      }),
    });
    if (res.ok && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent<LessonTaskSavedEventDetail>('lesson-task-saved', {
          detail: {
            source: 'server',
            lessonPath,
            taskNumber,
            correct,
            total,
          },
        })
      );
    }
  } catch {
    // ignore
  }
}

/** Convert API list to Record<taskNumber, { correct, total }> for a given lesson path. */
export function lessonTaskResultsToMap(
  items: LessonTaskResultItem[],
  lessonPath: string
): Record<number, { correct: number; total: number }> {
  const out: Record<number, { correct: number; total: number }> = {};
  for (const row of items) {
    if (row.lesson_path === lessonPath && typeof row.task_number === 'number') {
      out[row.task_number] = { correct: row.correct, total: row.total };
    }
  }
  return out;
}
