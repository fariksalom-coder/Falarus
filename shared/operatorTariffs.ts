import { RUSSIAN_TARIFF_PLANS_RUB, formatRubAmount } from './russianTariffs.js';

export const OPERATOR_CURRENCIES = ['UZS', 'RUB'] as const;

export function operatorTariffCatalog() {
  return RUSSIAN_TARIFF_PLANS_RUB.map((plan) => ({
    code: plan.code,
    label: `${plan.months} oy`,
    prices: [
      { currency: 'UZS', amount: plan.priceUzs, display: `${formatRubAmount(plan.priceUzs)} so‘m` },
      { currency: 'RUB', amount: plan.priceRub, display: `${formatRubAmount(plan.priceRub)} ₽` },
    ],
  }));
}
