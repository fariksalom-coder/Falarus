import type { DbClient } from '../types/dbClient';
import type { SubscriptionTariffType } from '../../shared/paymentProducts.js';

type Currency = 'UZS' | 'RUB' | 'USD';

export type RussianTariffQuote = {
  tariffType: SubscriptionTariffType;
  currency: Currency;
  baseAmount: number;
  finalAmount: number;
  discountAmount: number;
};

async function getTariffPrice(
  supabase: DbClient,
  currency: Currency,
  tariffType: SubscriptionTariffType
): Promise<number> {
  const { data } = await supabase
    .from('tariff_prices')
    .select('price')
    .eq('currency', currency)
    .eq('tariff_type', tariffType)
    .maybeSingle();
  return data != null ? Number((data as { price: number }).price) : 0;
}

/** Joriy `tariff_prices` bo‘yicha rus tili tarifi (vaqtinchalik chegirmasiz). */
export async function resolveRussianTariffQuote(
  supabase: DbClient,
  params: {
    userId: number;
    currency: Currency;
    tariffType: SubscriptionTariffType;
  }
): Promise<RussianTariffQuote> {
  void params.userId;
  const baseAmount = await getTariffPrice(supabase, params.currency, params.tariffType);
  return {
    tariffType: params.tariffType,
    currency: params.currency,
    baseAmount,
    finalAmount: baseAmount,
    discountAmount: 0,
  };
}
