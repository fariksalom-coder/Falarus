import type { DbClient } from './dbClient';

export type DatabaseClient = DbClient;

export type ReferralStatus = 'registered' | 'paid' | 'rewarded';
export type WithdrawalStatus = 'pending' | 'approved' | 'rejected';

export type ReferralRow = {
  id: number;
  referrer_id: number;
  referred_user_id: number;
  status: ReferralStatus;
  payment_id: number | null;
  reward_amount: number | null;
  discount_used: boolean;
  created_at: string;
  rewarded_at: string | null;
};

export type ReferralWithdrawalRow = {
  id: number;
  user_id: number;
  amount: number;
  status: WithdrawalStatus;
  created_at: string;
  processed_at: string | null;
};

export const MIN_WITHDRAWAL_AMOUNT = 50000;
