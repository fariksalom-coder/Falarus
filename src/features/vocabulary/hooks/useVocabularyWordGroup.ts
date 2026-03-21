import { useCallback, useEffect, useState } from 'react';
import {
  fetchVocabularyWordGroups,
  fetchVocabularyTasksStatus,
  getCachedWordGroupsProgress,
  getCachedTasksStatus,
  setCachedWordGroupsProgress,
  setCachedTasksStatus,
  type VocabularyWordGroup,
  type VocabularyTasksStatus,
} from '../../../api/vocabulary';
import { useVocabularyStepsStore } from '../../../state/vocabularyStepsStore';
import type { WordGroupStepsState } from '../../../api/vocabulary';

type Params = {
  token: string | null;
  /** Канонический id подтемы для API (из резолва slug → id). */
  resolvedSubtopicId: string | null;
  partId: string | undefined;
};

function deriveTasksStatusFromWordGroup(group: VocabularyWordGroup): VocabularyTasksStatus {
  const flashcardsCompleted =
    group.flashcards_completed ||
    group.test_best_correct > 0 ||
    group.match_completed ||
    group.learned_words > 0;
  const testCompleted =
    group.test_best_correct > 0 || group.match_completed || group.learned_words > 0;

  return {
    flashcards_status: flashcardsCompleted ? 'completed' : 'not_started',
    test_status: !flashcardsCompleted ? 'locked' : testCompleted ? 'completed' : 'not_started',
    match_status: group.match_completed ? 'completed' : 'locked',
    learned_words: group.learned_words,
    total_words: group.total_words,
    test_best_correct: group.test_best_correct,
    match_unlocked: group.match_completed,
  };
}

/**
 * Загрузка word_group_id, статусов заданий и шагов с бэкенда для экрана блока.
 */
export function useVocabularyWordGroup({
  token,
  resolvedSubtopicId,
  partId,
}: Params) {
  const fetchSteps = useVocabularyStepsStore((state) => state.fetchSteps);
  const submitStep1 = useVocabularyStepsStore((state) => state.submitStep1);
  const submitStep2 = useVocabularyStepsStore((state) => state.submitStep2);
  const [wordGroupId, setWordGroupId] = useState<number | null>(() => {
    if (!resolvedSubtopicId || !partId) return null;
    const cached = getCachedWordGroupsProgress(resolvedSubtopicId);
    const group = cached?.find((g) => g.part_id === partId);
    return group?.id ?? null;
  });
  const [tasksStatus, setTasksStatus] = useState<VocabularyTasksStatus | null>(() => {
    if (!resolvedSubtopicId || !partId) return null;
    const cached = getCachedWordGroupsProgress(resolvedSubtopicId);
    const group = cached?.find((g) => g.part_id === partId);
    if (group?.id == null) return null;
    return getCachedTasksStatus(group.id) ?? deriveTasksStatusFromWordGroup(group);
  });
  const [cachedStepsState, setCachedStepsState] = useState<WordGroupStepsState | undefined>(
    undefined
  );
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(() => {
    if (!token || !resolvedSubtopicId || !partId) return false;
    const cachedGroups = getCachedWordGroupsProgress(resolvedSubtopicId);
    const group = cachedGroups?.find((item) => item.part_id === partId);
    return !group;
  });

  const serverStepsState = useVocabularyStepsStore((state) =>
    wordGroupId != null ? state.byGroup[wordGroupId] : undefined
  );

  useEffect(() => {
    if (wordGroupId == null) return;
    if (typeof window === 'undefined' || !('sessionStorage' in window)) return;
    try {
      const raw = sessionStorage.getItem(`vocab_steps_${wordGroupId}`);
      if (!raw) {
        setCachedStepsState(undefined);
        return;
      }
      setCachedStepsState(JSON.parse(raw) as WordGroupStepsState);
    } catch {
      setCachedStepsState(undefined);
    }
  }, [wordGroupId]);

  const effectiveStepsState = serverStepsState ?? cachedStepsState;

  const refetchTasks = useCallback(async () => {
    if (!token || wordGroupId == null) return;
    const status = await fetchVocabularyTasksStatus(token, wordGroupId);
    if (status) {
      setTasksStatus(status);
      setCachedTasksStatus(wordGroupId, status);
    }
  }, [token, wordGroupId]);

  useEffect(() => {
    if (!token || !resolvedSubtopicId || !partId) {
      setIsInitialLoading(false);
      return;
    }
    const cachedGroups = getCachedWordGroupsProgress(resolvedSubtopicId);
    const cachedGroup = cachedGroups?.find((g) => g.part_id === partId);
    setIsInitialLoading(!cachedGroup);
    setWordGroupId((prev) => {
      return cachedGroup?.id ?? prev ?? null;
    });
    setTasksStatus((prev) => {
      if (cachedGroup?.id != null) {
        const cachedStatus = getCachedTasksStatus(cachedGroup.id);
        if (cachedStatus) return cachedStatus;
        return deriveTasksStatusFromWordGroup(cachedGroup);
      }
      return prev;
    });
    let cancelled = false;
    (async () => {
      try {
        const groups = await fetchVocabularyWordGroups(token, resolvedSubtopicId);
        if (cancelled) return;
        setCachedWordGroupsProgress(resolvedSubtopicId, groups);
        const group = groups.find((g) => g.part_id === partId);
        if (group) {
          setWordGroupId(group.id);
          const cachedStatus = getCachedTasksStatus(group.id);
          if (cachedStatus) {
            setTasksStatus(cachedStatus);
          } else {
            const derived = deriveTasksStatusFromWordGroup(group);
            setTasksStatus(derived);
            setCachedTasksStatus(group.id, derived);
          }
          const [status] = await Promise.all([
            fetchVocabularyTasksStatus(token, group.id),
            token ? fetchSteps(token, group.id) : Promise.resolve(),
          ]);
          if (cancelled) return;
          if (status) {
            setTasksStatus(status);
            setCachedTasksStatus(group.id, status);
          } else {
            setTasksStatus(deriveTasksStatusFromWordGroup(group));
          }
        } else {
          setWordGroupId(null);
          setTasksStatus(null);
          try {
            setCachedWordGroupsProgress(resolvedSubtopicId, []);
          } catch {
            /* ignore */
          }
          try {
            sessionStorage.removeItem(`vocab_word_groups_${resolvedSubtopicId}`);
          } catch {
            /* ignore */
          }
        }
      } finally {
        if (!cancelled) {
          setIsInitialLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, resolvedSubtopicId, partId, fetchSteps]);

  return {
    wordGroupId,
    tasksStatus,
    serverStepsState,
    effectiveStepsState,
    fetchSteps,
    submitStep1,
    submitStep2,
    refetchTasks,
    isInitialLoading,
  };
}
