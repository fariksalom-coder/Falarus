/**
 * lessonCountdown — darsgacha qolgan vaqtning RAQAMLI sanog'i.
 *
 * Soat:daqiqa:soniya ko'rinishida, har soniyada yangilanadi — o'quvchi
 * darsning yaqinlashayotganini aniq ko'rib turishi uchun.
 *
 * Alohida fayl: chegara holatlari (soat/kun o'tishi, dars boshlanishi,
 * darsning eskirishi) oson adashadi, shuning uchun sof funksiya sifatida
 * `tests/lessonCountdown.test.ts` da tekshiriladi.
 */

/** Dars boshlanganidan keyin shuncha vaqt "hozir boshlandi" deb ko'rsatiladi. */
export const LESSON_WINDOW_MS = 90 * 60 * 1000;

export type Countdown = {
  /** Raqamli sanoq: `SS:DD:SS` (bir kundan ko'p bo'lsa `kun` bilan birga). */
  text: string;
  /** Bir soatdan kam qoldi yoki dars boshlandi — diqqatni tortadigan holat. */
  urgent: boolean;
  /** Dars allaqachon boshlangan. */
  started: boolean;
};

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Darsgacha qolgan vaqt — HAR DOIM raqamli, soniyagacha: `04:07:12`.
 * Bir kundan ko'p qolsa oldiga kun qo'shiladi: `2 kun 03:12:45`.
 * Vaqt yo'q, noto'g'ri yoki dars ancha oldin bo'lgan bo'lsa — `null`.
 */
export function lessonCountdown(startsAt: string | null, now: number): Countdown | null {
  if (!startsAt) return null;
  const start = new Date(startsAt).getTime();
  if (Number.isNaN(start)) return null;

  const left = start - now;
  if (left <= 0) {
    return now - start < LESSON_WINDOW_MS
      ? { text: 'Hozir boshlandi', urgent: true, started: true }
      : null;
  }

  const totalSec = Math.floor(left / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  const clock = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return {
    text: days > 0 ? `${days} kun ${clock}` : clock,
    urgent: totalSec < 3600,
    started: false,
  };
}

/** Shu dars uchun sanoq umuman kerakmi (taymerni bekorga yurgizmaslik uchun). */
export function needsCountdown(startsAt: string | null, now: number): boolean {
  if (!startsAt) return false;
  const start = new Date(startsAt).getTime();
  if (Number.isNaN(start)) return false;
  return now - start < LESSON_WINDOW_MS;
}
