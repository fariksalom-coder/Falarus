/**
 * Chegirma tugash muddati — Moskva vaqti bilan 15-sentyabr 24:00
 * (ya'ni 16-sentyabr 00:00 Europe/Moscow = 15-sentyabr 21:00 UTC).
 */
export const DISCOUNT_ENDS_AT_MS = Date.parse('2026-09-15T21:00:00.000Z');

export type DiscountRemaining = {
  totalSec: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  active: boolean;
};

export function getDiscountRemaining(nowMs = Date.now()): DiscountRemaining {
  const totalSec = Math.max(0, Math.floor((DISCOUNT_ENDS_AT_MS - nowMs) / 1000));
  return {
    totalSec,
    days: Math.floor(totalSec / 86_400),
    hours: Math.floor((totalSec % 86_400) / 3_600),
    minutes: Math.floor((totalSec % 3_600) / 60),
    seconds: totalSec % 60,
    active: totalSec > 0,
  };
}
