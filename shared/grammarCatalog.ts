/**
 * Pure helpers for GET /api/grammar/catalog — aggregate `questions.order_index` into per-task counts.
 */

export type QuestionRow = { lesson_id: number; order_index: number };

export type TaskAgg = { taskNumber: number; questionCount: number };

export function aggregateTasksByLesson(rows: QuestionRow[]): Map<number, Map<number, number>> {
  const byLesson = new Map<number, Map<number, number>>();
  for (const r of rows) {
    const lid = Number(r.lesson_id);
    const oi = Number(r.order_index);
    if (!Number.isFinite(lid) || !Number.isFinite(oi)) continue;
    const taskNum = Math.floor(oi / 1000);
    if (taskNum <= 0) continue;
    let m = byLesson.get(lid);
    if (!m) {
      m = new Map();
      byLesson.set(lid, m);
    }
    m.set(taskNum, (m.get(taskNum) ?? 0) + 1);
  }
  return byLesson;
}

export function lessonTaskListFromAggregate(
  lessonId: number,
  expectedTaskCount: number,
  agg: Map<number, Map<number, number>>,
): TaskAgg[] {
  const m = agg.get(lessonId) ?? new Map();
  const list: TaskAgg[] = [];
  for (let t = 1; t <= expectedTaskCount; t += 1) {
    const c = m.get(t) ?? 0;
    list.push({ taskNumber: t, questionCount: c });
  }
  return list;
}
