import test from 'node:test';
import assert from 'node:assert/strict';
import { reminderSlot } from '../server/operator/reminders.js';

test('debt reminder slots follow Tashkent day and skip missed slots', () => {
  assert.equal(reminderSlot(new Date('2026-10-05T03:59:59Z')), null);
  assert.equal(reminderSlot(new Date('2026-10-05T04:00:00Z')), '2026-10-05:9');
  assert.equal(reminderSlot(new Date('2026-10-05T08:59:59Z')), '2026-10-05:9');
  assert.equal(reminderSlot(new Date('2026-10-05T09:00:00Z')), '2026-10-05:14');
  assert.equal(reminderSlot(new Date('2026-10-05T13:00:00Z')), '2026-10-05:18');
  assert.equal(reminderSlot(new Date('2026-10-05T19:00:00Z')), null);
});
