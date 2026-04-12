import { useMemo } from 'react';
import { LessonTaskSquareGrid } from './LessonTaskSquareGrid';
import type { TaskResult } from '../../utils/lessonTaskResults';
import { buildExtendedHubTasks } from '../../utils/lessonExtendedHub';
import { buildVazifaHubTasks } from '../../utils/lessonVazifaHub';
import type { LessonOneTask } from '../../data/lessonOneTasks';
import { useLessonQuestionCounts } from '../../context/GrammarCatalogContext';

type ExtendedProps = {
  lessonPath: string;
  hubRoutes: { path: string; taskNum: number }[];
  sequentialLock?: boolean;
  showBoshlashOnCurrent?: boolean;
  mashqlarHeading?: boolean;
  resultsOverride?: Record<number, TaskResult> | null;
};

export function ExtendedHubTaskGrid({
  lessonPath,
  hubRoutes,
  sequentialLock,
  showBoshlashOnCurrent,
  mashqlarHeading,
  resultsOverride,
}: ExtendedProps) {
  const counts = useLessonQuestionCounts(lessonPath);
  const tasks = useMemo(
    () => buildExtendedHubTasks(lessonPath, hubRoutes),
    [lessonPath, hubRoutes],
  );
  return (
    <LessonTaskSquareGrid
      lessonPath={lessonPath}
      tasks={tasks}
      sequentialLock={sequentialLock}
      showBoshlashOnCurrent={showBoshlashOnCurrent}
      mashqlarHeading={mashqlarHeading}
      resultsOverride={resultsOverride}
      questionCountByTask={counts}
    />
  );
}

type VazifaProps = {
  lessonPath: string;
  vazifalari: Array<{ vazifaId: number; label: string; hint: string; tasks: LessonOneTask[] }>;
  sequentialLock?: boolean;
  showBoshlashOnCurrent?: boolean;
  mashqlarHeading?: boolean;
  resultsOverride?: Record<number, TaskResult> | null;
};

export function VazifaHubTaskGrid({
  lessonPath,
  vazifalari,
  sequentialLock,
  showBoshlashOnCurrent,
  mashqlarHeading,
  resultsOverride,
}: VazifaProps) {
  const counts = useLessonQuestionCounts(lessonPath);
  const tasks = useMemo(
    () => buildVazifaHubTasks(lessonPath, vazifalari),
    [lessonPath, vazifalari],
  );
  return (
    <LessonTaskSquareGrid
      lessonPath={lessonPath}
      tasks={tasks}
      sequentialLock={sequentialLock}
      showBoshlashOnCurrent={showBoshlashOnCurrent}
      mashqlarHeading={mashqlarHeading}
      resultsOverride={resultsOverride}
      questionCountByTask={counts}
    />
  );
}
