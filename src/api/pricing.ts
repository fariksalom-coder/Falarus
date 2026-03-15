import { apiUrl } from '../api';

export type PublicPricingPlan = {
  id: number;
  plan_name: string;
  duration_days: number;
  price: number;
  discount_percent: number;
  active: boolean;
};

export async function getPublicPricing(): Promise<PublicPricingPlan[]> {
  const res = await fetch(apiUrl('/api/pricing'));
  if (!res.ok) throw new Error('Tariflar yuklanmadi');
  return res.json();
}
