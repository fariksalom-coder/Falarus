import type { Supabase } from '../types/referral';
import { REFERRAL_DISCOUNT_PERCENT } from '../types/referral';
import * as repo from '../repositories/referralRepository';

export type DiscountEligibility = {
  eligible: boolean;
  discountPercent: number;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
};

/**
 * Check if user is eligible for 10% referral discount (first payment only).
 */
export async function getReferralDiscountEligibility(
  supabase: Supabase,
  userId: number,
  originalAmount: number
): Promise<DiscountEligibility> {
  const referral = await repo.getReferralByReferredUser(supabase, userId);
  const eligible =
    !!referral &&
    !referral.discount_used &&
    referral.status !== 'rewarded' &&
    originalAmount > 0;
  const discountPercent = eligible ? REFERRAL_DISCOUNT_PERCENT * 100 : 0;
  const discountAmount = eligible
    ? Math.round(originalAmount * REFERRAL_DISCOUNT_PERCENT)
    : 0;
  const finalAmount = Math.max(0, originalAmount - discountAmount);
  return {
    eligible,
    discountPercent,
    originalAmount,
    discountAmount,
    finalAmount,
  };
}

/**
 * Mark referral discount as used (call after payment is completed).
 */
export async function markReferralDiscountUsed(
  supabase: Supabase,
  referralId: number
): Promise<void> {
  await repo.updateReferralDiscountUsed(supabase, referralId);
}
