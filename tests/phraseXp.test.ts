/**
 * XP qoidasi (2026-08-12 dan): ball kunning HAR BIR mashqidan yig'iladi —
 * to'g'ri javoblar bittadan, bajarilgan bloklar qat'iy 5 balldan.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateXpForKunlikDay, calculateTotalXp, levelFromXp } from '../shared/xpFormula';
import { mergeKunlikDayPatch } from '../shared/kunlikProgressMerge';

describe('kunlik XP', () => {
  it('har bir to‘g‘ri javob 1 XP beradi', () => {
    assert.strictEqual(calculateXpForKunlikDay({ phrases_correct: 7 }), 7);
    assert.strictEqual(calculateXpForKunlikDay({ grammar_correct: 12 }), 12);
    assert.strictEqual(calculateXpForKunlikDay({ words_correct: 9 }), 9);
    assert.strictEqual(calculateXpForKunlikDay({ text_questions_correct: 6 }), 6);
  });

  it('bajarilgan blok 5 XP beradi', () => {
    assert.strictEqual(calculateXpForKunlikDay({ grammar_1: true }), 5);
    assert.strictEqual(
      calculateXpForKunlikDay({
        grammar_1: true,
        grammar_2: true,
        grammar_3: true,
        words_match: true,
        oqish_done: true,
        phrases_done: true,
      }),
      30,
    );
  });

  it('ochiq gapirish topshirig‘i 2 XP, tarjima mashqi 1 XP', () => {
    assert.strictEqual(calculateXpForKunlikDay({ speaking_tasks_done: 6 }), 12);
    assert.strictEqual(calculateXpForKunlikDay({ speaking_level: 10 }), 10);
  });

  it('to‘liq bajarilgan kun — hamma manba qo‘shiladi', () => {
    const xp = calculateXpForKunlikDay({
      grammar_correct: 18,
      grammar_1: true,
      grammar_2: true,
      grammar_3: true,
      words_correct: 12,
      words_match: true,
      phrases_correct: 10,
      phrases_done: true,
      text_questions_correct: 8,
      oqish_done: true,
      speaking_level: 10,
      speaking_tasks_done: 6,
    });
    // 18 + 12 + 10 + 8 + 10 + (6*2) + (6 blok * 5)
    assert.strictEqual(xp, 100);
  });

  it('ma’lumot yo‘q bo‘lsa 0', () => {
    assert.strictEqual(calculateXpForKunlikDay({}), 0);
    assert.strictEqual(calculateXpForKunlikDay({ phrases_correct: null }), 0);
  });

  it('manfiy qiymat XP kamaytirmaydi', () => {
    assert.strictEqual(calculateXpForKunlikDay({ phrases_correct: -5, grammar_correct: -9 }), 0);
  });

  it('farming chegarasi: har manbaning o‘z shifti bor', () => {
    assert.strictEqual(calculateXpForKunlikDay({ phrases_correct: 500 }), 30);
    assert.strictEqual(calculateXpForKunlikDay({ grammar_correct: 500 }), 25);
    assert.strictEqual(calculateXpForKunlikDay({ words_correct: 500 }), 15);
    assert.strictEqual(calculateXpForKunlikDay({ text_questions_correct: 500 }), 15);
    assert.strictEqual(calculateXpForKunlikDay({ speaking_level: 500 }), 12);
    assert.strictEqual(calculateXpForKunlikDay({ speaking_tasks_done: 500 }), 24);
  });

  it('kunlar bo‘yicha yig‘iladi', () => {
    const total = calculateTotalXp({
      kunlikRows: [{ phrases_correct: 10 }, { grammar_correct: 3 }, { phrases_correct: 0 }],
    });
    assert.strictEqual(total, 13);
  });

  it('qayta ishlaganda natija PASAYMAYDI', () => {
    const prev = {
      grammar_1: false,
      grammar_2: false,
      grammar_3: false,
      grammar_correct: 0,
      words_learned: 0,
      words_correct: 0,
      words_match: false,
      phrases_done: true,
      phrases_correct: 8,
      text_questions_correct: 0,
      speaking_tasks_done: 0,
      oqish_done: false,
      suhbat_done: false,
      speaking_level: 0,
    };
    // 8 to'g'ri javobdan keyin 3 ta bilan qayta ishlansa — 8 saqlanadi.
    assert.deepStrictEqual(mergeKunlikDayPatch(prev, { phrases_correct: 3 }), {});
    assert.deepStrictEqual(mergeKunlikDayPatch({ ...prev, phrases_correct: 3 }, { phrases_correct: 8 }), {
      phrases_correct: 8,
    });
    // Grammatika ham xuddi shunday — faqat oldinga.
    assert.deepStrictEqual(mergeKunlikDayPatch({ ...prev, grammar_correct: 14 }, { grammar_correct: 9 }), {});
    assert.deepStrictEqual(mergeKunlikDayPatch(prev, { grammar_correct: 14 }), { grammar_correct: 14 });
  });

  it('daraja XP dan hisoblanadi', () => {
    assert.strictEqual(levelFromXp(0).level, 1);
    assert.strictEqual(levelFromXp(499).level, 1);
    assert.strictEqual(levelFromXp(500).level, 2);
  });
});
