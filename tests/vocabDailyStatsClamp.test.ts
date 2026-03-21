import test from 'node:test';
import assert from 'node:assert/strict';
import { clampVocabDailyDisplayToTotals } from '../shared/vocabDailyStatsClamp.ts';

test('clamp enforces today <= week <= total', () => {
  const a = clampVocabDailyDisplayToTotals(46, 17, 51);
  assert.equal(a.todayWords, 17);
  assert.equal(a.weekWords, 46);
});

test('clamp leaves consistent triples unchanged', () => {
  const b = clampVocabDailyDisplayToTotals(100, 10, 40);
  assert.deepEqual(b, { todayWords: 10, weekWords: 40 });
});

test('clamp forces today under week when needed', () => {
  const c = clampVocabDailyDisplayToTotals(50, 30, 20);
  assert.deepEqual(c, { todayWords: 20, weekWords: 20 });
});
