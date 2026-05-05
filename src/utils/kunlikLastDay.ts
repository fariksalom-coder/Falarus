import { DAILY_COURSE_DAY_MAX, DAILY_COURSE_DAY_MIN } from '../../shared/dailyCourseDay';

const STORAGE_KEY = 'kunlik:lastOpenedDay';

export function rememberKunlikOpenedDay(dayNum: number): void {
  if (!Number.isInteger(dayNum) || dayNum < DAILY_COURSE_DAY_MIN || dayNum > DAILY_COURSE_DAY_MAX) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, String(dayNum));
  } catch {
    /* ignore */
  }
}

/**
 * `/kunlik-reja` ga browser «назад» bilan kirganda oxirgi kunni tiklash.
 * Bir marta o‘qiladi va kalitni olib tashlaydi (keyingi tashrifda `currentDay` ishlaydi).
 */
export function takeKunlikRestoreDay(): number | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw == null || raw === '') return null;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < DAILY_COURSE_DAY_MIN || n > DAILY_COURSE_DAY_MAX) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    sessionStorage.removeItem(STORAGE_KEY);
    return n;
  } catch {
    return null;
  }
}
