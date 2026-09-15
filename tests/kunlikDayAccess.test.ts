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
  it('has no free kunlik days without subscription', () => {
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
