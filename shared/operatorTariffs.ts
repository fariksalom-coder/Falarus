import { RUSSIAN_TARIFF_PLANS_RUB, formatRubAmount, first1000PromoPrice } from './russianTariffs.js';

export const OPERATOR_CURRENCIES = ['UZS', 'RUB'] as const;

const priceDisplay = (currency: string, amount: number) =>
  currency === 'UZS' ? `${formatRubAmount(amount)} so‘m` : `${formatRubAmount(amount)} ₽`;

export function operatorTariffCatalog() {
  return RUSSIAN_TARIFF_PLANS_RUB.map((plan) => {
    const prices = [
      { currency: 'UZS', amount: plan.priceUzs, display: priceDisplay('UZS', plan.priceUzs) },
      { currency: 'RUB', amount: plan.priceRub, display: priceDisplay('RUB', plan.priceRub) },
    ];
    const promoPrices = prices.flatMap((p) => {
      const amount = first1000PromoPrice(plan.code, p.currency);
      return amount ? [{ currency: p.currency, amount, display: priceDisplay(p.currency, amount) }] : [];
    });
    return { code: plan.code, label: `${plan.months} oy`, prices, promoPrices };
  });
}
