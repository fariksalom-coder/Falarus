/** Kunlik kun «to‘liq tugagan» — statistika va taqvim bilan mos (server + api umumiy). */

export type KunlikDayProgressFields = {
  day_number: number;
  grammar_1: boolean;
  grammar_2: boolean;
  grammar_3: boolean;
  words_match: boolean;
  oqish_done: boolean;
  speaking_level: number | null | undefined;
  /** 5-blok: ustoz bilan jonli savol-javob. */
  suhbat_done: boolean | null | undefined;
};

function promptCount(map: Map<number, number> | Record<number, number>, day: number): number {
  if (map instanceof Map) return map.get(day) ?? 0;
  return map[day] ?? 0;
}

/**
 * Diqqat: lug'atning 4-vazifasi (`phrases_done` — ibora testlari) bu yerga
 * ATAYIN kiritilmagan. U qo'shimcha mashq: hamma kunda kontenti yo'q, va
 * mezonga qo'shilsa admin ibora qo'shgan zahoti allaqachon yopilgan kunlar
 * qaytadan "tugallanmagan" bo'lib qolardi.
 */
export function isKunlikDayRowFullyComplete(
  r: KunlikDayProgressFields,
  practicePromptCountByDay: Map<number, number> | Record<number, number>,
): boolean {
  return isKunlikDayReadyForSuhbat(r, practicePromptCountByDay) && r.suhbat_done === true;
}

/**
 * DASTLABKI TO'RT BLOK bajarilganmi — ya'ni 5-blok (savol-javob) ochiladimi.
 *
 * Alohida chiqarilgan, chunki ikki joyda kerak: bosh sahifadagi bloklar
 * zanjiri va savol-javob sahifasining O'ZI. Sahifa ham tekshirishi shart —
 * bosh sahifada kartani yashirish yetarli emas, manzilni qo'lda yozib
 * kirish mumkin edi.
 */
export function isKunlikDayReadyForSuhbat(
  r: Omit<KunlikDayProgressFields, 'suhbat_done'>,
  practicePromptCountByDay: Map<number, number> | Record<number, number>,
): boolean {
  const grammarOk = r.grammar_1 && r.grammar_2 && r.grammar_3;
  const vocabOk = r.words_match === true;
  const readOk = r.oqish_done === true;
  const pt = promptCount(practicePromptCountByDay, r.day_number);
  const speakOk = pt === 0 ? true : (r.speaking_level ?? 0) >= pt;
  return grammarOk && vocabOk && readOk && speakOk;
}
