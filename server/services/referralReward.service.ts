import type { Supabase } from '../types/referral';
import { REFERRAL_REWARD_PERCENT } from '../types/referral';
import * as repo from '../repositories/referralRepository';

/**
 * After a referred user pays: give 25% of paid amount to referrer, only once per referral.
 * Call after payment is recorded; paymentAmount = actual amount paid (after discount).
 */
export async function processReferralReward(
  supabase: Supabase,
  referredUserId: number,
  paymentId: number,
  paymentAmount: number
): Promise<{ rewarded: boolean; rewardAmount?: number }> {
  const referral = await repo.getReferralByReferredUser(supabase, referredUserId);
  if (!referral || referral.status === 'rewarded') return { rewarded: false };
  if (referral.referrer_id === referredUserId) return { rewarded: false };

  const referrerId = referral.referrer_id;
  const rewardAmount = Math.round(paymentAmount * REFERRAL_REWARD_PERCENT);
  if (rewardAmount <= 0) return { rewarded: false };

  await repo.updateReferralToPaid(supabase, referral.id, paymentId);
  await repo.addReferralRewardToUser(supabase, referrerId, rewardAmount);
  await repo.updateReferralToRewarded(supabase, referral.id, rewardAmount);

  return { rewarded: true, rewardAmount };
}
