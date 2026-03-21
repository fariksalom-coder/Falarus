import test from 'node:test';
import assert from 'node:assert/strict';
import { computeActivityStreakFromDateSet } from '../shared/activityStreakCompute.ts';

function fmtUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

test('streak uses yesterday when today has no activity (grace)', () => {
  const now = new Date(Date.UTC(2026, 2, 22, 12, 0, 0));
  const dates = new Set<string>(['2026-03-21']);
  const { streak_days } = computeActivityStreakFromDateSet(dates, fmtUtc, now);
  assert.equal(streak_days, 1);
});

test('streak counts two days when both active', () => {
  const now = new Date(Date.UTC(2026, 2, 22, 12, 0, 0));
  const dates = new Set<string>(['2026-03-21', '2026-03-22']);
  const { streak_days } = computeActivityStreakFromDateSet(dates, fmtUtc, now);
  assert.equal(streak_days, 2);
});
