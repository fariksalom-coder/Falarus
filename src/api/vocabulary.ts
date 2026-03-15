import { apiUrl } from '../api';

export type VocabularyTopic = {
  id: string;
  title: string;
  learned_words: number;
  total_words: number;
  progress_percent: number;
};

export type VocabularySubtopic = {
  id: string;
  topic_id: string;
  title: string;
  learned_words: number;
  total_words: number;
  progress_percent: number;
};

export type VocabularyWordGroup = {
  id: number;
  subtopic_id: string;
  part_id: string;
  title: string;
  total_words: number;
  learned_words: number;
  progress_percent: number;
  flashcards_completed: boolean;
  test_best_correct: number;
  match_completed: boolean;
};

export type VocabularyTasksStatus = {
  flashcards_status: 'completed' | 'not_started';
  test_status: 'locked' | 'not_started' | 'completed';
  match_status: 'locked' | 'not_started' | 'completed';
  learned_words: number;
  total_words: number;
  test_best_correct: number;
  match_unlocked: boolean;
};

export type TestFinishResult = {
  learned_words: number;
  percentage: number;
  points_awarded: number;
  match_unlocked: boolean;
};

function authHeaders(token: string | null): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) (h as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  return h;
}

export async function fetchVocabularyTopics(token: string | null): Promise<VocabularyTopic[]> {
  if (!token) return [];
  const res = await fetch(apiUrl('/api/vocabulary/topics'), { headers: authHeaders(token) });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchVocabularySubtopics(
  token: string | null,
  topicId: string
): Promise<VocabularySubtopic[]> {
  if (!token) return [];
  const res = await fetch(apiUrl(`/api/vocabulary/subtopics/${topicId}`), {
    headers: authHeaders(token),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchVocabularyWordGroups(
  token: string | null,
  subtopicId: string
): Promise<VocabularyWordGroup[]> {
  if (!token) return [];
  const res = await fetch(apiUrl(`/api/vocabulary/word-groups/${subtopicId}`), {
    headers: authHeaders(token),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchVocabularyTasksStatus(
  token: string | null,
  wordGroupId: number
): Promise<VocabularyTasksStatus | null> {
  if (!token) return null;
  const res = await fetch(apiUrl(`/api/vocabulary/tasks/${wordGroupId}`), {
    headers: authHeaders(token),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function postFlashcardsComplete(
  token: string | null,
  wordGroupId: number
): Promise<boolean> {
  if (!token) return false;
  const res = await fetch(apiUrl('/api/vocabulary/flashcards/complete'), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ word_group_id: wordGroupId }),
  });
  return res.ok;
}

export async function postVocabularyTestFinish(
  token: string | null,
  wordGroupId: number,
  correct_answers: number,
  total_questions: number
): Promise<TestFinishResult | null> {
  if (!token) return null;
  const res = await fetch(apiUrl('/api/vocabulary/test/finish'), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      word_group_id: wordGroupId,
      correct_answers,
      total_questions,
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function postVocabularyMatchFinish(
  token: string | null,
  wordGroupId: number,
  points: number
): Promise<{ success: boolean; points_awarded: number } | null> {
  if (!token) return null;
  const res = await fetch(apiUrl('/api/vocabulary/match/finish'), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ word_group_id: wordGroupId, points }),
  });
  if (!res.ok) return null;
  return res.json();
}

const CACHE_TOPICS = 'vocab_topics_progress';
const CACHE_SUBTOPICS = (topicId: string) => `vocab_subtopics_${topicId}`;
const CACHE_WORD_GROUPS = (subtopicId: string) => `vocab_word_groups_${subtopicId}`;

export function getCachedTopicsProgress(): VocabularyTopic[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_TOPICS);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export function setCachedTopicsProgress(data: VocabularyTopic[]): void {
  try {
    sessionStorage.setItem(CACHE_TOPICS, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function getCachedSubtopicsProgress(topicId: string): VocabularySubtopic[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_SUBTOPICS(topicId));
    if (!raw) return null;
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export function setCachedSubtopicsProgress(topicId: string, data: VocabularySubtopic[]): void {
  try {
    sessionStorage.setItem(CACHE_SUBTOPICS(topicId), JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function getCachedWordGroupsProgress(subtopicId: string): VocabularyWordGroup[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_WORD_GROUPS(subtopicId));
    if (!raw) return null;
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export function setCachedWordGroupsProgress(
  subtopicId: string,
  data: VocabularyWordGroup[]
): void {
  try {
    sessionStorage.setItem(CACHE_WORD_GROUPS(subtopicId), JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

const CACHE_TASKS = (wordGroupId: number) => `vocab_tasks_${wordGroupId}`;

export function getCachedTasksStatus(wordGroupId: number): VocabularyTasksStatus | null {
  try {
    const raw = sessionStorage.getItem(CACHE_TASKS(wordGroupId));
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? (data as VocabularyTasksStatus) : null;
  } catch {
    return null;
  }
}

export function setCachedTasksStatus(
  wordGroupId: number,
  data: VocabularyTasksStatus
): void {
  try {
    sessionStorage.setItem(CACHE_TASKS(wordGroupId), JSON.stringify(data));
  } catch {
    /* ignore */
  }
}
