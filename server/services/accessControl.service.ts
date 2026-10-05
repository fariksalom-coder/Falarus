import type { AccessInfo } from './subscription.service';
import { canEnterKunlikDayContent } from '../../shared/dailyCourseDay';

/**
 * Check if user can access a kunlik reja day (grammar, vocab, reading, speaking).
 * Day zero is free; completed paid days remain available for review.
 */
export function canAccessKunlikDay(dayNumber: number, access: AccessInfo): boolean {
  return canEnterKunlikDayContent(dayNumber, access.subscription_active, access.kunlik_review_days);
}
