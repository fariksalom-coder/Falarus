import type { VocabularyTasksStatus, WordGroupStepsState } from '../../api/vocabulary';
import { getFlashcardStepCounts, getStageStatus } from '../../utils/vocabProgress';

export type BlockHubViewModel = {
  /** Шапка: выучено слов по результатам теста (API). */
  learnedWords: number;
  totalWords: number;
  step1Completed: boolean;
  step1Known: number;
  step1Unknown: number;
  step2Completed: boolean;
  step2Passed: boolean;
  step2Correct: number;
  step2Incorrect: number;
  step2Percentage: number;
  step3Unlocked: boolean;
  step3Completed: boolean;
};

function cardsStageDone(topicId: string, subtopicId: string, partId: string): boolean {
  return getStageStatus(topicId, subtopicId, partId, 'cards') === 'completed';
}

/**
 * Собирает отображение экрана «три задания» из сервера + локального кеша карточек.
 */
export function buildBlockHubViewModel(input: {
  topicId: string;
  subtopicId: string;
  partId: string;
  partEntryCount: number;
  tasksStatus: VocabularyTasksStatus | null;
  steps: WordGroupStepsState | undefined;
  /** step1 completed if local stage or server has card counts */
  safeStep1Completed: boolean;
  /** Локальный кеш «выучено из теста», пока API не подгрузился */
  fallbackLearnedWords?: number;
}): BlockHubViewModel {
  const {
    topicId,
    subtopicId,
    partId,
    partEntryCount,
    tasksStatus,
    steps,
    safeStep1Completed,
    fallbackLearnedWords = 0,
  } = input;

  const totalWords = tasksStatus?.total_words ?? partEntryCount;
  const learnedWords = tasksStatus?.learned_words ?? fallbackLearnedWords;

  const serverKnown1 = steps?.step1.known ?? 0;
  const serverUnknown1 = steps?.step1.unknown ?? 0;
  const serverSum1 = serverKnown1 + serverUnknown1;
  const flashLocal = getFlashcardStepCounts(topicId, subtopicId, partId);
  const cardsDone = cardsStageDone(topicId, subtopicId, partId);
  const localSum = flashLocal ? flashLocal.known + flashLocal.unknown : 0;
  const flashDiffersFromServer =
    flashLocal != null &&
    localSum > 0 &&
    (flashLocal.known !== serverKnown1 || flashLocal.unknown !== serverUnknown1);

  const step1Known =
    cardsDone && flashDiffersFromServer
      ? flashLocal!.known
      : serverSum1 > 0
        ? serverKnown1
        : (flashLocal?.known ?? 0);
  const step1Unknown =
    cardsDone && flashDiffersFromServer
      ? flashLocal!.unknown
      : serverSum1 > 0
        ? serverUnknown1
        : (flashLocal?.unknown ?? 0);

  const step2Completed = steps?.step2.completed ?? false;
  const step2Passed = steps?.step2.passed ?? false;
  const step2Correct = steps?.step2.correct ?? 0;
  const step2Incorrect = steps?.step2.incorrect ?? 0;
  const step2Percentage = steps?.step2.percentage ?? 0;
  const step3Unlocked = steps?.step3.unlocked ?? false;
  const step3Completed = tasksStatus?.match_status === 'completed';

  return {
    learnedWords,
    totalWords,
    step1Completed: safeStep1Completed,
    step1Known,
    step1Unknown,
    step2Completed,
    step2Passed,
    step2Correct,
    step2Incorrect,
    step2Percentage,
    step3Unlocked,
    step3Completed,
  };
}
