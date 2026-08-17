import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isKunlikDayRowFullyComplete } from '../shared/kunlikDayCompletion';
import { mergeKunlikDayPatch } from '../shared/kunlikProgressMerge';

const base = {
  grammar_1: true,
  grammar_2: true,
  grammar_3: true,
  words_learned: 8,
  words_correct: 7,
  words_match: true,
  phrases_done: true,
  phrases_correct: 5,
  text_questions_correct: 0,
  speaking_tasks_done: 0,
  oqish_done: true,
  speaking_level: 3,
};

describe('mergeKunlikDayPatch', () => {
  it('ignores boolean regressions and lower numeric scores on repeat', () => {
    assert.deepStrictEqual(mergeKunlikDayPatch(base, {
        grammar_2: false,
        words_correct: 0,
        words_learned: 1,
        speaking_level: 1,
      }), {});
  });

  it('keeps forward-only updates', () => {
    assert.deepStrictEqual(mergeKunlikDayPatch(
        { ...base, grammar_3: false, words_match: false, speaking_level: 1 },
        {
          grammar_3: true,
          words_match: true,
          words_correct: 5,
          speaking_level: 4,
        },
      ), {
      grammar_3: true,
      words_match: true,
      speaking_level: 4,
    });
  });
});

describe('phrases_done (lug\'at 4-vazifasi)', () => {
  it('faqat oldinga qarab yangilanadi', () => {
    assert.deepStrictEqual(
      mergeKunlikDayPatch({ ...base, phrases_done: false }, { phrases_done: true }),
      { phrases_done: true },
    );
    assert.deepStrictEqual(mergeKunlikDayPatch(base, { phrases_done: false }), {});
  });

  it('kunning «tugallandi» mezoniga TA\'SIR QILMAYDI', () => {
    // Iboralar qo'shimcha mashq: kontenti yo'q kunlar bloklanmasligi kerak.
    const row = {
      day_number: 1,
      grammar_1: true,
      grammar_2: true,
      grammar_3: true,
      words_match: true,
      oqish_done: true,
      speaking_level: 0,
    };
    assert.strictEqual(isKunlikDayRowFullyComplete(row, new Map()), true);
  });
});
