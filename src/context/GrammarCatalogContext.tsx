import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { getGrammarCatalog, type GrammarCatalogLesson } from '../api/grammarCatalog';

type GrammarCatalogContextValue = {
  lessons: GrammarCatalogLesson[] | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const GrammarCatalogContext = createContext<GrammarCatalogContextValue | null>(null);

export function GrammarCatalogProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [lessons, setLessons] = useState<GrammarCatalogLesson[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) {
      setLessons(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getGrammarCatalog(token);
      setLessons(data.lessons);
      setError(null);
    } catch (e) {
      setLessons(null);
      setError(e instanceof Error ? e.message : 'Katalog yuklanmadi');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ lessons, loading, error, refresh }),
    [lessons, loading, error, refresh],
  );

  return <GrammarCatalogContext.Provider value={value}>{children}</GrammarCatalogContext.Provider>;
}

export function useGrammarCatalog(): GrammarCatalogContextValue {
  const v = useContext(GrammarCatalogContext);
  if (!v) {
    throw new Error('GrammarCatalogProvider kerak');
  }
  return v;
}

/** Agar katalog yuklanmagan bo‘lsa, `undefined` — grid statik `getExpectedLessonTaskCount` ga tayanadi. */
export function useLessonQuestionCounts(lessonPath: string): Partial<Record<number, number>> | undefined {
  const { lessons } = useGrammarCatalog();
  if (!lessons) return undefined;
  const le = lessons.find((l) => l.path === lessonPath);
  if (!le) return undefined;
  const out: Partial<Record<number, number>> = {};
  for (const t of le.tasks) {
    out[t.taskNumber] = t.questionCount;
  }
  return out;
}
