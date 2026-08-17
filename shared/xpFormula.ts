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
 * QOIDA (2026-08-12 dan): XP KUNNING HAR BIR MASHQIDAN beriladi.
 * Ilgari u faqat ibora testlaridan edi (kuniga eng ko'pi 10 ball) — o'quvchi
 * 20 savollik grammatika testini, juftlikni, gap tuzishni, o'qish va
 * gapirishni bajarib ham noldan qimirlamasdi. Bu mashqlarni "keraksiz" qilib
 * ko'rsatardi.
 *
 * IKKI XIL BALL:
 *   1. TO'G'RI JAVOB uchun — server javobni o'zi tekshirgan joylarda
 *      (grammatika testi, ibora testi, matn savollari). Bu yerda ball
 *      aniqlikka bog'liq.
 *   2. BAJARILGAN BLOK uchun — qat'iy 5 ball. Bu maydonlarni klient yozadi,
 *      shuning uchun ular ATAYLAB kichik va chegaralangan: halol o'quvchi
 *      ham, boshqacha yo'l qidirgan ham bir xil olishi mumkin, ya'ni
 *      reytingni buzishga arzimaydi.
 *
 * Sanoq maydonlari server tomonida faqat OSHADI (`mergeKunlikDayPatch`
 * MAX_KEYS) va kundagi savol sonidan oshmaydi — ballni "farming" qilib
 * bo'lmaydi.
 *
 * Daraja: `level = floor(total_points / 500) + 1`.
 */

export type KunlikDayRowForXp = {
  /** Grammatika testidagi to'g'ri javoblar (server tekshiradi). */
  grammar_correct?: number | null;
  /** Ibora testlaridagi to'g'ri javoblar (server tekshiradi). */
  phrases_correct?: number | null;
  /** Matn savollaridagi to'g'ri javoblar (server tekshiradi). */
  text_questions_correct?: number | null;
  /** Lug'at testidagi to'g'ri javoblar. */
  words_correct?: number | null;
  /** Tarjima mashqlaridan nechtasi bajarilgan. */
  speaking_level?: number | null;
  /** Ochiq gapirish topshiriqlaridan nechtasi bajarilgan. */
  speaking_tasks_done?: number | null;

  grammar_1?: boolean | null;
  grammar_2?: boolean | null;
  grammar_3?: boolean | null;
  words_match?: boolean | null;
  oqish_done?: boolean | null;
  phrases_done?: boolean | null;
};

/**
 * Chegaralar — bir kunda hisobga olinadigan eng ko'p miqdor.
 *
 * Har biri kundagi HAQIQIY kontent sonidan sal katta qilib olingan (masalan
 * grammatika testida 10-20 savol bor, chegara 25): halol o'quvchi chegaraga
 * urilmaydi, kontent kutilmaganda kattayib ketsa esa ball portlab ketmaydi.
 */
const CAP = {
  grammar_correct: 25,
  phrases_correct: 30,
  text_questions_correct: 15,
  words_correct: 15,
  speaking_level: 12,
  speaking_tasks_done: 12,
} as const;

/** Bajarilgan blok uchun qat'iy ball. */
const BLOK_XP = 5;
/** Ochiq gapirish topshirig'i — og'zaki ish, bir topshiriq 2 ball. */
const GAPIRISH_TOPSHIRIQ_XP = 2;

export const XP_PER_LEVEL = 500;

function son(v: number | null | undefined, cap: number): number {
  return Math.min(Math.max(Math.floor(Number(v ?? 0)), 0), cap);
}

export function calculateXpForKunlikDay(row: KunlikDayRowForXp): number {
  let xp = 0;

  // 1. To'g'ri javoblar.
  xp += son(row.grammar_correct, CAP.grammar_correct);
  xp += son(row.phrases_correct, CAP.phrases_correct);
  xp += son(row.text_questions_correct, CAP.text_questions_correct);
  xp += son(row.words_correct, CAP.words_correct);
  xp += son(row.speaking_level, CAP.speaking_level);
  xp += son(row.speaking_tasks_done, CAP.speaking_tasks_done) * GAPIRISH_TOPSHIRIQ_XP;

  // 2. Bajarilgan bloklar.
  const bloklar = [
    row.grammar_1,
    row.grammar_2,
    row.grammar_3,
    row.words_match,
    row.oqish_done,
    row.phrases_done,
  ];
  xp += bloklar.filter(Boolean).length * BLOK_XP;

  return xp;
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
