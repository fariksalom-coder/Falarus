import type { VocabularyEntry } from '../data/vocabularyContent';
import type { DailyVocabWord } from '../../shared/dailyCourseDay';

/** Kunlik lug‘at qatorlari → lug‘at mashqlari uchun bir xil shakl. */
export function dailyWordsToEntries(words: DailyVocabWord[]): VocabularyEntry[] {
  return [...words]
    .sort((a, b) => (a.sortOrder !== b.sortOrder ? a.sortOrder - b.sortOrder : a.id - b.id))
    .map((w) => ({ uzbek: w.wordUz.trim(), russian: w.wordRu.trim() }))
    .filter((e) => e.uzbek.length > 0 && e.russian.length > 0);
}
