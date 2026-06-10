import type { DatabaseClient } from '../types/referral';

export async function getUserByReferralCode(
  supabase: DatabaseClient,
  referralCode: string
): Promise<{ id: number } | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('referral_code', referralCode)
    .single();
  if (error || !data) return null;
  return { id: data.id };
}

export async function getOrCreateReferralCode(
  supabase: DatabaseClient,
  userId: number
): Promise<string> {
  const { data: user, error: fetchErr } = await supabase
    .from('users')
    .select('referral_code')
    .eq('id', userId)
    .single();
  if (fetchErr) throw fetchErr;
  if (user?.referral_code) return user.referral_code;
  const code = generateReferralCode();
  const { error: updateErr } = await supabase
    .from('users')
    .update({ referral_code: code })
    .eq('id', userId);
  if (updateErr) throw updateErr;
  return code;
}

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(8);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 8; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let s = '';
  for (let i = 0; i < 8; i++) s += chars[bytes[i] % chars.length];
  return s;
}

export async function createReferral(
  supabase: DatabaseClient,
  referrerId: number,
  referredUserId: number
) {
  const { error } = await supabase.from('referrals').insert({
    referrer_id: referrerId,
    referred_user_id: referredUserId,
    status: 'registered',
    discount_used: false,
  });
  if (error) throw error;
}

export async function getReferralByReferredUser(
  supabase: DatabaseClient,
  referredUserId: number
): Promise<{ id: number; referrer_id: number; discount_used: boolean; status: string } | null> {
  const { data, error } = await supabase
    .from('referrals')
    .select('id, referrer_id, discount_used, status')
    .eq('referred_user_id', referredUserId)
    .single();
  if (error || !data) return null;
  return data as any;
}

export async function getReferralsByReferrer(
  supabase: DatabaseClient,
  referrerId: number
): Promise<Array<{ referred_user_id: number; status: string; name?: string }>> {
  const { data, error } = await supabase
    .from('referrals')
    .select('referred_user_id, status')
    .eq('referrer_id', referrerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const list = (data ?? []) as Array<{ referred_user_id: number; status: string }>;
  if (list.length === 0) return [];
  const userIds = [...new Set(list.map((r) => r.referred_user_id))];
  const { data: users } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .in('id', userIds);
  const nameMap = new Map<number, string>();
  (users ?? []).forEach((u: any) => {
    nameMap.set(u.id, [u.first_name, u.last_name].filter(Boolean).join(' ') || 'User');
  });
  return list.map((r) => ({
    referred_user_id: r.referred_user_id,
    status: r.status,
    name: nameMap.get(r.referred_user_id) ?? 'User',
  }));
}

// NOTE: updateReferralToPaid + updateReferralToRewarded were removed as part
// of P0 #3 (migration 117). They are now done atomically inside the
// process_referral_reward() Postgres function — see referralReward.service.ts.

export async function updateReferralDiscountUsed(
  supabase: DatabaseClient,
  referralId: number
) {
  const { error } = await supabase
    .from('referrals')
    .update({ discount_used: true })
    .eq('id', referralId);
  if (error) throw error;
}

export async function getUserReferralBalance(
  supabase: DatabaseClient,
  userId: number
): Promise<{ referral_balance: number; total_referral_earned: number } | null> {
  const { data, error } = await supabase
    .from('users')
    .select('referral_balance, total_referral_earned')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return {
    referral_balance: Number(data.referral_balance ?? 0),
    total_referral_earned: Number(data.total_referral_earned ?? 0),
  };
}

// NOTE: addReferralRewardToUser was removed in P0 #3. The atomic
// referral_balance / total_referral_earned increment now lives in the
// process_referral_reward() Postgres function (migration 117).

export async function createWithdrawal(
  supabase: DatabaseClient,
  userId: number,
  amount: number,
  details?: { card_number?: string; phone?: string; full_name?: string }
) {
  const row: Record<string, unknown> = { user_id: userId, amount, status: 'pending' };
  if (details?.card_number != null) row.card_number = String(details.card_number).trim();
  if (details?.phone != null) row.phone = String(details.phone).trim();
  if (details?.full_name != null) row.full_name = String(details.full_name).trim();
  const { data, error } = await supabase
    .from('referral_withdrawals')
    .insert(row)
    .select('id')
    .single();
  if (error) throw error;
  return data!.id;
}

// NOTE: deductReferralBalance was removed in P0 #3. Withdraw now goes
// through deduct_referral_balance() Postgres function (migration 117) —
// the atomic predicate "balance >= amount" lives in the WHERE clause so
// concurrent withdrawals cannot overdraw.
