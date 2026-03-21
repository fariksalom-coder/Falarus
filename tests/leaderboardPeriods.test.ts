import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPeriodicPointsUpdate,
  getDailyPoints,
  getWeekStartDateString,
  getWeeklyPoints,
} from '../shared/leaderboardPeriods.ts';

test('daily leaderboard points roll over to current day', () => {
  const update = buildPeriodicPointsUpdate(
    {
      points: 7,
      points_date: '2026-03-21',
      weekly_points: 11,
      weekly_points_week_start: '2026-03-16',
      monthly_points: 30,
      total_points: 45,
    },
    3,
    '2026-03-22'
  );

  assert.equal(update.points, 3);
  assert.equal(update.points_date, '2026-03-22');
  assert.equal(update.weekly_points, 14);
  assert.equal(update.weekly_points_week_start, '2026-03-16');
  assert.equal(update.total_points, 48);
});

test('weekly leaderboard points reset on new week start', () => {
  const update = buildPeriodicPointsUpdate(
    {
      points: 2,
      points_date: '2026-03-23',
      weekly_points: 19,
      weekly_points_week_start: '2026-03-16',
      monthly_points: 40,
      total_points: 60,
    },
    4,
    '2026-03-23'
  );

  assert.equal(getWeekStartDateString('2026-03-23'), '2026-03-23');
  assert.equal(update.weekly_points, 4);
  assert.equal(update.weekly_points_week_start, '2026-03-23');
  assert.equal(getDailyPoints(update, '2026-03-23'), 6);
  assert.equal(getWeeklyPoints(update, '2026-03-23'), 4);
});
