import type { DbClient } from '../types/dbClient';
import type { SubscriptionTariffType } from '../../shared/paymentProducts.js';
import { getAppConfig } from './appConfig.service.js';
import { getRubToUzsRate } from './rubUzsRate.service.js';
import { pool } from '../lib/db.js';
import { first1000PromoEligible } from '../operator/promo.js';
import { first1000PromoPrice, FIRST_1000_PROMO } from '../../shared/russianTariffs.js';

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
  /** Aksiya «birinchi 1000»: finalAmount chegirmali; to‘lov `discount_meta.promo` ga yoziladi. */
  promo?: typeof FIRST_1000_PROMO.code;
};

/** Yangi o‘quvchi va o‘rin bor bo‘lsa — 3/6 oylik tarif aksiya narxida (Rahmat, Click, admin). */
async function withFirst1000Promo(quote: RussianTariffQuote, userId: number): Promise<RussianTariffQuote> {
  const promoPrice = first1000PromoPrice(quote.tariffType, quote.currency);
  if (!promoPrice || !pool || promoPrice >= quote.baseAmount) return quote;
  try {
    if (!(await first1000PromoEligible(pool, userId))) return quote;
  } catch (e) {
    console.error('[first1000 promo]', e instanceof Error ? e.message : e);
    return quote;
  }
  return { ...quote, finalAmount: promoPrice, discountAmount: quote.baseAmount - promoPrice, promo: FIRST_1000_PROMO.code };
}

/** To‘lov yozuvining discount_meta siga aksiya belgisini qo‘shadi. */
export function promoMeta(quote: Pick<RussianTariffQuote, 'promo'>, meta: Record<string, unknown> | null): Record<string, unknown> | null {
  return quote.promo ? { ...(meta ?? {}), promo: quote.promo } : meta;
}

/**
 * Rus tili tarifi — narx BAZADAN (`tariff_prices`, admin panelda o'zgartiriladi):
 *  — RUB va UZS: sahifada ko'rsatilgan summa bilan bir xil (`/api/app-config`);
 *  — noma'lum tarif: DB `tariff_prices` (legacy).
 */
export async function resolveRussianTariffQuote(
  supabase: DbClient,
  params: {
    userId: number;
    currency: Currency;
    tariffType: SubscriptionTariffType;
  }
): Promise<RussianTariffQuote> {
  const plan = (await getAppConfig(supabase)).plans.find((p) => p.code === params.tariffType) ?? null;

  if (plan && params.currency === 'RUB') {
    return withFirst1000Promo({
      tariffType: params.tariffType,
      currency: 'RUB',
      baseAmount: plan.priceRub,
      finalAmount: plan.priceRub,
      discountAmount: 0,
      priceRub: plan.priceRub,
    }, params.userId);
  }

  if (plan && params.currency === 'UZS') {
    const amountUzs = plan.priceUzs;
    // Snapshot uchun kursni saqlab qo‘yamiz (hisob-kitob endi fiks).
    const fx = await getRubToUzsRate().catch(() => null);
    return withFirst1000Promo({
      tariffType: params.tariffType,
      currency: 'UZS',
      baseAmount: amountUzs,
      finalAmount: amountUzs,
      discountAmount: 0,
      priceRub: plan.priceRub,
      rubUzsRate: fx?.rate,
      rateAsOf: fx?.asOf,
    }, params.userId);
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
