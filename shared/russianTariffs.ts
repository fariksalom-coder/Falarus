/**
 * Rus tili kursi — yangi tariflar (RUB + qat’iy UZS).
 * 1 oy = baza. 3/6 oy — oylik × muddatga nisbatan tejamkorlik.
 * UZS to‘lov summalari fiks — CBU kursiga bog‘lanmaydi.
 */
export type RussianTariffCode = 'month' | 'three_month' | 'six_month';

export const RUSSIAN_MONTHLY_REFERENCE_RUB = 3_000;

export type RussianTariffRubPlan = {
  code: RussianTariffCode;
  months: number;
  /** Sotuv narxi (RUB). */
  priceRub: number;
  /** Qat’iy sotuv narxi (UZS, so‘m) — Rahmat/Click shu summani yechadi. */
  priceUzs: number;
  /** Oylik baza × oy = «to‘liq» narx. */
  wasRub: number;
  /** Tejalgan summa (RUB). */
  savingsRub: number;
  /** Chegirma foizi (0 agar yo‘q). */
  discountPercent: number;
  labelUz: string;
  labelRu: string;
};

function buildPlan(
  code: RussianTariffCode,
  months: number,
  priceRub: number,
  priceUzs: number,
  labelUz: string,
  labelRu: string,
): RussianTariffRubPlan {
  const wasRub = RUSSIAN_MONTHLY_REFERENCE_RUB * months;
  const savingsRub = Math.max(0, wasRub - priceRub);
  const discountPercent =
    wasRub > 0 && savingsRub > 0 ? Math.round((savingsRub / wasRub) * 100) : 0;
  return {
    code,
    months,
    priceRub,
    priceUzs,
    wasRub,
    savingsRub,
    discountPercent,
    labelUz,
    labelRu,
  };
}

export const RUSSIAN_TARIFF_PLANS_RUB: readonly RussianTariffRubPlan[] = [
  buildPlan('month', 1, 3_000, 400_000, '1 OY', '1 МЕС'),
  buildPlan('three_month', 3, 4_000, 530_000, '3 OY', '3 МЕС'),
  buildPlan('six_month', 6, 6_000, 790_000, '6 OY', '6 МЕС'),
] as const;

export function getRussianTariffPlanRub(code: string | null | undefined): RussianTariffRubPlan | null {
  return RUSSIAN_TARIFF_PLANS_RUB.find((p) => p.code === code) ?? null;
}

export function formatRubAmount(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Paywall/UI: «400 ming so‘m». */
export function formatRussianTariffUzsMing(priceUzs: number): string {
  const ming = Math.round(priceUzs / 1_000);
  return `${ming} ming so‘m`;
}
