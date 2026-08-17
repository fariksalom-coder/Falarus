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
  phrases_done: false,
  phrases_correct: 0,
  text_questions_correct: 0,
  speaking_tasks_done: 0,
  oqish_done: false,
  speaking_level: 0,
};

/*
 * BITTA SO'ROV — KO'P CHAQIRUVCHI.
 *
 * Bu hook bitta sahifada bir necha marta chaqiriladi: masalan
 * `/kunlik-reja/kun/N/grammatika` da beshta komponent + ketma-ketlik
 * darvozasi, ya'ni oltita bir xil `GET /api/kunlik-progress`. Grammatika
 * zanjiri bo'ylab yurilganda bu o'nlab ortiqcha so'rovga aylanadi va
 * serverdagi IP chegarasiga (180/daqiqa) urilib «So'rovlar soni oshib
 * ketdi» xatosini chiqaradi — sahifa umuman ochilmaydi.
 *
 * Shuning uchun ayni paytda ketayotgan so'rov UMUMIY: bir vaqtda mount
 * bo'lgan hamma chaqiruvchi bitta javobni bo'lishadi. Kesh QISQA (1.5 s) va
 * har patchdan keyin bekor qilinadi — aks holda navbatdagi vazifa sahifasi
 * eskirgan progressni o'qib foydalanuvchini ortga uloqtirardi.
 */
type UmumiyOqish = {
  token: string | null;
  vaqt: number;
  natija: ReturnType<typeof fetchKunlikProgress>;
};
let umumiyOqish: UmumiyOqish | null = null;
const UMUMIY_TTL_MS = 1_500;

function progressniOqi(token: string | null): ReturnType<typeof fetchKunlikProgress> {
  const hozir = Date.now();
  if (umumiyOqish && umumiyOqish.token === token && hozir - umumiyOqish.vaqt < UMUMIY_TTL_MS) {
    return umumiyOqish.natija;
  }
  const natija = fetchKunlikProgress(token);
  umumiyOqish = { token, vaqt: hozir, natija };
  return natija;
}

/** Progress o'zgardi — keyingi sahifa serverdan YANGI holatni o'qisin. */
function umumiyKeshniTashla(): void {
  umumiyOqish = null;
}

export function useKunlikProgress() {
  const { token } = useAuth();
  const [rows, setRows] = useState<Map<number, KunlikDayProgress>>(new Map());
  const [speakingTaskCountByDay, setSpeakingTaskCountByDay] = useState<Map<number, number>>(
    () => new Map(),
  );
  const [practicePromptCountByDay, setPracticePromptCountByDay] = useState<Map<number, number>>(
    () => new Map(),
  );
  const [loaded, setLoaded] = useState(false);
  // Last known full row per day (server state + patches already sent),
  // used to avoid re-sending fields that would not change anything.
  const sentRef = useRef<Map<number, Omit<KunlikDayProgress, 'day_number'>>>(new Map());

  useEffect(() => {
    if (!token) {
      setRows(new Map());
      setPracticePromptCountByDay(new Map());
      setSpeakingTaskCountByDay(new Map());
      sentRef.current = new Map();
      setLoaded(true);
      return;
    }

    let cancelled = false;
    setLoaded(false);

    progressniOqi(token)
      .then(({ rows: items, practicePromptCounts, speakingTaskCounts }) => {
        if (cancelled) return;
        const map = new Map<number, KunlikDayProgress>();
        for (const row of items) map.set(row.day_number, row);
        setRows(map);
        const mergedCounts = new Map<number, number>();
        for (let d = 1; d <= TOTAL_DAYS; d += 1) {
          mergedCounts.set(d, practicePromptCounts.get(d) ?? 0);
        }
        setPracticePromptCountByDay(mergedCounts);
        const mergedSpeaking = new Map<number, number>();
        for (let d = 1; d <= TOTAL_DAYS; d += 1) {
          mergedSpeaking.set(d, speakingTaskCounts.get(d) ?? 0);
        }
        setSpeakingTaskCountByDay(mergedSpeaking);
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
  /*
   * Promise QAYTARADI va uni kutish SHART, agar shu patchdan keyin darhol
   * navbatdagi vazifa sahifasiga o'tilsa. Har sahifa `useKunlikProgress` ni
   * o'zi chaqiradi (umumiy store yo'q), ya'ni yangi sahifa mount bo'lganda
   * progressni serverdan QAYTA o'qiydi. Patch kutilmasa, o'sha GET PATCH'dan
   * oldin yetib borib "oldingi vazifa bajarilmagan" deb ko'radi va sahifa
   * foydalanuvchini ortga uloqtiradi — vazifa boshidan boshlanadi.
   */
  const patchDay = useCallback(
    async (dayNumber: number, patch: KunlikDayPatch): Promise<void> => {
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

      umumiyKeshniTashla();
      await patchKunlikDayProgress(token, dayNumber, diff);
      // Patchdan keyin ham tashlanadi: kesh so'rov ketgan paytda yangilangan
      // bo'lishi mumkin, u holda eski javob qayta ishlatilib qolardi.
      umumiyKeshniTashla();
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

  return {
    rows,
    loaded,
    practicePromptCountByDay,
    speakingTaskCountByDay,
    getDay,
    patchDay,
    isGrammarDone,
    isOqishDone,
    isMatchDone,
  };
}
