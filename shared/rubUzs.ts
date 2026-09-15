/**
 * RUB → UZS konvertatsiya (Markaziy bank kursi asosida).
 * Kurs serverdan `/api/fx/rub-uzs` orqali olinadi.
 */

/** Tarmoq ishlamasa / kurs kelmasa — ehtiyot fallback. */
export const RUB_UZS_FALLBACK_RATE = 150;

export function rubToUzs(amountRub: number, ratePerRub: number): number {
  const rub = Number(amountRub);
  const rate = Number(ratePerRub);
  if (!Number.isFinite(rub) || rub < 0 || !Number.isFinite(rate) || rate <= 0) return 0;
  return Math.round(rub * rate);
}

export function formatUzsAmount(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function formatRubUzsPair(priceRub: number, ratePerRub: number): {
  uzs: number;
  labelUzs: string;
} {
  const uzs = rubToUzs(priceRub, ratePerRub);
  return {
    uzs,
    labelUzs: `${formatUzsAmount(uzs)} so‘m`,
  };
}
