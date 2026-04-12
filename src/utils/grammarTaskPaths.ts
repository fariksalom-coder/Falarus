/**
 * URL → canonical (lesson_path, task_number) used by `lesson_task_results` va DB `order_index` diapazonlari.
 */
export function resolveGrammarTaskFromPath(pathname: string): { lessonPath: string; taskNumber: number } | null {
  const normalized = pathname.replace(/\/+$/, '') || pathname;

  const vazifa = normalized.match(/^(\/lesson-(\d+))\/vazifa\/(\d+)$/);
  if (vazifa) {
    return { lessonPath: vazifa[1], taskNumber: Number(vazifa[3]) };
  }

  const m = normalized.match(/^(\/lesson-(\d+))\/(.+)$/);
  if (!m) return null;
  const lessonPath = m[1];
  const lessonNum = Number(m[2]);
  const tail = m[3];

  if (lessonNum === 11) {
    if (tail === 'mustahkamlash') return { lessonPath, taskNumber: 1 };
    if (tail === 'zadanie-1') return { lessonPath, taskNumber: 2 };
    const tm = tail.match(/^topshiriq-(\d+)$/);
    if (tm) return { lessonPath, taskNumber: Number(tm[1]) + 1 };
    return null;
  }

  if (lessonNum === 15) {
    if (tail === 'mustahkamlash') return { lessonPath, taskNumber: 1 };
    const tm = tail.match(/^topshiriq-(\d+)$/);
    if (tm) return { lessonPath, taskNumber: Number(tm[1]) + 1 };
    return null;
  }

  const tm = tail.match(/^topshiriq-(\d+)$/);
  if (tm) return { lessonPath, taskNumber: Number(tm[1]) };
  return null;
}
