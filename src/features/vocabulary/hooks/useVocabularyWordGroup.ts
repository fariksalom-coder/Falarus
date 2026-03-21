import { useCallback, useEffect, useState } from 'react';
import {
  fetchVocabularyWordGroups,
  fetchVocabularyTasksStatus,
  getCachedWordGroupsProgress,
  getCachedTasksStatus,
  setCachedWordGroupsProgress,
  setCachedTasksStatus,
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
    return getCachedTasksStatus(group.id);
  });
  const [cachedStepsState, setCachedStepsState] = useState<WordGroupStepsState | undefined>(
    undefined
  );

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
    if (!token || !resolvedSubtopicId || !partId) return;
    setWordGroupId((prev) => {
      const cached = getCachedWordGroupsProgress(resolvedSubtopicId);
      const group = cached?.find((g) => g.part_id === partId);
      return group?.id ?? prev ?? null;
    });
    setTasksStatus((prev) => {
      const cached = getCachedWordGroupsProgress(resolvedSubtopicId);
      const group = cached?.find((g) => g.part_id === partId);
      if (group?.id != null) {
        const cachedStatus = getCachedTasksStatus(group.id);
        if (cachedStatus) return cachedStatus;
      }
      return prev;
    });
    let cancelled = false;
    (async () => {
      const groups = await fetchVocabularyWordGroups(token, resolvedSubtopicId);
      if (cancelled) return;
      setCachedWordGroupsProgress(resolvedSubtopicId, groups);
      const group = groups.find((g) => g.part_id === partId);
      if (group) {
        setWordGroupId(group.id);
        const cachedStatus = getCachedTasksStatus(group.id);
        if (cachedStatus) {
          setTasksStatus(cachedStatus);
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
          setTasksStatus(null);
          try {
            sessionStorage.removeItem(`vocab_tasks_${group.id}`);
          } catch {
            /* ignore */
          }
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
  };
}
