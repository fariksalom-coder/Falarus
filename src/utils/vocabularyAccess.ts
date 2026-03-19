import type { AccessInfo } from '../api/access';
import { VOCABULARY_TOPICS } from '../data/vocabularyTopics';

/** Mirrors server exception in vocabularyController getWordGroups */
const SALOMLASHISH_SUBTOPIC_ID = 'salomlashish-xayrlashish-odob';

export function defaultFreeVocabularyTopicId(): string | null {
  return VOCABULARY_TOPICS[0]?.id ?? null;
}

export function defaultFreeVocabularySubtopicId(): string | null {
  return VOCABULARY_TOPICS[0]?.subtopics[0]?.id ?? null;
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
  const freeT = access.vocabulary_free_topic_id ?? defaultFreeVocabularyTopicId() ?? '';
  const freeS = access.vocabulary_free_subtopic_id ?? defaultFreeVocabularySubtopicId() ?? '';
  const defaultPair = topicId === freeT && subtopicId === freeS;
  const salomExtra = subtopicId === SALOMLASHISH_SUBTOPIC_ID;
  return defaultPair || salomExtra;
}

export function canAccessVocabularySubtopicRoute(
  access: AccessInfo | null,
  topicId: string | undefined,
  subtopicId: string | undefined
): boolean {
  if (!topicId || !subtopicId) return false;
  if (!access) return false;
  if (access.subscription_active) return true;
  return canFreeUserOpenVocabularySubtopic(access, topicId, subtopicId);
}
