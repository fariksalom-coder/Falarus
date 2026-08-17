/**
 * teacherTrials.ts — sinov darsi qoidalari (sof mantiq).
 *
 * MODEL:
 *  - O'quvchi eng ko'pi UCHTA turli ustozdan bittadan bepul sinov darsi oladi.
 *  - Sinovdan so'ng ULARDAN BIRINI tanlab, oylik kursga to'lov qiladi.
 *  - Bekor qilingan darslar hisobga kirmaydi — o'quvchi o'rniga boshqa
 *    ustozni sinab ko'ra olishi kerak.
 *  - Bitta ustoz bilan qayta yozilish yangi "slot" emas: u allaqachon
 *    hisoblangan ustoz.
 *
 * Bu yerda baza ham, HTTP ham yo'q — shuning uchun qoida testlanadi
 * (`tests/teacherTrials.test.ts`) va marshrut faqat shu funksiyani chaqiradi.
 */

/** Bitta o'quvchi nechta TURLI ustozdan sinov darsi olishi mumkin. */
export const STUDENT_TRIAL_TEACHER_LIMIT = 3;

export type TrialRowLike = {
  teacher_user_id: number | string;
  status?: string | null;
};

/**
 * Yozuv 3 ta slotdan bittasini band qiladimi?
 *
 * YO'Q, agar:
 *  - bekor qilingan bo'lsa;
 *  - `pending_payment` bo'lsa — bu tugallanmagan to'lov, ya'ni dars hali
 *    yo'q. Aks holda to'lovni tashlab ketgan o'quvchi bepul sinovdan
 *    butunlay mahrum bo'lardi.
 */
export function trialCountsTowardLimit(row: TrialRowLike): boolean {
  const status = String(row?.status ?? '').toLowerCase();
  if (status.includes('cancel')) return false;
  if (status.includes('pending_payment')) return false;
  return true;
}

/** O'quvchi haqiqatan sinab ko'rgan ustozlar ro'yxati. */
export function activeTrialTeacherIds(rows: TrialRowLike[]): number[] {
  const ids = new Set<number>();
  for (const row of rows ?? []) {
    if (!trialCountsTowardLimit(row)) continue;
    const id = Number(row?.teacher_user_id);
    if (Number.isFinite(id)) ids.add(id);
  }
  return [...ids];
}

export type TrialBookingCheck = {
  allowed: boolean;
  reason: 'new' | 'existing' | 'limit';
  used: number;
  remaining: number;
  /** Rad etilganda — o'quvchiga ko'rsatiladigan sabab. Ruxsat berilganda bo'sh. */
  message: string;
};

/**
 * O'quvchi shu ustozga yozila oladimi?
 * Allaqachon sinagan ustoziga qayta yozilish HAR DOIM mumkin (bu yangi slot emas).
 */
export function checkTrialBooking(params: {
  existingRows: TrialRowLike[];
  teacherId: number;
  limit?: number;
}): TrialBookingCheck {
  const limit = params.limit ?? STUDENT_TRIAL_TEACHER_LIMIT;
  const ids = activeTrialTeacherIds(params.existingRows);
  const used = ids.length;
  const already = ids.includes(Number(params.teacherId));

  if (already) {
    return {
      allowed: true,
      reason: 'existing',
      used,
      remaining: Math.max(0, limit - used),
      message: '',
    };
  }
  if (used >= limit) {
    return {
      allowed: false,
      reason: 'limit',
      used,
      remaining: 0,
      message: `Siz ${limit} ta ustozdan sinov darsi oldingiz. Endi ulardan birini tanlab, kursni boshlang.`,
    };
  }
  return { allowed: true, reason: 'new', used, remaining: limit - used - 1, message: '' };
}
