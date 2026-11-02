import type { VocabularyEntry } from '../../data/vocabularyContent';

export const shuffle = <T,>(items: T[]) => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/** Groups entries into sets of ~5 for the “find pair” exercise. */
export function groupEntriesForPairs(entries: VocabularyEntry[]) {
  const groups: VocabularyEntry[][] = [];
  let i = 0;
  while (i < entries.length) {
    const remain = entries.length - i;
    if (remain <= 6 && remain !== 1) {
      groups.push(entries.slice(i));
      break;
    }
    groups.push(entries.slice(i, i + 5));
    i += 5;
  }
  if (groups.length > 1 && groups[groups.length - 1].length === 1) {
    const last = groups.pop();
    if (last) groups[groups.length - 1].push(last[0]);
  }
  return groups;
}

export type TestQuestion = {
  id: string;
  uzbek: string;
  options: string[];
  correct: string;
};

export function buildTestQuestions(partEntries: VocabularyEntry[]): TestQuestion[] {
  return partEntries.map((entry, index) => {
    const pool = partEntries
      .filter((e) => e.russian !== entry.russian)
      .map((e) => e.russian);
    const distractors = shuffle(Array.from(new Set(pool))).slice(0, 3);
    const options = shuffle([entry.russian, ...distractors]);
    return { id: `${index}`, uzbek: entry.uzbek, options, correct: entry.russian };
  });
}
