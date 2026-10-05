import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isFreeKunlikDay, FREE_KUNLIK_DAY_LIMIT } from '../shared/dailyCourseDay';
import { canAccessKunlikDay } from '../server/services/accessControl.service';
import type { AccessInfo } from '../server/services/subscription.service';

const freeAccess: AccessInfo = {
  lessons_free_limit: 3,
  vocabulary_free_topic: 1,
  vocabulary_free_subtopic: 1,
  subscription_active: false,
  patent_course_active: false,
  vnzh_course_active: false,
};

describe('kunlik free day access', () => {
  it('opens only the trial day without subscription', () => {
    assert.strictEqual(isFreeKunlikDay(0), true);
    assert.strictEqual(canAccessKunlikDay(0, freeAccess), true);
    assert.strictEqual(isFreeKunlikDay(-1), false);
    assert.strictEqual(isFreeKunlikDay(0.5), false);
    assert.strictEqual(FREE_KUNLIK_DAY_LIMIT, 0);
    assert.strictEqual(isFreeKunlikDay(1), false);
    assert.strictEqual(canAccessKunlikDay(1, freeAccess), false);
    assert.strictEqual(isFreeKunlikDay(2), false);
    assert.strictEqual(canAccessKunlikDay(2, freeAccess), false);
    assert.strictEqual(canAccessKunlikDay(182, freeAccess), false);
  });

  it('allows any day with active subscription', () => {
    const premium = { ...freeAccess, subscription_active: true };
    assert.strictEqual(canAccessKunlikDay(1, premium), true);
    assert.strictEqual(canAccessKunlikDay(2, premium), true);
    assert.strictEqual(canAccessKunlikDay(3, premium), true);
    assert.strictEqual(canAccessKunlikDay(182, premium), true);
  });
});

describe('expired premium review access', () => {
  const expired = { ...freeAccess, kunlik_review_days: Array.from({length:90},(_,i)=>i+1) };
  it('retains days 1–90 and blocks new day 91 and day 182', () => {
    for(let day=1;day<=90;day++) assert.equal(canAccessKunlikDay(day,expired),true);
    assert.equal(canAccessKunlikDay(91,expired),false);
    assert.equal(canAccessKunlikDay(182,expired),false);
    assert.equal(expired.subscription_active,false);
  });
  it('does not unlock gaps or invalid days even with an active subscription', () => {
    assert.equal(canAccessKunlikDay(2,{...freeAccess,kunlik_review_days:[1,3]}),false);
    for(const day of [-1,0.5,183,NaN]) assert.equal(canAccessKunlikDay(day,{...expired,subscription_active:true}),false);
  });
});
