import { Link2, ListChecks, Puzzle, type LucideIcon } from 'lucide-react';
import type { LessonOneTask } from '../data/lessonOneTasks';
import type { LessonTaskSquareItem } from '../components/lesson/LessonTaskSquareGrid';

function iconForTasks(tasks: LessonOneTask[]): LucideIcon {
  const t = tasks[0]?.type;
  if (t === 'choice') return ListChecks;
  if (t === 'sentence') return Puzzle;
  return Link2;
}

/** Hub kartalari: har bir vazifa bitta mashq turiga mos ikonka. */
export function buildVazifaHubTasks(
  lessonPath: string,
  vazifalari: Array<{ vazifaId: number; label: string; hint: string; tasks: LessonOneTask[] }>,
): LessonTaskSquareItem[] {
  return vazifalari.map((v) => ({
    path: `${lessonPath}/vazifa/${v.vazifaId}`,
    taskNum: v.vazifaId,
    label: v.label,
    hint: v.hint,
    Icon: iconForTasks(v.tasks),
  }));
}
