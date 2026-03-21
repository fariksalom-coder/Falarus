import { useEffect, useRef, useState } from 'react';
import {
  fetchVocabularyWordGroups,
  fetchVocabularyTasksStatus,
  getCachedWordGroupsProgress,
  getCachedTasksStatus,
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
  const stepsStore = useVocabularyStepsStore();
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

  const stepsState = wordGroupId != null ? stepsStore.byGroup[wordGroupId] : undefined;

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

  const effectiveStepsState = stepsState ?? cachedStepsState;

  const refetchTasks = async () => {
    if (!token || wordGroupId == null) return;
    const status = await fetchVocabularyTasksStatus(token, wordGroupId);
    if (status) {
      setTasksStatus(status);
      setCachedTasksStatus(wordGroupId, status);
    }
  };

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
      const group = groups.find((g) => g.part_id === partId);
      if (group) {
        setWordGroupId(group.id);
        const status = await fetchVocabularyTasksStatus(token, group.id);
        if (!cancelled && status) {
          setTasksStatus(status);
          setCachedTasksStatus(group.id, status);
        }
        if (!cancelled && token) {
          await stepsStore.fetchSteps(token, group.id);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, resolvedSubtopicId, partId, stepsStore]);

  return {
    wordGroupId,
    tasksStatus,
    effectiveStepsState,
    stepsStore,
    refetchTasks,
    setCachedStepsState,
  };
}
