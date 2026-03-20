import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { LESSONS } from '../data/lessonsList';
import {
  computeLessonStates,
  type TaskResultsMap,
  isLessonUnlockedBySequence,
  isTaskUnlocked,
} from '../lib/sequentialLessonProgress';
import {
  fetchLessonTaskResults,
  saveLessonTaskResult,
  type LessonTaskResultItem,
} from '../api/lessonTaskResults';
import {
  getLessonTaskResults,
  mergeLessonTaskResultsFromServer,
  type LessonTaskSavedEventDetail,
} from '../utils/lessonTaskResults';
import { useAuth } from './AuthContext';

type SequentialLessonContextValue = {
  results: TaskResultsMap;
  /** Merge server + localStorage */
  refresh: () => Promise<void>;
  lessonStates: ReturnType<typeof computeLessonStates>;
  isLessonAccessible: (lessonPath: string) => boolean;
  isTaskAccessible: (lessonPath: string, taskNumber: number) => boolean;
  isReady: boolean;
};

const SequentialLessonContext = createContext<SequentialLessonContextValue | null>(null);

function buildLocalMap(): TaskResultsMap {
  const out: TaskResultsMap = {};
  for (const l of LESSONS) {
    const r = getLessonTaskResults(l.path);
    if (Object.keys(r).length > 0) out[l.path] = r;
  }
  return out;
}

function mergeServerIntoMap(base: TaskResultsMap, rows: LessonTaskResultItem[]): TaskResultsMap {
  const next: TaskResultsMap = { ...base };
  for (const row of rows) {
    const lp = row.lesson_path;
    if (!next[lp]) next[lp] = {};
    next[lp] = {
      ...next[lp],
      [row.task_number]: { correct: row.correct, total: row.total },
    };
  }
  return next;
}

export function SequentialLessonProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [results, setResults] = useState<TaskResultsMap>(() => buildLocalMap());
  const [isReady, setIsReady] = useState(false);

  const refresh = useCallback(async () => {
    const local = buildLocalMap();
    if (!token) {
      setResults(local);
      setIsReady(true);
      return;
    }
    try {
      const rows = await fetchLessonTaskResults(token);
      mergeLessonTaskResultsFromServer(rows);
      setResults(mergeServerIntoMap(buildLocalMap(), rows));
    } catch {
      setResults(local);
    } finally {
      setIsReady(true);
    }
  }, [token]);

  useEffect(() => {
    setIsReady(false);
    void refresh();
  }, [refresh]);

  /** Same-tab updates after setLessonTaskResult (localStorage). */
  useEffect(() => {
    const onSaved = (event: Event) => {
      const detail = (event as CustomEvent<LessonTaskSavedEventDetail>).detail;
      const local = buildLocalMap();
      setResults((prev) => {
        const next: TaskResultsMap = { ...prev };
        for (const [lp, tasks] of Object.entries(local)) {
          next[lp] = { ...(prev[lp] ?? {}), ...tasks };
        }
        return next;
      });

      if (
        detail?.source === 'local' &&
        token &&
        detail.lessonPath &&
        typeof detail.taskNumber === 'number' &&
        typeof detail.correct === 'number' &&
        typeof detail.total === 'number'
      ) {
        void saveLessonTaskResult(
          token,
          detail.lessonPath,
          detail.taskNumber,
          detail.correct,
          detail.total
        );
      }
    };
    window.addEventListener('lesson-task-saved', onSaved);
    return () => window.removeEventListener('lesson-task-saved', onSaved);
  }, [token]);

  const lessonStates = useMemo(() => computeLessonStates(results), [results]);

  const isLessonAccessible = useCallback(
    (lessonPath: string) => {
      const idx = LESSONS.findIndex((l) => l.path === lessonPath);
      if (idx < 0) return false;
      return isLessonUnlockedBySequence(idx, results);
    },
    [results]
  );

  const isTaskAccessible = useCallback(
    (lessonPath: string, taskNumber: number) => {
      const meta = LESSONS.find((l) => l.path === lessonPath);
      if (!meta) return false;
      return isTaskUnlocked(lessonPath, taskNumber, meta.exercisesTotal, results);
    },
    [results]
  );

  const value = useMemo(
    () => ({
      results,
      refresh,
      lessonStates,
      isLessonAccessible,
      isTaskAccessible,
      isReady,
    }),
    [results, refresh, lessonStates, isLessonAccessible, isTaskAccessible, isReady]
  );

  return (
    <SequentialLessonContext.Provider value={value}>{children}</SequentialLessonContext.Provider>
  );
}

export function useSequentialLesson() {
  const ctx = useContext(SequentialLessonContext);
  if (!ctx) {
    throw new Error('useSequentialLesson must be used within SequentialLessonProvider');
  }
  return ctx;
}

/** Optional: when provider not mounted (tests) */
export function useSequentialLessonOptional(): SequentialLessonContextValue | null {
  return useContext(SequentialLessonContext);
}
