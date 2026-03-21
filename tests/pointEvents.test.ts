import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPointEventInsert,
  isMissingPointEventsError,
} from '../shared/pointEvents.ts';

test('buildPointEventInsert derives weekly start from activity date for award events', () => {
  const row = buildPointEventInsert({
    userId: 12,
    points: 5,
    source: 'lesson_task_result',
    sourceRef: 'lesson-1#1',
    eventKey: 'lesson:12:1',
    eventType: 'award',
    activityDate: '2026-03-22',
  });

  assert.equal(row.user_id, 12);
  assert.equal(row.points, 5);
  assert.equal(row.activity_date, '2026-03-22');
  assert.equal(row.activity_week_start, '2026-03-16');
  assert.equal(row.event_type, 'award');
});

test('isMissingPointEventsError detects missing table and rpc cases', () => {
  assert.equal(
    isMissingPointEventsError({ message: 'Could not find the table public.point_events in the schema cache' }),
    true
  );
  assert.equal(
    isMissingPointEventsError({ message: 'Could not find the function public.get_period_leaderboard(period_kind, period_value, lim)' }),
    true
  );
  assert.equal(isMissingPointEventsError({ message: 'random error' }), false);
});
