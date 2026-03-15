import type { Supabase } from '../types/referral';
import * as repo from '../repositories/referralRepository';

export type ReferralStats = {
  invited_users: number;
  registered_users: number;
  paid_users: number;
  total_earned: number;
  balance: number;
};

export async function getReferralStats(
  supabase: Supabase,
  userId: number
): Promise<ReferralStats> {
  const [list, balanceRow] = await Promise.all([
    repo.getReferralsByReferrer(supabase, userId),
    repo.getUserReferralBalance(supabase, userId),
  ]);
  const registered_users = list.length;
  const paid_users = list.filter((r) => r.status === 'paid' || r.status === 'rewarded').length;
  const invited_users = registered_users;
  const total_earned = balanceRow?.total_referral_earned ?? 0;
  const balance = balanceRow?.referral_balance ?? 0;
  return {
    invited_users,
    registered_users,
    paid_users,
    total_earned,
    balance,
  };
}
