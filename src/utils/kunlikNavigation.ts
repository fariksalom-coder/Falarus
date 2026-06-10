import { isValidDailyCourseDay } from '../../shared/dailyCourseDay';

/** Bosh sahifaga qaytish: ochilgan kun raqami saqlansin (`HomePage` `kun` ni o‘qiydi). */
export function kunlikRejaPath(dayNum?: number): string {
  if (dayNum != null && isValidDailyCourseDay(dayNum)) {
    return `/?kun=${dayNum}`;
  }
  return '/';
}
