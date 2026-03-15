import { apiUrl } from '../api';

export type Currency = 'UZS' | 'RUB' | 'USD';

export type TariffPricesByCurrency = {
  month: number;
  three_months: number;
  year: number;
};

export async function getTariffPricesByCurrency(
  currency: Currency
): Promise<TariffPricesByCurrency> {
  const res = await fetch(apiUrl(`/api/tariff-prices?currency=${currency}`));
  if (!res.ok) throw new Error('Narxlar yuklanmadi');
  return res.json();
}

export type PaymentMethodPublic = {
  card_number: string;
  phone_number: string | null;
  card_holder_name: string;
} | null;

export async function getPaymentMethodByCurrency(
  currency: Currency
): Promise<PaymentMethodPublic> {
  const res = await fetch(apiUrl(`/api/payment-methods?currency=${currency}`));
  if (!res.ok) return null;
  return res.json();
}
