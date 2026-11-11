import { useMemo } from 'react';
import { useAppConfig } from '../api/appConfig';
import { useAuth } from '../context/AuthContext';
import { useAccess } from '../context/AccessContext';
import type { First1000PromoView } from '../../shared/appConfig';
import type { RussianTariffRubPlan } from '../../shared/russianTariffs';

/**
 * Promo plans: price becomes the promo price and the regular price becomes the
 * crossed-out "was" price, so every plan card shows "4 000 ₽ → 1 990 ₽ · −50%".
 */
export function applyFirst1000Promo(plans: RussianTariffRubPlan[], promo: First1000PromoView | null): RussianTariffRubPlan[] {
  if (!promo) return plans;
  return plans.map((plan) => {
    const price = promo.prices[plan.code];
    if (!price || price.rub >= plan.priceRub) return plan;
    const savingsRub = plan.priceRub - price.rub;
    return {
      ...plan,
      priceRub: price.rub,
      priceUzs: price.uzs,
      wasRub: plan.priceRub,
      savingsRub,
      discountPercent: Math.round((savingsRub / plan.priceRub) * 100),
    };
  });
}

/**
 * Tariffs as this visitor will be charged: guests and new students see the
 * "first 1000" promo; a student who has paid before (server says
 * `promo_eligible: false`) sees regular prices, same as the checkout charges.
 */
export function usePricedPlans(): { plans: RussianTariffRubPlan[]; promo: First1000PromoView | null } {
  const { plans, promo } = useAppConfig();
  const { token } = useAuth();
  const { access } = useAccess();
  const active = promo && promo.left !== 0 && (!token || access?.promo_eligible !== false) ? promo : null;
  return useMemo(() => ({ plans: applyFirst1000Promo(plans, active), promo: active }), [plans, active]);
}
