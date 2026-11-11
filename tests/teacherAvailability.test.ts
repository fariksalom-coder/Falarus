import test from 'node:test';
import assert from 'node:assert/strict';
import { bookableSlotStarts, upcomingSlotStarts, type ScheduleData } from '../shared/teacherOnboarding.ts';

// Monday 2026-11-09 06:00 Tashkent (01:00 UTC); the week runs Mon..Sun.
const NOW = Date.UTC(2026, 10, 9, 1, 0);
const schedule: ScheduleData = { timezone: 'Asia/Tashkent', slots: [
  { weekday: 1, start: '09:00', end: '12:00' },
  { weekday: 5, start: '14:00', end: '16:00' },
] };
const iso = (t: number) => new Date(t).toISOString();
const at = (day: number, hourTashkent: number) => Date.UTC(2026, 10, day, hourTashkent - 5, 0);

test('no calendar changes = weekly schedule', () => {
  assert.deepEqual(bookableSlotStarts(schedule, [], NOW, 7), upcomingSlotStarts(schedule, NOW, 7));
});

test('a blocked whole day removes every hour of that day', () => {
  const slots = bookableSlotStarts(schedule, [{ date: '2026-11-13', start: null, end: null, available: false }], NOW, 7).map(iso);
  assert.ok(!slots.includes(iso(at(13, 14))) && !slots.includes(iso(at(13, 15))), 'Friday blocked');
  assert.ok(slots.includes(iso(at(9, 9))), 'Monday untouched');
});

test('a blocked range removes only overlapping hours', () => {
  const slots = bookableSlotStarts(schedule, [{ date: '2026-11-09', start: '10:30', end: '11:00', available: false }], NOW, 7).map(iso);
  assert.ok(slots.includes(iso(at(9, 9))));
  assert.ok(!slots.includes(iso(at(9, 10))), '10:00-11:00 overlaps 10:30-11:00');
  assert.ok(slots.includes(iso(at(9, 11))));
});

test('an extra open range adds bookable hours on that date only', () => {
  const slots = bookableSlotStarts(schedule, [{ date: '2026-11-11', start: '18:00', end: '20:00', available: true }], NOW, 7).map(iso);
  assert.ok(slots.includes(iso(at(11, 18))) && slots.includes(iso(at(11, 19))));
  assert.ok(!slots.includes(iso(at(11, 20))), 'a lesson must fit before 20:00');
  assert.ok(!slots.includes(iso(at(18, 18))), 'next Wednesday not opened');
});

test('a block beats an extra open range on the same hours', () => {
  const slots = bookableSlotStarts(schedule, [
    { date: '2026-11-11', start: '18:00', end: '20:00', available: true },
    { date: '2026-11-11', start: null, end: null, available: false },
  ], NOW, 7).map(iso);
  assert.ok(!slots.includes(iso(at(11, 18))));
});
