import type { AccessInfo } from '../api/access';
import { VOCABULARY_TOPICS } from '../data/vocabularyTopics';

/** Must match `server/lib/freeVocabularyIds.ts` */
const FREE_VOCAB_TOPIC_ID = 'kundalik-hayot';
const SALOMLASHISH_SUBTOPIC_ID = 'salomlashish-xayrlashish-odob';

export function defaultFreeVocabularyTopicId(): string | null {
  return VOCABULARY_TOPICS[0]?.id ?? null;
}

export function defaultFreeVocabularySubtopicId(): string | null {
  return VOCABULARY_TOPICS[0]?.subtopics[0]?.id ?? null;
}

/**
 * Первая подтема первой темы (по порядку в VOCABULARY_TOPICS) — внутри неё полный UX как у подписчика: без paywall по тарифу.
 */
export function isVocabularyFreeTierFullSubtopic(
  topicId: string | undefined,
  subtopicId: string | undefined
): boolean {
  if (!topicId || !subtopicId) return false;
  const firstTopic = VOCABULARY_TOPICS[0];
  if (!firstTopic || firstTopic.id !== topicId) return false;
  const firstSub = firstTopic.subtopics[0];
  return firstSub?.id === subtopicId;
}

/**
 * For non-subscribers: which topic id is allowed (matches /api/user/access).
 */
export function resolvedFreeVocabularyTopicId(access: AccessInfo | null): string | null {
  if (!access || access.subscription_active) return null;
  return access.vocabulary_free_topic_id ?? defaultFreeVocabularyTopicId();
}

/**
 * Lock state for a topic card on /vocabulary.
 */
export function isVocabularyTopicLockedForUser(access: AccessInfo | null, topicId: string): boolean {
  if (!access) return true;
  if (access.subscription_active) return false;
  const freeT = resolvedFreeVocabularyTopicId(access);
  return freeT == null || topicId !== freeT;
}

/**
 * Same rules as server getWordGroups: free pair from access, plus salomlashish for non-subscribers.
 */
export function canFreeUserOpenVocabularySubtopic(
  access: AccessInfo,
  topicId: string,
  subtopicId: string
): boolean {
  if (isVocabularyFreeTierFullSubtopic(topicId, subtopicId)) return true;
  const freeT = access.vocabulary_free_topic_id ?? defaultFreeVocabularyTopicId() ?? '';
  const freeS = access.vocabulary_free_subtopic_id ?? defaultFreeVocabularySubtopicId() ?? '';
  const defaultPair = topicId === freeT && subtopicId === freeS;
  const salomOnKundalik =
    topicId === FREE_VOCAB_TOPIC_ID && subtopicId === SALOMLASHISH_SUBTOPIC_ID;
  return defaultPair || salomOnKundalik;
}

export function canAccessVocabularySubtopicRoute(
  access: AccessInfo | null,
  topicId: string | undefined,
  subtopicId: string | undefined
): boolean {
  if (!topicId || !subtopicId) return false;
  if (isVocabularyFreeTierFullSubtopic(topicId, subtopicId)) return true;
  if (!access) return false;
  if (access.subscription_active) return true;
  return canFreeUserOpenVocabularySubtopic(access, topicId, subtopicId);
}

/**
 * Явная проверка доступа по индексам (первая тема = 0, первая подтема = 0).
 * Используется для UI: бесплатный пользователь — только topicIndex 0 и subtopicIndex 0 открыты.
 */
export function isVocabularyTopicUnlocked(
  access: AccessInfo | null,
  topicIndex: number
): boolean {
  if (!access) return false;
  if (access.subscription_active) return true;
  return topicIndex === 0;
}

export function isVocabularySubtopicUnlocked(
  access: AccessInfo | null,
  topicIndex: number,
  subtopicIndex: number
): boolean {
  if (!access) return false;
  if (access.subscription_active) return true;
  return topicIndex === 0 && subtopicIndex === 0;
}
