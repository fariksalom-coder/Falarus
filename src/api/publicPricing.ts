import { apiUrl } from '../api';
import { cachedRequest } from '../utils/requestCache';

export type Currency = 'UZS' | 'RUB' | 'USD';

export type TariffPricesByCurrency = {
  month: number;
  three_months: number;
  year: number;
};

const PRICING_TTL_MS = 60_000;
const PAYMENT_METHOD_TTL_MS = 60_000;

export async function getTariffPricesByCurrency(
  currency: Currency
): Promise<TariffPricesByCurrency> {
  return cachedRequest(`tariff-prices:${currency}`, PRICING_TTL_MS, async () => {
    const res = await fetch(apiUrl(`/api/tariff-prices?currency=${currency}`));
    if (!res.ok) throw new Error('Narxlar yuklanmadi');
    return res.json();
  });
}

export type PaymentMethodPublic = {
  card_number: string;
  phone_number: string | null;
  card_holder_name: string;
} | null;

export async function getPaymentMethodByCurrency(
  currency: Currency
): Promise<PaymentMethodPublic> {
  return cachedRequest(`payment-method:${currency}`, PAYMENT_METHOD_TTL_MS, async () => {
    const res = await fetch(apiUrl(`/api/payment-methods?currency=${currency}`));
    if (!res.ok) return null;
    return res.json();
  });
}
