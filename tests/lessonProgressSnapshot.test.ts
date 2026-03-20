import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCompletedLessonPathsFromTaskRows,
  getCompletedLessonPathsFromLegacyRows,
  mergeCompletedLessonPathSets,
} from '../server/services/lessonProgressSnapshot.service.ts';

test('completed lessons are derived from fully passed lesson_task_results', () => {
  const completed = getCompletedLessonPathsFromTaskRows([
    { lesson_path: '/lesson-11', task_number: 1, correct: 7, total: 10 },
    { lesson_path: '/lesson-11', task_number: 2, correct: 8, total: 10 },
    { lesson_path: '/lesson-11', task_number: 3, correct: 9, total: 10 },
    { lesson_path: '/lesson-11', task_number: 4, correct: 7, total: 10 },
    { lesson_path: '/lesson-11', task_number: 5, correct: 7, total: 10 },
    { lesson_path: '/lesson-11', task_number: 6, correct: 7, total: 10 },
    { lesson_path: '/lesson-11', task_number: 7, correct: 7, total: 10 },
    { lesson_path: '/lesson-11', task_number: 8, correct: 7, total: 10 },
    { lesson_path: '/lesson-11', task_number: 9, correct: 7, total: 10 },
    { lesson_path: '/lesson-11', task_number: 10, correct: 7, total: 10 },
    { lesson_path: '/lesson-11', task_number: 11, correct: 7, total: 10 },
    { lesson_path: '/lesson-11', task_number: 12, correct: 7, total: 10 },
    { lesson_path: '/lesson-11', task_number: 13, correct: 7, total: 10 },
    { lesson_path: '/lesson-11', task_number: 14, correct: 7, total: 10 },
    { lesson_path: '/lesson-11', task_number: 15, correct: 7, total: 10 },
    { lesson_path: '/lesson-11', task_number: 16, correct: 7, total: 10 },
  ]);

  assert.equal(completed.has('/lesson-11'), true);
});

test('legacy and task-based progress merge into one completed lesson set', () => {
  const merged = mergeCompletedLessonPathSets(
    getCompletedLessonPathsFromTaskRows([
      { lesson_path: '/lesson-1', task_number: 1, correct: 7, total: 10 },
    ]),
    getCompletedLessonPathsFromLegacyRows([
      { lesson_id: 2, completed: 1 },
    ])
  );

  assert.deepEqual([...merged].sort(), ['/lesson-1', '/lesson-2']);
});
