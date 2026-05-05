import { isValidDailyCourseDay } from '../../shared/dailyCourseDay';

/** Kunlik rejaga qaytish: ochilgan kun raqami saqlansin (`DailyPlanPage` `kun` ni o‘qiydi). */
export function kunlikRejaPath(dayNum?: number): string {
  if (dayNum != null && isValidDailyCourseDay(dayNum)) {
    return `/kunlik-reja?kun=${dayNum}`;
  }
  return '/kunlik-reja';
}
