import { apiUrl } from '../api';
import { applyServerProgress, type ServerProgressItem } from '../utils/vocabProgress';

/** Legacy: server no longer stores `vocabulary_progress`; GET returns []. Kept for older builds. */
export async function fetchVocabularyProgress(token: string | null): Promise<void> {
  if (!token) return;
  try {
    const res = await fetch(apiUrl('/api/vocabulary/progress'), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = (await res.json()) as ServerProgressItem[];
    applyServerProgress(Array.isArray(data) ? data : []);
  } catch {
    // ignore
  }
}

export async function fetchVocabularyDailyWordStats(
  token: string | null
): Promise<{ todayWords: number; weekWords: number } | null> {
  if (!token) return null;
  try {
    const res = await fetch(apiUrl('/api/vocabulary/daily-word-stats'), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { todayWords?: unknown; weekWords?: unknown };
    const todayWords = typeof data.todayWords === 'number' ? data.todayWords : 0;
    const weekWords = typeof data.weekWords === 'number' ? data.weekWords : 0;
    return { todayWords, weekWords };
  } catch {
    return null;
  }
}

/** Legacy no-op on server (table removed). Prefer vocabulary task/step APIs. */
export async function saveVocabularyPartProgress(
  token: string | null,
  topicId: string,
  subtopicId: string,
  partId: string,
  payload: {
    result_count?: number;
    stage_cards?: string;
    stage_test?: string;
    stage_pairs?: string;
  }
): Promise<void> {
  if (!token) return;
  try {
    await fetch(apiUrl('/api/vocabulary/progress'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        topic_id: topicId,
        subtopic_id: subtopicId,
        part_id: partId,
        ...payload,
      }),
    });
  } catch {
    // ignore
  }
}
