import type { AccessInfo } from './subscription.service';
import { isFreeKunlikDay } from '../../shared/dailyCourseDay';

/**
 * Check if user can access a kunlik reja day (grammar, vocab, reading, speaking).
 * Free kunlik days: none (subscription required for all days).
 */
export function canAccessKunlikDay(dayNumber: number, access: AccessInfo): boolean {
  if (access.subscription_active) return true;
  return isFreeKunlikDay(dayNumber);
}
