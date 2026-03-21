import { getSubtopicWordCount } from '../data/vocabularyContent';

const STORAGE_KEY_LEARNED = (topicId: string, subtopicId: string) =>
  `vocab-learned-${topicId}-${subtopicId}`;
const STORAGE_KEY_PART = (topicId: string, subtopicId: string, partId: string) =>
  `vocab-part-${topicId}-${subtopicId}-${partId}`;
const STORAGE_KEY_LAST = (topicId: string) => `vocab-last-${topicId}`;
const STORAGE_KEY_LAST_PART = (topicId: string, subtopicId: string) =>
  `vocab-last-part-${topicId}-${subtopicId}`;
const STORAGE_KEY_STAGE = (topicId: string, subtopicId: string, partId: string, mode: string) =>
  `vocab-stage-${topicId}-${subtopicId}-${partId}-${mode}`;
/** Last flashcard (step 1) Biladi/Bilmaydi counts — syncs to DB when word_group_id loads. */
const STORAGE_KEY_FLASHCOUNTS = (topicId: string, subtopicId: string, partId: string) =>
  `vocab-flashcounts-${topicId}-${subtopicId}-${partId}`;
const STORAGE_KEY_RESULT = (topicId: string, subtopicId: string, partId: string) =>
  `vocab-result-${topicId}-${subtopicId}-${partId}`;

export type StageStatus = 'not_started' | 'in_progress' | 'completed';

export function getStageStatus(
  topicId: string,
  subtopicId: string,
  partId: string,
  mode: string
): StageStatus {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STAGE(topicId, subtopicId, partId, mode));
    if (raw === 'in_progress' || raw === 'completed') return raw;
    return 'not_started';
  } catch {
    return 'not_started';
  }
}

export function setStageStatus(
  topicId: string,
  subtopicId: string,
  partId: string,
  mode: string,
  status: StageStatus
): void {
  try {
    localStorage.setItem(STORAGE_KEY_STAGE(topicId, subtopicId, partId, mode), status);
  } catch {}
}

export function setFlashcardStepCounts(
  topicId: string,
  subtopicId: string,
  partId: string,
  known: number,
  unknown: number
): void {
  try {
    localStorage.setItem(
      STORAGE_KEY_FLASHCOUNTS(topicId, subtopicId, partId),
      JSON.stringify({
        known: Math.max(0, Math.floor(known)),
        unknown: Math.max(0, Math.floor(unknown)),
      })
    );
  } catch {
    // ignore
  }
}

export function getFlashcardStepCounts(
  topicId: string,
  subtopicId: string,
  partId: string
): { known: number; unknown: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FLASHCOUNTS(topicId, subtopicId, partId));
    if (!raw) return null;
    const p = JSON.parse(raw) as { known?: unknown; unknown?: unknown };
    const known = Math.max(0, Math.floor(Number(p.known ?? 0)));
    const unknown = Math.max(0, Math.floor(Number(p.unknown ?? 0)));
    if (known === 0 && unknown === 0) return null;
    return { known, unknown };
  } catch {
    return null;
  }
}

export function getLearnedCount(topicId: string, subtopicId: string): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LEARNED(topicId, subtopicId));
    return raw ? Math.max(0, parseInt(raw, 10)) : 0;
  } catch {
    return 0;
  }
}

export function setLearnedCount(topicId: string, subtopicId: string, count: number): void {
  try {
    const max = getSubtopicWordCount(topicId, subtopicId);
    const value = Math.max(0, Math.min(count, max));
    localStorage.setItem(STORAGE_KEY_LEARNED(topicId, subtopicId), String(value));
  } catch {
    // ignore
  }
}

export function addLearned(topicId: string, subtopicId: string, delta: number): void {
  const current = getLearnedCount(topicId, subtopicId);
  setLearnedCount(topicId, subtopicId, current + delta);
}

export function getLastSubtopicId(topicId: string): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_LAST(topicId));
  } catch {
    return null;
  }
}

export function setLastSubtopicId(topicId: string, subtopicId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_LAST(topicId), subtopicId);
  } catch {
    // ignore
  }
}

export function getPartLearnedCount(
  topicId: string,
  subtopicId: string,
  partId: string
): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PART(topicId, subtopicId, partId));
    return raw ? Math.max(0, parseInt(raw, 10)) : 0;
  } catch {
    return 0;
  }
}

/** Result count for a part: only test and pairs completion count (cards do not). */
export function getPartResultCount(
  topicId: string,
  subtopicId: string,
  partId: string
): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RESULT(topicId, subtopicId, partId));
    return raw ? Math.max(0, parseInt(raw, 10)) : 0;
  } catch {
    return 0;
  }
}

/** Set result count for a part (used when test or pairs are completed). */
export function setPartResultCount(
  topicId: string,
  subtopicId: string,
  partId: string,
  count: number,
  max: number
): void {
  try {
    const value = Math.max(0, Math.min(count, max));
    localStorage.setItem(STORAGE_KEY_RESULT(topicId, subtopicId, partId), String(value));
  } catch {
    // ignore
  }
}

export function setPartLearnedCount(
  topicId: string,
  subtopicId: string,
  partId: string,
  count: number,
  max: number
): void {
  try {
    const value = Math.max(0, Math.min(count, max));
    localStorage.setItem(STORAGE_KEY_PART(topicId, subtopicId, partId), String(value));
  } catch {
    // ignore
  }
}

export function addPartLearned(
  topicId: string,
  subtopicId: string,
  partId: string,
  delta: number,
  max: number
): void {
  const current = getPartLearnedCount(topicId, subtopicId, partId);
  setPartLearnedCount(topicId, subtopicId, partId, current + delta, max);
}

export function getLastPartId(topicId: string, subtopicId: string): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_LAST_PART(topicId, subtopicId));
  } catch {
    return null;
  }
}

export function setLastPartId(
  topicId: string,
  subtopicId: string,
  partId: string
): void {
  try {
    localStorage.setItem(STORAGE_KEY_LAST_PART(topicId, subtopicId), partId);
  } catch {
    // ignore
  }
}

export type ServerProgressItem = {
  topic_id: string;
  subtopic_id: string;
  part_id: string;
  result_count?: number;
  stage_cards?: string | null;
  stage_test?: string | null;
  stage_pairs?: string | null;
};

/** Merge server vocabulary progress into localStorage (after GET /api/vocabulary/progress). */
export function applyServerProgress(items: ServerProgressItem[]): void {
  try {
    for (const it of items) {
      if (typeof it.result_count === 'number') {
        localStorage.setItem(STORAGE_KEY_RESULT(it.topic_id, it.subtopic_id, it.part_id), String(Math.max(0, it.result_count)));
      }
      if (it.stage_cards === 'in_progress' || it.stage_cards === 'completed') {
        localStorage.setItem(STORAGE_KEY_STAGE(it.topic_id, it.subtopic_id, it.part_id, 'cards'), it.stage_cards);
      }
      if (it.stage_test === 'in_progress' || it.stage_test === 'completed') {
        localStorage.setItem(STORAGE_KEY_STAGE(it.topic_id, it.subtopic_id, it.part_id, 'test'), it.stage_test);
      }
      if (it.stage_pairs === 'in_progress' || it.stage_pairs === 'completed') {
        localStorage.setItem(STORAGE_KEY_STAGE(it.topic_id, it.subtopic_id, it.part_id, 'pairs'), it.stage_pairs);
      }
    }
  } catch {
    // ignore
  }
}
