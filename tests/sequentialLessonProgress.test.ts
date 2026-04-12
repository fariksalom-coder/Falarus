import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeLessonStates,
  isTaskUnlocked,
  type TaskResultsMap,
} from '../src/lib/sequentialLessonProgress.ts';

test('first lesson is unlocked and next lesson unlocks only after passing previous one', () => {
  const empty: TaskResultsMap = {};
  const initialStates = computeLessonStates(empty);

  assert.equal(initialStates[0]?.isUnlocked, true);
  assert.equal(initialStates[1]?.isUnlocked, false);

  const passedFirstLesson: TaskResultsMap = {
    '/lesson-1': {
      1: { correct: 7, total: 10 },
      2: { correct: 7, total: 10 },
      3: { correct: 7, total: 10 },
    },
  };
  const nextStates = computeLessonStates(passedFirstLesson);
  assert.equal(nextStates[1]?.isUnlocked, true);
});

test('next task unlocks only after previous task reaches 70 percent', () => {
  const failed: TaskResultsMap = {
    '/lesson-11': {
      1: { correct: 6, total: 10 },
    },
  };
  assert.equal(isTaskUnlocked('/lesson-11', 2, 16, failed), false);

  const passed: TaskResultsMap = {
    '/lesson-10': {
      1: { correct: 7, total: 10 },
      2: { correct: 7, total: 10 },
      3: { correct: 7, total: 10 },
    },
    '/lesson-11': {
      1: { correct: 7, total: 10 },
    },
  };
  assert.equal(isTaskUnlocked('/lesson-11', 2, 16, passed), true);
});
