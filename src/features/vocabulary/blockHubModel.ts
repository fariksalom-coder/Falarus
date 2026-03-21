import type { VocabularyTasksStatus, WordGroupStepsState } from '../../api/vocabulary';
import { getFlashcardStepCounts, getStageStatus } from '../../utils/vocabProgress';

export type BlockHubViewModel = {
  /** Шапка: выучено слов по результатам теста (API). */
  learnedWords: number;
  totalWords: number;
  hasServerSnapshot: boolean;
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
  /** Локальный «выучено из теста» — только для гостя (без токена) */
  fallbackLearnedWords?: number;
  /** Залогинен: не подменяем серверный счётчик устаревшим localStorage */
  authenticated: boolean;
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
    authenticated,
  } = input;

  const totalWords = tasksStatus?.total_words ?? partEntryCount;
  const hasServerSnapshot = tasksStatus != null || steps != null;

  /**
   * «О‘рганилган» в шапке = данные теста с сервера (`tasksStatus`).
   * Если API недоступен, но пользователь вошёл в аккаунт, не показываем старый
   * `vocab-result-*` из localStorage — иначе получается 20/20 при «Тест: Бошлаш».
   */
  let learnedWords: number;
  if (tasksStatus != null) {
    learnedWords = tasksStatus.learned_words;
  } else if (authenticated) {
    learnedWords = steps?.step2.completed ? steps.step2.correct : 0;
  } else {
    learnedWords = fallbackLearnedWords;
  }

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

  const derivedCorrect = tasksStatus?.learned_words ?? 0;
  const derivedTotal = tasksStatus?.total_words ?? partEntryCount;
  const derivedIncorrect = Math.max(0, derivedTotal - derivedCorrect);
  const derivedPercentage =
    derivedTotal > 0 ? Math.round((derivedCorrect / derivedTotal) * 100) : 0;

  const step2Completed =
    steps?.step2.completed ?? tasksStatus?.test_status === 'completed';
  const step2Passed =
    steps?.step2.passed ??
    tasksStatus?.match_unlocked ??
    tasksStatus?.match_status === 'completed';
  const step2Correct = steps?.step2.correct ?? derivedCorrect;
  const step2Incorrect = steps?.step2.incorrect ?? derivedIncorrect;
  const step2Percentage = steps?.step2.percentage ?? derivedPercentage;
  const step3Unlocked =
    steps?.step3.unlocked ??
    tasksStatus?.match_unlocked ??
    tasksStatus?.match_status === 'completed';
  const step3Completed = tasksStatus?.match_status === 'completed';

  return {
    learnedWords,
    totalWords,
    hasServerSnapshot,
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
