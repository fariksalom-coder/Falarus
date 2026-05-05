export type DailyVocabProgressState = {
  step1Completed: boolean;
  step1Known: number;
  step1Unknown: number;
  step2Completed: boolean;
  step2Correct: number;
  step2Incorrect: number;
  step2Passed: boolean;
  step3Completed: boolean;
};

const STORAGE_KEY = 'falarus:dailyVocabProgress:v1';

export function defaultDailyVocabProgress(): DailyVocabProgressState {
  return {
    step1Completed: false,
    step1Known: 0,
    step1Unknown: 0,
    step2Completed: false,
    step2Correct: 0,
    step2Incorrect: 0,
    step2Passed: false,
    step3Completed: false,
  };
}

export function loadDailyVocabProgress(dayNumber: number): DailyVocabProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultDailyVocabProgress();
    const all = JSON.parse(raw) as Record<string, Partial<DailyVocabProgressState>>;
    const row = all[String(dayNumber)];
    return { ...defaultDailyVocabProgress(), ...row };
  } catch {
    return defaultDailyVocabProgress();
  }
}

export function patchDailyVocabProgress(
  dayNumber: number,
  patch: Partial<DailyVocabProgressState>,
): DailyVocabProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all: Record<string, DailyVocabProgressState> = raw ? JSON.parse(raw) : {};
    const prev = { ...defaultDailyVocabProgress(), ...(all[String(dayNumber)] ?? {}) };
    const next = { ...prev, ...patch };
    all[String(dayNumber)] = next;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('daily-vocab-progress'));
    return next;
  } catch {
    return defaultDailyVocabProgress();
  }
}
