/**
 * XP qoidasi: ball FAQAT lug'atdagi ibora testlaridan yig'iladi —
 * har bir TO'G'RI javob uchun 1 XP, boshqa hech narsadan emas.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateXpForKunlikDay, calculateTotalXp, levelFromXp } from '../shared/xpFormula';
import { mergeKunlikDayPatch } from '../shared/kunlikProgressMerge';

describe('ibora XP', () => {
  it('har bir to‘g‘ri javob 1 XP beradi', () => {
    assert.strictEqual(calculateXpForKunlikDay({ phrases_correct: 7 }), 7);
    assert.strictEqual(calculateXpForKunlikDay({ phrases_correct: 0 }), 0);
  });

  it('10 tadan 10 tasi to‘g‘ri → 10 XP', () => {
    assert.strictEqual(calculateXpForKunlikDay({ phrases_correct: 10 }), 10);
  });

  it('ma’lumot yo‘q bo‘lsa 0', () => {
    assert.strictEqual(calculateXpForKunlikDay({}), 0);
    assert.strictEqual(calculateXpForKunlikDay({ phrases_correct: null }), 0);
  });

  it('manfiy qiymat XP kamaytirmaydi', () => {
    assert.strictEqual(calculateXpForKunlikDay({ phrases_correct: -5 }), 0);
  });

  it('farming chegarasi: bir kunda 30 tadan ortig‘i sanalmaydi', () => {
    assert.strictEqual(calculateXpForKunlikDay({ phrases_correct: 500 }), 30);
  });

  it('kunlar bo‘yicha yig‘iladi', () => {
    const total = calculateTotalXp({
      kunlikRows: [{ phrases_correct: 10 }, { phrases_correct: 3 }, { phrases_correct: 0 }],
    });
    assert.strictEqual(total, 13);
  });

  it('BOSHQA hech narsa XP bermaydi', () => {
    // Grammatika, so'zlar, juftlik, o'qish, gapirish — hammasi bajarilgan,
    // lekin iboralar yo'q: ball 0 bo'lishi kerak.
    const row = {
      grammar_1: true,
      grammar_2: true,
      grammar_3: true,
      words_learned: 30,
      words_correct: 30,
      words_match: true,
      oqish_done: true,
      speaking_level: 5,
    } as Record<string, unknown>;
    assert.strictEqual(calculateXpForKunlikDay(row), 0);
    assert.strictEqual(calculateTotalXp({ kunlikRows: [row] }), 0);
  });

  it('qayta ishlaganda natija PASAYMAYDI', () => {
    const prev = {
      grammar_1: false,
      grammar_2: false,
      grammar_3: false,
      words_learned: 0,
      words_correct: 0,
      words_match: false,
      phrases_done: true,
      phrases_correct: 8,
      text_questions_correct: 0,
      speaking_tasks_done: 0,
      oqish_done: false,
      speaking_level: 0,
    };
    // 8 to'g'ri javobdan keyin 3 ta bilan qayta ishlansa — 8 saqlanadi.
    assert.deepStrictEqual(mergeKunlikDayPatch(prev, { phrases_correct: 3 }), {});
    assert.deepStrictEqual(mergeKunlikDayPatch({ ...prev, phrases_correct: 3 }, { phrases_correct: 8 }), {
      phrases_correct: 8,
    });
  });

  it('daraja XP dan hisoblanadi', () => {
    assert.strictEqual(levelFromXp(0).level, 1);
    assert.strictEqual(levelFromXp(499).level, 1);
    assert.strictEqual(levelFromXp(500).level, 2);
  });
});
