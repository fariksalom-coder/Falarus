/**
 * 1-dars barcha vazifalar: yagona manba `lessonOneTasks.ts` (sahifadagi TASKS / eski MatchingPairsPage emas).
 */
import {
  LESSON_ONE_VAZIFA_CHOICE,
  LESSON_ONE_VAZIFA_MATCHING,
  LESSON_ONE_VAZIFA_SENTENCE,
} from '../../src/data/lessonOneTasks';

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

export function getLessonOneVazifaTwoInventoryGroup(): InventoryLessonGroup {
  const tasks = LESSON_ONE_VAZIFA_MATCHING.map((t) => {
    const pairs = t.pairs.map((p) => ({ left: p.left, right: p.right }));
    return {
      type: 'matching',
      prompt: t.prompt,
      content: { pairs },
      answer: { type: 'pairs', value: pairs, alternatives: [] },
      difficulty: 1,
      skill: 'grammar',
      meta: {},
    };
  });
  return {
    lessonPath: '/lesson-1',
    taskNumber: 2,
    sourceFile: 'src/data/lessonOneTasks.ts',
    tasks,
  };
}

export function getLessonOneVazifaThreeInventoryGroup(): InventoryLessonGroup {
  const tasks = LESSON_ONE_VAZIFA_SENTENCE.map((t) => ({
    type: 'sentence',
    prompt: t.prompt,
    content: { words: t.words },
    answer: { type: 'string', value: t.correct, alternatives: [] },
    difficulty: 1,
    skill: 'grammar',
    meta: {},
  }));
  return {
    lessonPath: '/lesson-1',
    taskNumber: 3,
    sourceFile: 'src/data/lessonOneTasks.ts',
    tasks,
  };
}

/** Import / inventar uchun 1-darsning 3 ta vazifasi — `getExpectedLessonTaskCount` bilan mos. */
export function getLessonOneInventoryGroups(): InventoryLessonGroup[] {
  return [
    getLessonOneVazifaOneInventoryGroup(),
    getLessonOneVazifaTwoInventoryGroup(),
    getLessonOneVazifaThreeInventoryGroup(),
  ];
}
