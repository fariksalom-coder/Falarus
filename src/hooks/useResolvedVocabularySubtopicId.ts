import { useEffect, useState } from 'react';
import { VOCABULARY_TOPICS } from '../data/vocabularyTopics';
import { fetchVocabularySubtopics, type VocabularySubtopic } from '../api/vocabulary';

/**
 * URL `:subtopicId` may be a DB `slug` or legacy static `id`. Resolves to canonical `id` for local content keys.
 */
export function useResolvedVocabularySubtopicId(
  topicId: string | undefined,
  segment: string | undefined,
  token: string | null
): { resolvedId: string | null; loading: boolean } {
  const topic = topicId ? VOCABULARY_TOPICS.find((t) => t.id === topicId) : undefined;
  const isStaticId = Boolean(topic && segment && topic.subtopics.some((s) => s.id === segment));

  const [fetchRows, setFetchRows] = useState<VocabularySubtopic[] | null>(null);
  const [fetchDone, setFetchDone] = useState(false);

  useEffect(() => {
    if (!topicId || !segment || isStaticId) {
      setFetchRows(null);
      setFetchDone(true);
      return;
    }
    if (!token) {
      setFetchRows(null);
      setFetchDone(true);
      return;
    }
    setFetchDone(false);
    let cancelled = false;
    fetchVocabularySubtopics(token, topicId)
      .then((d) => {
        if (!cancelled) setFetchRows(d ?? []);
      })
      .catch(() => {
        if (!cancelled) setFetchRows([]);
      })
      .finally(() => {
        if (!cancelled) setFetchDone(true);
      });
    return () => {
      cancelled = true;
    };
  }, [topicId, segment, token, isStaticId]);

  if (!topicId || !segment) return { resolvedId: null, loading: false };

  if (isStaticId) return { resolvedId: segment, loading: false };

  if (!fetchDone) return { resolvedId: null, loading: true };

  const row = fetchRows?.find((s) => s.slug === segment || s.id === segment);
  const id = row?.id ?? null;
  if (!id || !topic?.subtopics.some((s) => s.id === id)) {
    return { resolvedId: null, loading: false };
  }
  return { resolvedId: id, loading: false };
}
