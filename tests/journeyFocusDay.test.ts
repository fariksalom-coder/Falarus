import { test } from 'node:test';
import assert from 'node:assert/strict';
import { journeyFocusDay } from '../shared/journeyFocusDay';

test('new unpaid learner is guided to the trial', () => {
  assert.equal(journeyFocusDay(false, false, 1), 0);
});
test('completed trial points to the first day even without subscription', () => {
  assert.equal(journeyFocusDay(true, false, 1), 1);
});
test('pointer follows paid course progression', () => {
  assert.equal(journeyFocusDay(true, true, 2), 2);
  assert.equal(journeyFocusDay(false, true, 15), 15);
});
