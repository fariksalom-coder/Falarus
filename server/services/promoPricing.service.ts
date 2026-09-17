import type { DbClient } from '../types/dbClient';
import type { SubscriptionTariffType } from '../../shared/paymentProducts.js';
import { getRussianTariffPlanRub } from '../../shared/russianTariffs.js';
import { getRubToUzsRate } from './rubUzsRate.service.js';

type Currency = 'UZS' | 'RUB' | 'USD';

export type RussianTariffQuote = {
  tariffType: SubscriptionTariffType;
  currency: Currency;
  baseAmount: number;
  finalAmount: number;
  discountAmount: number;
  /** RUB katalog narxi (agar mavjud). */
  priceRub?: number;
  /** To‘lov yaratishda snapshot. */
  rubUzsRate?: number;
  rateAsOf?: string;
};

/**
 * Rus tili tarifi:
 *  — RUB: katalog (3000 / 4000 / 6000)
 *  — UZS: qat’iy katalog (400_000 / 530_000 / 790_000) — UI dagi summa bilan bir xil
 *  — boshqa: DB `tariff_prices` (legacy)
 */
export async function resolveRussianTariffQuote(
  supabase: DbClient,
  params: {
    userId: number;
    currency: Currency;
    tariffType: SubscriptionTariffType;
  }
): Promise<RussianTariffQuote> {
  void params.userId;
  const plan = getRussianTariffPlanRub(params.tariffType);

  if (plan && params.currency === 'RUB') {
    return {
      tariffType: params.tariffType,
      currency: 'RUB',
      baseAmount: plan.priceRub,
      finalAmount: plan.priceRub,
      discountAmount: 0,
      priceRub: plan.priceRub,
    };
  }

  if (plan && params.currency === 'UZS') {
    const amountUzs = plan.priceUzs;
    // Snapshot uchun kursni saqlab qo‘yamiz (hisob-kitob endi fiks).
    const fx = await getRubToUzsRate().catch(() => null);
    return {
      tariffType: params.tariffType,
      currency: 'UZS',
      baseAmount: amountUzs,
      finalAmount: amountUzs,
      discountAmount: 0,
      priceRub: plan.priceRub,
      rubUzsRate: fx?.rate,
      rateAsOf: fx?.asOf,
    };
  }

  // Legacy / noma'lum tarif — DB
  const { data } = await supabase
    .from('tariff_prices')
    .select('price')
    .eq('currency', params.currency)
    .eq('tariff_type', params.tariffType)
    .maybeSingle();
  const fromDb =
    data != null ? Number((data as { price: number }).price) : 0;
  const baseAmount = Number.isFinite(fromDb) && fromDb > 0 ? fromDb : 0;

  return {
    tariffType: params.tariffType,
    currency: params.currency,
    baseAmount,
    finalAmount: baseAmount,
    discountAmount: 0,
    priceRub: plan?.priceRub,
  };
}
