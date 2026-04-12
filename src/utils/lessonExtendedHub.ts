import { Link2, ListChecks, Puzzle, type LucideIcon } from 'lucide-react';
import type { ExerciseKind } from '../data/countTasksInSourceArray.js';
import { LESSON_EXTENDED_HUB_TASK_KINDS } from '../data/lessonExtendedHubTaskKinds.js';
import type { LessonTaskSquareItem } from '../components/lesson/LessonTaskSquareGrid';

const HINT_UZ: Record<ExerciseKind, string> = {
  choice: "To'g'ri javobni tanlang",
  matching: 'Juftini toping',
  sentence: 'Gapni tuzing',
};

function iconForKind(kind: ExerciseKind): LucideIcon {
  if (kind === 'choice') return ListChecks;
  if (kind === 'sentence') return Puzzle;
  return Link2;
}

/**
 * 11–24-darslar hubi: "Vazifa N" + uchta standart izohdan biri (1–10-dars bilan mos).
 */
export function buildExtendedHubTasks(
  lessonPath: string,
  routes: { path: string; taskNum: number }[],
): LessonTaskSquareItem[] {
  const kinds = LESSON_EXTENDED_HUB_TASK_KINDS[lessonPath] ?? {};
  return routes.map(({ path, taskNum }) => {
    const kind: ExerciseKind = kinds[taskNum] ?? 'choice';
    return {
      path,
      taskNum,
      label: `Vazifa ${taskNum}`,
      hint: HINT_UZ[kind],
      Icon: iconForKind(kind),
    };
  });
}
