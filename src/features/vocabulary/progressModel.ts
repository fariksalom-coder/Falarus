/**
 * Модель прогресса «Словарь» (согласована с бэкендом):
 *
 * Тема (topic): выучено = сумма `learned_words` по подтемам с API;
 *              всего   = сумма статических объёмов подтем (контент).
 *
 * Подтема: выучено = сумма `learned_words` по блокам (word groups) с API;
 *          всего   = сумма слов во всех блоках (части контента).
 *
 * Блок: выучено / всего для шапки «Натija» = `learned_words` / `total_words` из API
 *        (после теста бэкенд обновляет learned_words — это и есть «10 из 25»).
 */
import type { VocabularySubtopic, VocabularyWordGroup } from '../../api/vocabulary';

export type ProgressPair = { learned: number; total: number };

export function safePercent(learned: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((learned / total) * 100));
}

/** Агрегат по теме: список подтем с API + функция статического total на подтему. */
export function aggregateTopicProgress(
  apiSubtopics: VocabularySubtopic[],
  staticSubtopicIds: string[],
  getStaticWordCount: (subtopicId: string) => number,
  fallbackLearned: (subtopicId: string) => number
): ProgressPair {
  let learned = 0;
  let total = 0;
  for (const id of staticSubtopicIds) {
    const row = apiSubtopics.find((s) => s.id === id);
    const tw = getStaticWordCount(id);
    total += tw;
    learned += row?.learned_words ?? fallbackLearned(id);
  }
  return { learned: Math.min(learned, total), total };
}

/** Агрегат по подтеме: блоки контента + прогресс групп с API. */
export function aggregateSubtopicFromBlocks(
  partIds: string[],
  getPartWordCount: (partId: string) => number,
  groups: VocabularyWordGroup[],
  fallbackLearned: (partId: string) => number
): ProgressPair {
  let learned = 0;
  let total = 0;
  for (const partId of partIds) {
    const g = groups.find((x) => x.part_id === partId);
    const tw = getPartWordCount(partId);
    total += tw;
    learned += g?.learned_words ?? fallbackLearned(partId);
  }
  return { learned: Math.min(learned, total), total };
}

/** Для карточки блока в списке подтемы. */
export function blockProgressFromApi(
  group: VocabularyWordGroup | undefined,
  partWordCount: number,
  fallbackLearned: number
): ProgressPair {
  const total = group?.total_words ?? partWordCount;
  const learned = group?.learned_words ?? fallbackLearned;
  return { learned: Math.min(learned, total), total };
}
