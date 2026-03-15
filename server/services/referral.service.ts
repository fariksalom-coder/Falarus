import type { Supabase } from '../types/referral';
import * as repo from '../repositories/referralRepository';

const BASE_URL = process.env.REFERRAL_BASE_URL || 'https://www.falarus.uz';

/**
 * Get or create user's referral code and return full referral link.
 */
export async function getReferralLink(
  supabase: Supabase,
  userId: number
): Promise<{ referral_link: string }> {
  const code = await repo.getOrCreateReferralCode(supabase, userId);
  const link = `${BASE_URL}/register?ref=${code}`;
  return { referral_link: link };
}

/**
 * Validate ref code and return referrer id if valid.
 * Rejects if referrer_id === referred_user_id (self-referral).
 */
export async function resolveReferrerFromCode(
  supabase: Supabase,
  referralCode: string,
  referredUserId?: number
): Promise<number | null> {
  if (!referralCode?.trim()) return null;
  const referrer = await repo.getUserByReferralCode(supabase, referralCode.trim());
  if (!referrer) return null;
  if (referredUserId != null && referrer.id === referredUserId) return null;
  return referrer.id;
}

/**
 * After registration: set referred_by and create referral record.
 * Call only when ref was valid and user was just created.
 */
export async function attachReferralOnRegister(
  supabase: Supabase,
  referrerId: number,
  referredUserId: number
): Promise<void> {
  await supabase
    .from('users')
    .update({ referred_by: referrerId })
    .eq('id', referredUserId);
  await repo.createReferral(supabase, referrerId, referredUserId);
}
