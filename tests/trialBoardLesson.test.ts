import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLesson } from '../server/services/ustozDoska.service';
import { TRIAL_BOARD_LESSON } from '../server/data/doskaDarslari';
import { darsKeshKaliti } from '../server/services/ustozKesh.service';

test('trial day uses the short board lesson without an AI request', async () => {
  const lesson = await buildLesson({ kun: 0, mavzu: 'Birinchi suhbat', nazariya: 'Trial material' });
  assert.deepEqual(lesson, TRIAL_BOARD_LESSON);
  assert.equal(lesson.bosqichlar.length, 4);
  assert.ok(lesson.bosqichlar.every((stage) => stage.tushuntirish && stage.misollar.length));
});

test('trial lesson cache is versioned separately from paid lessons', () => {
  assert.match(darsKeshKaliti({ kun: 0 }), /trial-board-v1/);
  assert.match(darsKeshKaliti({ kun: '0' }), /trial-board-v1/);
  assert.doesNotMatch(darsKeshKaliti({ kun: 1 }), /trial-board-v1/);
});
