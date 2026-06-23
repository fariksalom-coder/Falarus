import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchKunlikProgress,
  patchKunlikDayProgress,
  type KunlikDayProgress,
  type KunlikDayPatch,
} from '../api/kunlikProgress';
import { mergeKunlikDayPatch } from '../../shared/kunlikProgressMerge';
import { TOTAL_DAYS } from '../data/dailyPlan';

export type { KunlikDayProgress };

const DEFAULT_ROW: Omit<KunlikDayProgress, 'day_number'> = {
  grammar_1: false,
  grammar_2: false,
  grammar_3: false,
  words_learned: 0,
  words_correct: 0,
  words_match: false,
  oqish_done: false,
  speaking_level: 0,
};

export function useKunlikProgress() {
  const { token } = useAuth();
  const [rows, setRows] = useState<Map<number, KunlikDayProgress>>(new Map());
  const [practicePromptCountByDay, setPracticePromptCountByDay] = useState<Map<number, number>>(
    () => new Map(),
  );
  const [loaded, setLoaded] = useState(false);
  // Track patches already sent for each day to avoid duplicate requests
  const sentRef = useRef<Map<number, KunlikDayPatch>>(new Map());

  useEffect(() => {
    if (!token) {
      setRows(new Map());
      setPracticePromptCountByDay(new Map());
      sentRef.current = new Map();
      setLoaded(true);
      return;
    }

    let cancelled = false;
    setLoaded(false);

    fetchKunlikProgress(token)
      .then(({ rows: items, practicePromptCounts }) => {
        if (cancelled) return;
        const map = new Map<number, KunlikDayProgress>();
        for (const row of items) map.set(row.day_number, row);
        setRows(map);
        const mergedCounts = new Map<number, number>();
        for (let d = 1; d <= TOTAL_DAYS; d += 1) {
          mergedCounts.set(d, practicePromptCounts.get(d) ?? 0);
        }
        setPracticePromptCountByDay(mergedCounts);
        sentRef.current = new Map();
        for (const row of items) {
          const { day_number, ...rest } = row;
          sentRef.current.set(day_number, rest);
        }
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  /** Returns the stored row for a day (or defaults). */
  const getDay = useCallback(
    (dayNumber: number): KunlikDayProgress =>
      rows.get(dayNumber) ?? { day_number: dayNumber, ...DEFAULT_ROW },
    [rows]
  );

  /**
   * Merge a partial update for one day into local state and persist to DB.
   * Only sends fields that changed vs. what was last sent.
   */
  const patchDay = useCallback(
    (dayNumber: number, patch: KunlikDayPatch) => {
      const prev = sentRef.current.get(dayNumber) ?? { ...DEFAULT_ROW };
      const diff = mergeKunlikDayPatch(prev, patch);

      if (Object.keys(diff).length === 0) return;

      const merged = { ...prev, ...diff };
      sentRef.current.set(dayNumber, merged);

      setRows((m) => {
        const next = new Map(m);
        const existing = next.get(dayNumber) ?? { day_number: dayNumber, ...DEFAULT_ROW };
        next.set(dayNumber, { ...existing, ...diff });
        return next;
      });

      patchKunlikDayProgress(token, dayNumber, diff);
    },
    [token]
  );

  /** Convenience: check if grammar task N (1-3) is done for a day */
  const isGrammarDone = useCallback(
    (dayNumber: number, taskNum: 1 | 2 | 3): boolean => {
      const row = rows.get(dayNumber);
      if (!row) return false;
      return row[`grammar_${taskNum}` as keyof KunlikDayProgress] as boolean;
    },
    [rows]
  );

  /** Convenience: check if oqish is done */
  const isOqishDone = useCallback(
    (dayNumber: number): boolean => rows.get(dayNumber)?.oqish_done ?? false,
    [rows]
  );

  /** Convenience: check if words_match is done */
  const isMatchDone = useCallback(
    (dayNumber: number): boolean => rows.get(dayNumber)?.words_match ?? false,
    [rows]
  );

  return { rows, loaded, practicePromptCountByDay, getDay, patchDay, isGrammarDone, isOqishDone, isMatchDone };
}
