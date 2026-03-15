import type { Supabase } from '../types/referral';
import * as referralDiscount from './referralDiscount.service';
import * as referralReward from './referralReward.service';
import * as repo from '../repositories/referralRepository';

export type RecordPaymentInput = {
  userId: number;
  originalAmount: number; // price before discount
  planName?: string; // e.g. "1 OY", "3 OY", "1 YIL"
  planDurationMonths?: number; // 1, 3, or 12
};

export type RecordPaymentResult = {
  paymentId: number;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  referralDiscountApplied: boolean;
  referrerRewarded: boolean;
  rewardAmount?: number;
};

/**
 * Record a payment: apply 10% discount if eligible, then reward referrer 25% of final amount (once).
 */
export async function recordPayment(
  supabase: Supabase,
  input: RecordPaymentInput
): Promise<RecordPaymentResult> {
  const { userId, originalAmount } = input;
  const eligibility = await referralDiscount.getReferralDiscountEligibility(
    supabase,
    userId,
    originalAmount
  );
  const discountAmount = eligibility.discountAmount;
  const finalAmount = eligibility.finalAmount;
  let referralDiscountApplied = eligibility.eligible;
  let referralId: number | null = null;

  if (eligibility.eligible) {
    const ref = await repo.getReferralByReferredUser(supabase, userId);
    if (ref) referralId = ref.id;
  }

  const { data: paymentRow, error: payErr } = await supabase
    .from('payments')
    .insert({
      user_id: userId,
      amount: finalAmount,
      original_amount: originalAmount,
      discount_amount: discountAmount,
      referral_discount_used: referralDiscountApplied,
    })
    .select('id')
    .single();
  if (payErr) throw payErr;
  const paymentId = (paymentRow as any).id;

  if (referralDiscountApplied && referralId) {
    await referralDiscount.markReferralDiscountUsed(supabase, referralId);
  }

  const rewardResult = await referralReward.processReferralReward(
    supabase,
    userId,
    paymentId,
    finalAmount
  );

  if (input.planName != null && input.planDurationMonths != null && input.planDurationMonths > 0) {
    const { data: current } = await supabase
      .from('users')
      .select('plan_expires_at')
      .eq('id', userId)
      .single();
    const now = new Date();
    const currentEnd = current?.plan_expires_at ? new Date(current.plan_expires_at) : null;
    const startFrom = currentEnd && currentEnd > now ? currentEnd : now;
    const planExpiresAt = new Date(startFrom);
    planExpiresAt.setMonth(planExpiresAt.getMonth() + input.planDurationMonths);
    await supabase
      .from('users')
      .update({
        plan_name: input.planName,
        plan_expires_at: planExpiresAt.toISOString(),
      })
      .eq('id', userId);
  }

  return {
    paymentId,
    originalAmount,
    discountAmount,
    finalAmount,
    referralDiscountApplied,
    referrerRewarded: rewardResult.rewarded,
    rewardAmount: rewardResult.rewardAmount,
  };
}
