import { describe, expect, it } from 'vitest';
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
  it('allows days 1 through FREE_KUNLIK_DAY_LIMIT without subscription', () => {
    for (let day = 1; day <= FREE_KUNLIK_DAY_LIMIT; day += 1) {
      expect(isFreeKunlikDay(day)).toBe(true);
      expect(canAccessKunlikDay(day, freeAccess)).toBe(true);
    }
  });

  it('blocks day 3+ without subscription', () => {
    expect(isFreeKunlikDay(3)).toBe(false);
    expect(canAccessKunlikDay(3, freeAccess)).toBe(false);
    expect(canAccessKunlikDay(182, freeAccess)).toBe(false);
  });

  it('allows any day with active subscription', () => {
    const premium = { ...freeAccess, subscription_active: true };
    expect(canAccessKunlikDay(3, premium)).toBe(true);
    expect(canAccessKunlikDay(182, premium)).toBe(true);
  });
});
