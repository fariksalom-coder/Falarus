import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  applyTextScaleToDocument,
  cycleTextScaleLevel,
  readStoredTextScale,
  resolveTextScaleLevel,
  TEXT_SCALE_MULTIPLIERS,
  TEXT_SCALE_STORAGE_KEY,
  textScaleLabel,
  type TextScaleLevel,
} from '../constants/textScale';

type TextScaleContextValue = {
  level: TextScaleLevel;
  label: string;
  multiplier: number;
  cycleTextScale: () => void;
  setTextScaleLevel: (level: TextScaleLevel) => void;
};

const TextScaleContext = createContext<TextScaleContextValue | null>(null);

export function TextScaleProvider({ children }: { children: ReactNode }) {
  const [level, setLevel] = useState<TextScaleLevel>(() =>
    resolveTextScaleLevel(readStoredTextScale()),
  );

  useEffect(() => {
    applyTextScaleToDocument(level);
    try {
      localStorage.setItem(TEXT_SCALE_STORAGE_KEY, String(level));
    } catch {
      /* ignore quota / private mode */
    }
  }, [level]);

  const cycleTextScale = useCallback(() => {
    setLevel((current) => cycleTextScaleLevel(current));
  }, []);

  const setTextScaleLevel = useCallback((next: TextScaleLevel) => {
    setLevel(next);
  }, []);

  const value = useMemo(
    () => ({
      level,
      label: textScaleLabel(level),
      multiplier: TEXT_SCALE_MULTIPLIERS[level],
      cycleTextScale,
      setTextScaleLevel,
    }),
    [level, cycleTextScale, setTextScaleLevel],
  );

  return <TextScaleContext.Provider value={value}>{children}</TextScaleContext.Provider>;
}

export function useTextScale() {
  const ctx = useContext(TextScaleContext);
  if (!ctx) {
    throw new Error('useTextScale must be used within TextScaleProvider');
  }
  return ctx;
}
