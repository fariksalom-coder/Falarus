/**
 * YANGI XP hisoblashning yagona manbasi.
 *
 * REYTING TARIXI: platformada 2026-08-01 gacha yig'ilgan jami ball
 * `users.legacy_points` da muzlatilgan va `xpService` uni BAZA sifatida
 * qo'shadi. Ya'ni jami ball =
 *     legacy_points + (shu fayldagi formula)
 * Shuning uchun eski foydalanuvchilarning o'rni yo'qolmaydi, reyting o'sha
 * joydan davom etadi.
 *
 * QOIDA (2026-08-01 dan): YANGI XP faqat lug'atdagi ibora testlaridan —
 * har bir TO'G'RI javob uchun 1 XP. Boshqa hech narsa ball bermaydi:
 * grammatika, so'zlar, juftlik, o'qish, gapirish, shuningdek streak va
 * sarflangan vaqt bonuslari ham bekor qilindi. Maqsad — reyting bitta aniq
 * va taqqoslanadigan ko'rsatkichga asoslansin.
 *
 * `phrases_correct` server tomonida faqat OSHADI (`mergeKunlikDayPatch`
 * MAX_KEYS), va bir kunda u o'sha kundagi iboralar sonidan oshmaydi —
 * shuning uchun ballni "farming" qilib bo'lmaydi.
 *
 * Daraja: `level = floor(total_points / 500) + 1`.
 */

export type KunlikDayRowForXp = {
  /** Ibora testlaridagi to'g'ri javoblar soni — yagona XP manbai. */
  phrases_correct?: number | null;
};

/**
 * Bir kunda hisobga olinadigan eng ko'p to'g'ri javob. Kunlik ibora soni
 * hozir 10 atrofida, shuning uchun chegara amalda urilmaydi — u faqat
 * kontent kutilmaganda kattalashib ketsa ishlaydigan zaxira.
 */
const CAP_PHRASES_CORRECT_PER_DAY = 30;

export const XP_PER_LEVEL = 500;

export function calculateXpForKunlikDay(row: KunlikDayRowForXp): number {
  const correct = Math.max(row.phrases_correct ?? 0, 0);
  return Math.min(correct, CAP_PHRASES_CORRECT_PER_DAY);
}

export function calculateTotalXp(input: { kunlikRows: KunlikDayRowForXp[] }): number {
  return input.kunlikRows.reduce((sum, r) => sum + calculateXpForKunlikDay(r), 0);
}

export function levelFromXp(xp: number): { level: number; toNext: number; pctInLevel: number } {
  const safe = Math.max(0, Math.floor(xp));
  const level = Math.floor(safe / XP_PER_LEVEL) + 1;
  const inLevel = safe % XP_PER_LEVEL;
  const toNext = XP_PER_LEVEL - inLevel;
  const pctInLevel = Math.round((inLevel / XP_PER_LEVEL) * 100);
  return { level, toNext, pctInLevel };
}
