/**
 * 1-dars 1-vazifa: savollar `LessonOnePage.tsx` TASKS emas, `lessonOneTasks.ts`da.
 */
import { LESSON_ONE_VAZIFA_CHOICE } from '../../src/data/lessonOneTasks';

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

export type InventoryLessonGroup = {
  lessonPath: string;
  taskNumber: number;
  sourceFile: string;
  tasks: Array<{
    type: string;
    prompt: string;
    content: Record<string, Json>;
    answer: Record<string, Json>;
    difficulty: number;
    skill: string;
    meta: Record<string, Json>;
  }>;
};

export function getLessonOneVazifaOneInventoryGroup(): InventoryLessonGroup {
  const tasks = LESSON_ONE_VAZIFA_CHOICE.map((t) => ({
    type: 'choice',
    prompt: t.prompt,
    content: { options: t.options },
    answer: { type: 'string', value: t.correct, alternatives: [] },
    difficulty: 1,
    skill: 'grammar',
    meta: {},
  }));
  return {
    lessonPath: '/lesson-1',
    taskNumber: 1,
    sourceFile: 'src/data/lessonOneTasks.ts',
    tasks,
  };
}
