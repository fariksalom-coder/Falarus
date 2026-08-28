import type { AccessInfo } from './subscription.service';
import { isFreeKunlikDay } from '../../shared/dailyCourseDay';

/**
 * Check if user can access a kunlik reja day (grammar, vocab, reading, speaking).
 * Free tier: days 1–FREE_KUNLIK_DAY_LIMIT only.
 */
export function canAccessKunlikDay(dayNumber: number, access: AccessInfo): boolean {
  if (access.subscription_active) return true;
  return isFreeKunlikDay(dayNumber);
}
