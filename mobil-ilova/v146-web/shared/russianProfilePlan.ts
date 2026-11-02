/**
 * Profile + /me show `users.plan_name` / `users.plan_expires_at`, but Russian
 * access can also come from `subscriptions` alone. Merge subscription into the
 * payload when the users row is missing or expired.
 */

export function planLabelFromSubscriptionPlanType(planType: string | null | undefined): string | null {
  const t = String(planType ?? '').trim().toLowerCase();
  if (t === 'yearly' || t === 'year') return '1 YIL';
  if (t === 'three_month' || t === 'three_monthly' || t === 'quarterly') return '3 OY';
  // Legacy 30-day plans (deprecated 2026-07) still get labelled for historic display.
  if (t === 'monthly' || t === 'month') return '1 OY';
  return null;
}

export function mergeRussianPlanForMeResponse(input: {
  planName: string | null;
  planExpiresAt: string | null;
  subscription: { plan_type: string; expires_at: string } | null;
}): { planName: string | null; planExpiresAt: string | null } {
  const { planName, planExpiresAt, subscription } = input;
  const now = Date.now();

  const userExpMs = planExpiresAt ? Date.parse(planExpiresAt) : NaN;
  const userHasFuturePlan = Number.isFinite(userExpMs) && userExpMs > now;

  if (!subscription) {
    return { planName, planExpiresAt };
  }

  const subExpMs = Date.parse(subscription.expires_at);
  const subActive = Number.isFinite(subExpMs) && subExpMs > now;
  if (!subActive) {
    return { planName, planExpiresAt };
  }

  const subLabel = planLabelFromSubscriptionPlanType(subscription.plan_type);

  if (!userHasFuturePlan) {
    return {
      planName: planName ?? subLabel,
      planExpiresAt: subscription.expires_at,
    };
  }

  return {
    planName: planName ?? subLabel,
    planExpiresAt,
  };
}
