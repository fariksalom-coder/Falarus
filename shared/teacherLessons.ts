/**
 * PULLIK DARSLAR — umumiy qoidalar (server, o'quvchi, o'qituvchi, admin).
 *
 * Hayot yo'li: pending_payment → (Rahmat) paid → completed (o'qituvchi belgilaydi
 * yoki 24 soatdan keyin avtomatik) → balansga narx − komissiya.
 * O'quvchi muammo bildirsa — disputed (avtomatik yakunlanmaydi, admin hal qiladi).
 * Bekor qilish: boshlanishigacha; to'langan dars bekor qilinsa refund_due (admin qaytaradi).
 */
import { commissionForLesson, type CommissionTier } from './teacherOnboarding';

export type LessonStatus = 'pending_payment' | 'paid' | 'disputed' | 'completed' | 'cancelled' | 'refunded' | 'expired';

/** Dars 50 daqiqa; boshlanish vaqtlari soatbay, keyingi darsgacha 10 daqiqa tanaffus. */
export const LESSON_MINUTES = 50;
/** To'lanmagan bron vaqtni shuncha ushlab turadi, keyin bo'shatiladi. */
export const PENDING_HOLD_MINUTES = 30;
/** Eng erta bron: hozirdan shuncha vaqt keyin boshlanadigan dars. */
export const MIN_LEAD_MINUTES = 60;
/** Video xona: boshlanishdan 10 daqiqa oldin ochiladi, tugagach 30 daqiqa ochiq. */
export const JOIN_BEFORE_MINUTES = 10;
export const JOIN_AFTER_MINUTES = 30;
/** O'qituvchi belgilamasa — tugagandan keyin shuncha soatda avtomatik yakunlanadi. */
export const AUTO_COMPLETE_HOURS = 24;
/** O'quvchi muammo bildirishi mumkin bo'lgan muddat (dars tugagandan keyin). */
export const DISPUTE_HOURS = 24;
export const MIN_WITHDRAWAL_UZS = 50_000;

export const LESSON_STATUS_LABEL: Record<LessonStatus, { uz: string; ru: string }> = {
  pending_payment: { uz: 'Toʻlov kutilmoqda', ru: 'Ожидает оплаты' },
  paid: { uz: 'Toʻlangan', ru: 'Оплачен' },
  disputed: { uz: 'Muammo bildirilgan', ru: 'Есть жалоба' },
  completed: { uz: 'Oʻtkazildi', ru: 'Проведён' },
  cancelled: { uz: 'Bekor qilindi', ru: 'Отменён' },
  refunded: { uz: 'Pul qaytarildi', ru: 'Деньги возвращены' },
  expired: { uz: 'Toʻlanmadi', ru: 'Не оплачен' },
};

const ms = (iso: string | number | Date) => new Date(iso).getTime();

export function joinWindow(startsAt: string, endsAt: string) {
  return { opensAt: ms(startsAt) - JOIN_BEFORE_MINUTES * 60_000, closesAt: ms(endsAt) + JOIN_AFTER_MINUTES * 60_000 };
}

/** Xonaga kirish mumkinmi: 'early' — hali erta, 'late' — tugagan, 'open' — kirish mumkin. */
export function joinState(startsAt: string, endsAt: string, now = Date.now()): 'early' | 'open' | 'late' {
  const w = joinWindow(startsAt, endsAt);
  return now < w.opensAt ? 'early' : now > w.closesAt ? 'late' : 'open';
}

/** O'qituvchi «Dars o'tdi» ni faqat dars boshlangandan keyin bosa oladi. */
export const canComplete = (status: LessonStatus, startsAt: string, now = Date.now()) =>
  status === 'paid' && now >= ms(startsAt);

/** Bekor qilish — faqat boshlanishigacha (to'langan bo'lsa pul qaytariladi). */
export const canCancel = (status: LessonStatus, startsAt: string, now = Date.now()) =>
  (status === 'pending_payment' || status === 'paid') && now < ms(startsAt);

/** O'quvchi muammo bildira oladi: dars boshlangandan keyin, tugagach 24 soatgacha. */
export const canDispute = (status: LessonStatus, startsAt: string, endsAt: string, now = Date.now()) =>
  status === 'paid' && now >= ms(startsAt) && now <= ms(endsAt) + DISPUTE_HOURS * 3600_000;

export const autoCompleteDue = (status: LessonStatus, endsAt: string, now = Date.now()) =>
  status === 'paid' && now >= ms(endsAt) + AUTO_COMPLETE_HOURS * 3600_000;

