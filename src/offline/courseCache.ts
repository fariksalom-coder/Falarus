import type { DailyCourseDayBundle } from '../../shared/dailyCourseDay';
import type { KunlikDayProgress } from '../api/kunlikProgress';
import { isOffline, offlineUserId } from './outbox';

/*
 * OFLAYN KESH — kun materiallari va progress qurilmada saqlanadi.
 *
 * Internet bor paytda ochilgan (yoki oldindan yuklab olingan) kun keyin
 * internetsiz ham ochiladi. Joriy kun va keyingi 7 kun fon rejimida
 * yuklab olinadi — bir kun matni ~10–40 KB, ya'ni hammasi < 0.5 MB.
 *
 * Hammasi foydalanuvchi bo'yicha: bir qurilmada ikki hisob aralashmaydi.
 */
const VERSION = 'v1';
const KEEP_DAYS = 12;
export const PREFETCH_AHEAD = 7;
const PREFETCH_FRESH_MS = 12 * 3600_000;

function prefix(): string | null {
  const uid = offlineUserId();
  return uid ? `falarus:offline:${VERSION}:${uid}:` : null;
}

function read<T>(suffix: string): T | null {
  const p = prefix();
  if (!p) return null;
  try {
    const raw = localStorage.getItem(p + suffix);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(suffix: string, value: unknown): void {
  const p = prefix();
  if (!p) return;
  try {
    localStorage.setItem(p + suffix, JSON.stringify(value));
  } catch {
    // Xotira to'lgan — eng eski kunlarni tozalab qayta urinamiz.
    pruneDays(4);
    pruneDays(4, 'lesson');
    try {
      localStorage.setItem(p + suffix, JSON.stringify(value));
    } catch {
      /* oflayn nusxa saqlanmadi — internet bilan baribir ishlaydi */
    }
  }
}

/* ---------------- Kun materiallari ---------------- */

type CachedDay = { savedAt: number; bundle: DailyCourseDayBundle };

export function saveDayBundle(day: number, bundle: DailyCourseDayBundle): void {
  write(`day:${day}`, { savedAt: Date.now(), bundle } satisfies CachedDay);
  pruneDays(KEEP_DAYS);
}

export function loadDayBundle(day: number): CachedDay | null {
  return read<CachedDay>(`day:${day}`);
}

function pruneDays(keep: number, kind: 'day' | 'lesson' = 'day'): void {
  const p = prefix();
  if (!p) return;
  try {
    const days = Object.keys(localStorage)
      .filter((k) => k.startsWith(`${p}${kind}:`))
      .map((k) => ({ k, at: Number(JSON.parse(localStorage.getItem(k) || '{}').savedAt) || 0 }))
      .sort((a, b) => b.at - a.at);
    for (const { k } of days.slice(keep)) localStorage.removeItem(k);
  } catch {
    /* tozalanmasa — keyingi saqlashda */
  }
}

/**
 * Joriy va keyingi kunlarni fon rejimida yuklab qo'yadi. Yaqinda yuklangan
 * kun qayta so'ralmaydi; obunasiz kun (403) jim o'tkazib yuboriladi.
 */
export async function prefetchCourseDays(
  fetchDay: (day: number) => Promise<DailyCourseDayBundle>,
  fromDay: number,
  lastDay: number,
): Promise<void> {
  for (let day = fromDay; day <= Math.min(lastDay, fromDay + PREFETCH_AHEAD); day += 1) {
    if (isOffline()) return;
    const cached = loadDayBundle(day);
    if (cached && Date.now() - cached.savedAt < PREFETCH_FRESH_MS) continue;
    try {
      await fetchDay(day);
    } catch {
      /* yopiq kun yoki tarmoq — keyingisiga */
    }
  }
}

/* ---------------- Progress ---------------- */

export type CachedProgress = {
  savedAt: number;
  rows: KunlikDayProgress[];
  practicePromptCounts: Array<[number, number]>;
  speakingTaskCounts: Array<[number, number]>;
};

export function saveProgress(value: Omit<CachedProgress, 'savedAt'>): void {
  write('progress', { savedAt: Date.now(), ...value });
}

export function loadProgress(): CachedProgress | null {
  return read<CachedProgress>('progress');
}

/* ---------------- Ustoz darsi (AI) ---------------- */

/** Bir marta ochilgan AI darsi oflayn ham ko'rinsin (yangi dars yaratilmaydi). */
export function saveLesson(cacheKey: string, lesson: unknown): void {
  write(`lesson:${cacheKey}`, { savedAt: Date.now(), lesson });
  pruneDays(KEEP_DAYS, 'lesson');
}

export function loadLesson<T>(cacheKey: string): T | null {
  return read<{ lesson: T }>(`lesson:${cacheKey}`)?.lesson ?? null;
}

/* ---------------- AI qarzi ---------------- */

/*
 * Internetsiz AI bosqichlari (4 — gapirish, 5 — ustoz bilan suhbat) bajarilmaydi.
 * O'quvchi ularni "keyinroq" deb belgilasa, keyingi kun ochiladi, bu bosqichlar
 * esa qarz bo'lib qoladi: kun yashil bo'lmaydi, internet bilan bajariladi.
 */
export function aiDebtDays(): Set<number> {
  return new Set(read<number[]>('ai-debt') ?? []);
}

export function deferAiSteps(day: number): void {
  const days = aiDebtDays();
  days.add(day);
  write('ai-debt', [...days]);
}
