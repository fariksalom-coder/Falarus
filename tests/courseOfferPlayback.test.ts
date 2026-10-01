import test from 'node:test';
import assert from 'node:assert/strict';
import { secondsUntilCourseBonus } from '../shared/courseOfferPlayback';
test('bonus timer depends on media position, not elapsed wall time',()=>{
  assert.equal(secondsUntilCourseBonus(300,0),280);
  assert.equal(secondsUntilCourseBonus(300,100),180);
  assert.equal(secondsUntilCourseBonus(300,100),180); // paused
  assert.equal(secondsUntilCourseBonus(300,102),178); // 1s playback at 2x
  assert.equal(secondsUntilCourseBonus(300,280),0);
  assert.equal(secondsUntilCourseBonus(300,300),0);
  assert.equal(secondsUntilCourseBonus(NaN,0),null);
});
