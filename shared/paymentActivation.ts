import type { SupabaseClient } from '@supabase/supabase-js';
import {
  isSubscriptionTariffType,
  type PaymentProductCode,
  type SubscriptionTariffType,
} from './paymentProducts.js';

export async function activateApprovedPayment(
  supabase: SupabaseClient,
  params: {
    userId: number;
    productCode: PaymentProductCode;
    tariffType?: string | null;
  }
): Promise<void> {
  if (params.productCode !== 'russian') return;
  if (!isSubscriptionTariffType(params.tariffType)) return;

  const tariffType = params.tariffType as SubscriptionTariffType;
  const now = new Date();
  const daysToAdd =
    tariffType === 'year' ? 365 : tariffType === '3months' ? 90 : 30;
  const planType =
    tariffType === 'year'
      ? 'yearly'
      : tariffType === '3months'
        ? 'three_months'
        : 'monthly';
  const planName =
    tariffType === 'year' ? '1 YIL' : tariffType === '3months' ? '3 OY' : '1 OY';

  const { data: current, error: currentErr } = await supabase
    .from('users')
    .select('plan_expires_at')
    .eq('id', params.userId)
    .single();
  if (currentErr) throw currentErr;

  const currentEnd = current?.plan_expires_at ? new Date(current.plan_expires_at) : null;
  const startFrom = currentEnd && currentEnd > now ? currentEnd : now;
  const expiresAt = new Date(startFrom);
  expiresAt.setDate(expiresAt.getDate() + daysToAdd);

  const { error: updateUserErr } = await supabase
    .from('users')
    .update({ plan_name: planName, plan_expires_at: expiresAt.toISOString() })
    .eq('id', params.userId);
  if (updateUserErr) throw updateUserErr;

  const { error: subscriptionErr } = await supabase.from('subscriptions').insert({
    user_id: params.userId,
    plan_type: planType,
    started_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    status: 'active',
  });
  if (subscriptionErr) throw subscriptionErr;
}
