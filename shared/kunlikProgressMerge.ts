export type KunlikDayPatchFields = {
  grammar_1?: boolean;
  grammar_2?: boolean;
  grammar_3?: boolean;
  words_learned?: number;
  words_correct?: number;
  words_match?: boolean;
  oqish_done?: boolean;
  speaking_level?: number;
};

export type KunlikDayProgressFields = {
  grammar_1: boolean;
  grammar_2: boolean;
  grammar_3: boolean;
  words_learned: number;
  words_correct: number;
  words_match: boolean;
  oqish_done: boolean;
  speaking_level: number;
};

const BOOL_KEYS = ['grammar_1', 'grammar_2', 'grammar_3', 'words_match', 'oqish_done'] as const;
const MAX_KEYS = ['words_learned', 'words_correct', 'speaking_level'] as const;

/** Progress only moves forward — repeats must not clear completed stages or lower scores. */
export function mergeKunlikDayPatch(
  prev: KunlikDayProgressFields,
  patch: KunlikDayPatchFields,
): KunlikDayPatchFields {
  const diff: KunlikDayPatchFields = {};

  for (const key of BOOL_KEYS) {
    if (!(key in patch)) continue;
    const nextVal = patch[key];
    if (nextVal !== true) continue;
    if (prev[key] === true) continue;
    diff[key] = true;
  }

  for (const key of MAX_KEYS) {
    if (!(key in patch)) continue;
    const raw = patch[key];
    if (typeof raw !== 'number' || !Number.isFinite(raw)) continue;
    const nextVal = Math.max(prev[key] ?? 0, Math.floor(raw));
    if (nextVal === (prev[key] ?? 0)) continue;
    diff[key] = nextVal;
  }

  return diff;
}

export function isKunlikGrammarFullyDone(
  row: Pick<KunlikDayProgressFields, 'grammar_1' | 'grammar_2' | 'grammar_3'>,
): boolean {
  return row.grammar_1 && row.grammar_2 && row.grammar_3;
}