/** Dars pulining bo'linishi: `lessonNumber` — o'qituvchining platformadagi nechanchi darsi. */
export function splitLessonPrice(priceUzs: number, lessonNumber: number, tiers: CommissionTier[]) {
  const percent = commissionForLesson(lessonNumber, tiers);
  const platform = Math.round((priceUzs * percent) / 100);
  return { percent, platform, teacher: priceUzs - platform };
}

/** Karta raqami: 16 raqam (bo'sh joylar bilan ham). Luhn tekshirilmaydi — Uzcard/Humo raqamlari unga doim mos emas. */
export function normalizeCardNumber(raw: unknown): string | null {
  const digits = String(raw ?? '').replace(/\D/g, '');
  return digits.length === 16 ? digits : null;
}

export const maskCard = (digits: string) => `${digits.slice(0, 4)} •••• •••• ${digits.slice(-4)}`;

/* ─────────────────────────── Ustoz darajasi va baholash ─────────────────────────── */

export type TeacherLevelKey = 'new' | 'tutor' | 'experienced' | 'pro' | 'super';

/**
 * Daraja platformadagi o'tkazilgan darslar va reyting bilan o'zi oshadi.
 * Reyting sharti faqat kamida `minReviews` ta sharh bo'lsa hisoblanadi — bitta
 * 5 yulduzli sharh bilan «Super repetitor» bo'lib qolmasin.
 */
export const TEACHER_LEVELS: { key: TeacherLevelKey; uz: string; ru: string; minLessons: number; minRating: number | null }[] = [
  { key: 'new', uz: 'Yangi ustoz', ru: 'Новый преподаватель', minLessons: 0, minRating: null },
  { key: 'tutor', uz: 'Repetitor', ru: 'Репетитор', minLessons: 20, minRating: null },
  { key: 'experienced', uz: 'Tajribali repetitor', ru: 'Опытный репетитор', minLessons: 100, minRating: 4.5 },
  { key: 'pro', uz: 'Professional', ru: 'Профессионал', minLessons: 500, minRating: 4.7 },
  { key: 'super', uz: 'Super repetitor', ru: 'Супер-репетитор', minLessons: 1000, minRating: 4.8 },
];
export const LEVEL_MIN_REVIEWS = 5;

export function teacherLevel(lessonsDone: number, ratingAvg: number | null | undefined, ratingCount: number | null | undefined) {
  const rated = Number(ratingCount ?? 0) >= LEVEL_MIN_REVIEWS ? Number(ratingAvg ?? 0) : null;
  let level = TEACHER_LEVELS[0];
  for (const l of TEACHER_LEVELS) {
    if (lessonsDone < l.minLessons) break;
    if (l.minRating != null && (rated == null || rated < l.minRating)) break;
    level = l;
  }
  return level;
}

/** O'quvchi darsdan keyin ustozni shu to'rt mezon bo'yicha 1–5 baholaydi. */
export const REVIEW_CRITERIA = [
  { key: 'support', uz: 'Qoʻllab-quvvatlash', ru: 'Поддержка', hint: 'Qiyin joyda yordam beradimi, ruhlantiradimi' },
  { key: 'honesty', uz: 'Halollik', ru: 'Честность', hint: 'Vaqtida keladimi, vaʼdasini bajaradimi' },
  { key: 'progress', uz: 'Natija', ru: 'Прогресс', hint: 'Darslardan keyin rus tilingiz yaxshilanyaptimi' },
  { key: 'preparation', uz: 'Darsga tayyorgarlik', ru: 'Подготовка к уроку', hint: 'Dars rejali, materiallar tayyormi' },
] as const;
export type ReviewCriterion = (typeof REVIEW_CRITERIA)[number]['key'];
export const REVIEW_TEXT_MAX = 1500;

/** Baholarni tekshiradi: har bir mezon 1..5 butun son. Noto'g'ri bo'lsa — null. */
export function normalizeReviewScores(raw: unknown): Record<ReviewCriterion, number> | null {
  const x = (raw ?? {}) as Record<string, unknown>;
  const out = {} as Record<ReviewCriterion, number>;
  for (const c of REVIEW_CRITERIA) {
    const n = Number(x[c.key]);
    if (!Number.isInteger(n) || n < 1 || n > 5) return null;
    out[c.key] = n;
  }
  return out;
}

export const reviewOverall = (s: Record<ReviewCriterion, number>) =>
  Math.round((REVIEW_CRITERIA.reduce((sum, c) => sum + s[c.key], 0) / REVIEW_CRITERIA.length) * 10) / 10;
