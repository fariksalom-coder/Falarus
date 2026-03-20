import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCappedMatchPoints,
  calculateImprovementDelta,
} from '../server/services/scoringRules.service.ts';
import { aggregateVocabularyStep2Stats } from '../server/repositories/vocabularyRepository.ts';

test('improvement delta awards only newly improved correct answers', () => {
  assert.equal(calculateImprovementDelta(5, 5), 0);
  assert.equal(calculateImprovementDelta(5, 8), 3);
  assert.equal(calculateImprovementDelta(8, 5), 0);
});

test('match points are capped and cannot be earned twice', () => {
  assert.equal(calculateCappedMatchPoints(false, 12, 8), 8);
  assert.equal(calculateCappedMatchPoints(true, 8, 8), 0);
});

test('daily stats aggregate by max correct answers per day and word group', () => {
  const stats = aggregateVocabularyStep2Stats(
    [
      { activity_date: '2026-03-18', word_group_id: 1, correct_answers: 2 },
      { activity_date: '2026-03-18', word_group_id: 1, correct_answers: 5 },
      { activity_date: '2026-03-18', word_group_id: 2, correct_answers: 3 },
      { activity_date: '2026-03-20', word_group_id: 1, correct_answers: 4 },
      { activity_date: '2026-03-20', word_group_id: 1, correct_answers: 1 },
    ],
    ['2026-03-14', '2026-03-15', '2026-03-16', '2026-03-17', '2026-03-18', '2026-03-19', '2026-03-20'],
    '2026-03-20'
  );

  assert.deepEqual(stats, { todayWords: 4, weekWords: 12 });
});
