import { describe, expect, it } from 'vitest';
import { mergeKunlikDayPatch } from '../shared/kunlikProgressMerge';

const base = {
  grammar_1: true,
  grammar_2: true,
  grammar_3: true,
  words_learned: 8,
  words_correct: 7,
  words_match: true,
  oqish_done: true,
  speaking_level: 3,
};

describe('mergeKunlikDayPatch', () => {
  it('ignores boolean regressions and lower numeric scores on repeat', () => {
    expect(
      mergeKunlikDayPatch(base, {
        grammar_2: false,
        words_correct: 0,
        words_learned: 1,
        speaking_level: 1,
      }),
    ).toEqual({});
  });

  it('keeps forward-only updates', () => {
    expect(
      mergeKunlikDayPatch(
        { ...base, grammar_3: false, words_match: false, speaking_level: 1 },
        {
          grammar_3: true,
          words_match: true,
          words_correct: 5,
          speaking_level: 4,
        },
      ),
    ).toEqual({
      grammar_3: true,
      words_match: true,
      speaking_level: 4,
    });
  });
});
