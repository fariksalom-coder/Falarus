/**
 * Точный подсчёт выученных слов: Bugun, Bu hafta, Jami.
 * При каждом увеличении total из API сохраняем прирост за сегодня и за последние 7 дней.
 */

const KEY_PREVIOUS_TOTAL = 'vocab_stats_previous_total';
const KEY_DAILY_INCREMENTS = 'vocab_stats_daily_increments';
const MAX_DAYS_KEPT = 60;

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getStoredPreviousTotal(): number | null {
  try {
    const raw = localStorage.getItem(KEY_PREVIOUS_TOTAL);
    if (raw === null) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function setStoredPreviousTotal(value: number): void {
  try {
    localStorage.setItem(KEY_PREVIOUS_TOTAL, String(value));
  } catch {
    /* ignore */
  }
}

function getDailyIncrements(): Record<string, number> {
  try {
    const raw = localStorage.getItem(KEY_DAILY_INCREMENTS);
    if (!raw) return {};
    const data = JSON.parse(raw);
    return typeof data === 'object' && data !== null ? data : {};
  } catch {
    return {};
  }
}

function setDailyIncrements(increments: Record<string, number>): void {
  try {
    const keys = Object.keys(increments).sort();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - MAX_DAYS_KEPT);
    const cutoffKey = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;
    const pruned: Record<string, number> = {};
    for (const k of keys) {
      if (k >= cutoffKey) pruned[k] = increments[k];
    }
    localStorage.setItem(KEY_DAILY_INCREMENTS, JSON.stringify(pruned));
  } catch {
    /* ignore */
  }
}

export type VocabDailyStats = {
  todayWords: number;
  weekWords: number;
  totalWords: number;
};

/**
 * Принимает текущее общее количество выученных слов (из API).
 * При первом вызове запоминает total и возвращает today=0, week=0.
 * При последующих вызовах прирост (delta) добавляется к сегодняшней дате и возвращаются актуальные today/week/total.
 */
export function getVocabDailyStats(totalFromApi: number): VocabDailyStats {
  const today = todayKey();
  const prev = getStoredPreviousTotal();
  const increments = getDailyIncrements();

  if (prev === null) {
    if (totalFromApi > 0) setStoredPreviousTotal(totalFromApi);
    return {
      todayWords: 0,
      weekWords: 0,
      totalWords: totalFromApi,
    };
  }

  const delta = totalFromApi - prev;
  if (delta > 0) {
    increments[today] = (increments[today] ?? 0) + delta;
    setDailyIncrements(increments);
    setStoredPreviousTotal(totalFromApi);
  }

  const todayWords = increments[today] ?? 0;

  const weekKeys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    weekKeys.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    );
  }
  const weekWords = weekKeys.reduce((sum, k) => sum + (increments[k] ?? 0), 0);

  return {
    todayWords,
    weekWords,
    totalWords: totalFromApi,
  };
}
