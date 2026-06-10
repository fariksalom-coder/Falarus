import type { DatabaseClient } from '../types/referral';
import { REFERRAL_REWARD_PERCENT } from '../types/referral';
import { logError } from '../lib/logger.js';

/**
 * After a referred user pays: give 25% of paid amount to referrer, only once per referral.
 * Idempotency, balance arithmetic, and the multi-row update are all done atomically
 * inside the Postgres function `process_referral_reward` (migration 117).
 *
 * Call after the payment row is recorded; paymentAmount = actual amount paid (after discount).
 */
export async function processReferralReward(
  supabase: DatabaseClient,
  referredUserId: number,
  paymentId: number,
  paymentAmount: number
): Promise<{ rewarded: boolean; rewardAmount?: number }> {
  const rewardAmount = Math.round(paymentAmount * REFERRAL_REWARD_PERCENT);
  if (rewardAmount <= 0) return { rewarded: false };

  const { data, error } = await supabase.rpc('process_referral_reward', {
    p_referred_user_id: referredUserId,
    p_payment_id: paymentId,
    p_reward_amount: rewardAmount,
  });

  if (error) {
    logError('referral.process_reward.rpc_failed', error, {
      referredUserId,
      paymentId,
      rewardAmount,
    });
    throw error;
  }

  // TABLE-returning function comes back as an array of one row.
  const row = Array.isArray(data) ? data[0] : data;
  const rewarded = Boolean(row?.rewarded);
  return rewarded
    ? { rewarded: true, rewardAmount: Number(row?.reward_amount ?? rewardAmount) }
    : { rewarded: false };
}
