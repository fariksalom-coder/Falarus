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

export const LESSON_MINUTES = 60;
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
