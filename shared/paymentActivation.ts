import type { DbClient } from '../server/types/dbClient';
import {
  isSubscriptionTariffType,
  type PaymentProductCode,
  type SubscriptionTariffType,
} from './paymentProducts.js';

export type RussianSubscriptionExtras = {
  auto_payment_enabled?: boolean;
  next_payment_date?: string | null;
  card_token_id?: number | null;
  exact_expires_at?: string | null;
};

export async function activateRussianSubscription(
  supabase: DbClient,
  params: {
    userId: number;
    tariffType: SubscriptionTariffType;
    extras?: RussianSubscriptionExtras;
  }
): Promise<{ expires_at: string }> {
  const tariffType = params.tariffType;
  const now = new Date();
  const daysToAdd = tariffType === 'year' ? 365 : 30;
  const planType = tariffType === 'year' ? 'yearly' : 'monthly';
  const planName = tariffType === 'year' ? '1 YIL' : '1 OY';
  const exactExpiresAt = params.extras?.exact_expires_at
    ? new Date(params.extras.exact_expires_at)
    : null;

  const { data: current, error: currentErr } = await supabase
    .from('users')
    .select('plan_expires_at')
    .eq('id', params.userId)
    .single();
  if (currentErr) throw currentErr;

  const currentEnd = current?.plan_expires_at ? new Date(current.plan_expires_at) : null;
  const startFrom = currentEnd && currentEnd > now ? currentEnd : now;
  const expiresAt =
    exactExpiresAt && Number.isFinite(exactExpiresAt.getTime()) && exactExpiresAt > now
      ? exactExpiresAt
      : new Date(startFrom);
  if (!(exactExpiresAt && Number.isFinite(exactExpiresAt.getTime()) && exactExpiresAt > now)) {
    expiresAt.setDate(expiresAt.getDate() + daysToAdd);
  }

  const { error: updateUserErr } = await supabase
    .from('users')
    .update({ plan_name: planName, plan_expires_at: expiresAt.toISOString() })
    .eq('id', params.userId);
  if (updateUserErr) throw updateUserErr;

  const extras = params.extras;
  if (extras?.auto_payment_enabled) {
    await supabase
      .from('subscriptions')
      .update({ status: 'expired', auto_payment_enabled: false })
      .eq('user_id', params.userId)
      .eq('auto_payment_enabled', true);
  }

  const nextPayment =
    extras?.next_payment_date ??
    (extras?.auto_payment_enabled ? expiresAt.toISOString() : null);

  const insertRow: Record<string, unknown> = {
    user_id: params.userId,
    plan_type: planType,
    started_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    status: 'active',
    auto_payment_enabled: extras?.auto_payment_enabled ?? false,
    next_payment_date: nextPayment,
    card_token_id: extras?.card_token_id ?? null,
    auto_payment_retry_count: 0,
    auto_payment_last_error: null,
  };

  const { error: subscriptionErr } = await supabase.from('subscriptions').insert(insertRow);
  if (subscriptionErr) throw subscriptionErr;

  return { expires_at: expiresAt.toISOString() };
}

export async function activateApprovedPayment(
  supabase: DbClient,
  params: {
    userId: number;
    productCode: PaymentProductCode;
    tariffType?: string | null;
    exactExpiresAt?: string | null;
  }
): Promise<void> {
  if (params.productCode !== 'russian') return;
  if (!isSubscriptionTariffType(params.tariffType)) return;

  await activateRussianSubscription(supabase, {
    userId: params.userId,
    tariffType: params.tariffType as SubscriptionTariffType,
    extras: { exact_expires_at: params.exactExpiresAt ?? null },
  });
}
