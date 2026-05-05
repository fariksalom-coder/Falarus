import { apiUrl } from '../api';
import { cachedRequest } from '../utils/requestCache';

export type Currency = 'UZS' | 'RUB' | 'USD';

export type TariffPricesByCurrency = {
  month: number;
  year: number;
};

export type PromoQuote = {
  base_amount: number;
  final_amount: number;
  discount_amount: number;
};

export type UserTariffPricesPayload = TariffPricesByCurrency & {
  currency: Currency;
  quotes?: {
    month: PromoQuote;
    year: PromoQuote;
  };
  promo?: {
    started_at: string | null;
    expires_at: string | null;
    is_active: boolean;
    remaining_sec: number;
  };
};

const PRICING_TTL_MS = 60_000;
const PAYMENT_METHOD_TTL_MS = 60_000;

export async function getTariffPricesByCurrency(
  currency: Currency
): Promise<TariffPricesByCurrency> {
  return cachedRequest(`tariff-prices:${currency}`, PRICING_TTL_MS, async () => {
    const res = await fetch(apiUrl(`/api/tariff-prices?currency=${currency}`));
    if (!res.ok) throw new Error('Narxlar yuklanmadi');
    const data = (await res.json()) as Record<string, unknown>;
    return {
      month: Number(data.month) || 0,
      year: Number(data.year) || 0,
    };
  });
}

export async function getUserTariffPricesByCurrency(
  token: string,
  currency: Currency,
  opts?: { startPromo?: boolean }
): Promise<UserTariffPricesPayload> {
  const sp = opts?.startPromo ? '&start_promo=1' : '';
  const res = await fetch(apiUrl(`/api/user/tariff-prices?currency=${currency}${sp}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Narxlar yuklanmadi');
  const data = (await res.json()) as UserTariffPricesPayload;
  return {
    currency,
    month: Number(data.month) || 0,
    year: Number(data.year) || 0,
    quotes: data.quotes,
    promo: data.promo,
  };
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
