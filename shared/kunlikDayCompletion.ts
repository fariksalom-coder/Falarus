/** Kunlik kun «to‘liq tugagan» — statistika va taqvim bilan mos (server + api umumiy). */

export type KunlikDayProgressFields = {
  day_number: number;
  grammar_1: boolean;
  grammar_2: boolean;
  grammar_3: boolean;
  words_match: boolean;
  oqish_done: boolean;
  speaking_level: number | null | undefined;
};

function promptCount(map: Map<number, number> | Record<number, number>, day: number): number {
  if (map instanceof Map) return map.get(day) ?? 0;
  return map[day] ?? 0;
}

export function isKunlikDayRowFullyComplete(
  r: KunlikDayProgressFields,
  practicePromptCountByDay: Map<number, number> | Record<number, number>,
): boolean {
  const grammarOk = r.grammar_1 && r.grammar_2 && r.grammar_3;
  const vocabOk = r.words_match === true;
  const readOk = r.oqish_done === true;
  const pt = promptCount(practicePromptCountByDay, r.day_number);
  const speakOk = pt === 0 ? true : (r.speaking_level ?? 0) >= pt;
  return grammarOk && vocabOk && readOk && speakOk;
}
