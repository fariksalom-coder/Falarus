import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { ackAchievements, fetchAchievements, type AchievementItem } from '../api/achievements';
import { ALL_ACHIEVEMENTS } from '../../shared/achievements';
import AchievementUnlockModal from '../components/achievements/AchievementUnlockModal';

type PendingItem = {
  item: AchievementItem;
  unlockedCount: number;
  totalCount: number;
  completedDays: number;
  wordsLearned: number;
};

type Ctx = {
  /** Re-fetch achievements and drain any newly unlocked items into the modal queue. */
  refresh: () => Promise<void>;
};

const AchievementCelebrationCtx = createContext<Ctx>({
  refresh: async () => {},
});

/** Consumer hook — pages call `refresh()` after actions that could unlock a medal. */
export function useAchievementCelebration(): Ctx {
  return useContext(AchievementCelebrationCtx);
}

const TOTAL_MEDALS = ALL_ACHIEVEMENTS.length;

export function AchievementCelebrationProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [queue, setQueue] = useState<PendingItem[]>([]);
  const seenKeysRef = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!token) return;
    const res = await fetchAchievements(token);
    if (!res) return;

    // Push any pending (unlocked but not-yet-notified) medals into the queue.
    const pendingItems = res.items.filter(
      (it) => it.unlocked && !it.notified && !seenKeysRef.current.has(it.key),
    );
    if (pendingItems.length === 0) return;

    for (const it of pendingItems) seenKeysRef.current.add(it.key);

    setQueue((prev) => [
      ...prev,
      ...pendingItems.map<PendingItem>((it) => ({
        item: it,
        unlockedCount: res.unlocked_count,
        totalCount: res.total,
        completedDays: res.completed_days,
        wordsLearned: res.words_learned,
      })),
    ]);
  }, [token]);

  // Poll on mount, when the tab regains focus, and every 90s while active so
  // unlocks that happen mid-session (heartbeat crossed a streak threshold,
  // kunlik reja PATCH crossed a words threshold) surface without a reload.
  useEffect(() => {
    if (!token) return;
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    const iv = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 90_000);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(iv);
    };
  }, [token, refresh]);

  const dismissCurrent = useCallback(() => {
    setQueue((prev) => {
      if (prev.length === 0) return prev;
      const [head, ...rest] = prev;
      // Ack in the background so the modal doesn't wait on the network.
      void ackAchievements(token, [head.item.key]);
      return rest;
    });
  }, [token]);

  const ctxValue = useMemo(() => ({ refresh }), [refresh]);

  const current = queue[0] ?? null;

  return (
    <AchievementCelebrationCtx.Provider value={ctxValue}>
      {children}
      <AchievementUnlockModal
        open={current !== null}
        item={current?.item ?? null}
        unlockedCount={current?.unlockedCount ?? 0}
        totalCount={current?.totalCount ?? TOTAL_MEDALS}
        completedDays={current?.completedDays ?? 0}
        wordsLearned={current?.wordsLearned ?? 0}
        onClose={dismissCurrent}
      />
    </AchievementCelebrationCtx.Provider>
  );
}
