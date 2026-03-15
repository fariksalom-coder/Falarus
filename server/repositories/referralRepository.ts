import type { Supabase } from '../types/referral';

export async function getUserByReferralCode(
  supabase: Supabase,
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
  supabase: Supabase,
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
  supabase: Supabase,
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
  supabase: Supabase,
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
  supabase: Supabase,
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

export async function updateReferralToPaid(
  supabase: Supabase,
  referralId: number,
  paymentId: number
) {
  const { error } = await supabase
    .from('referrals')
    .update({ status: 'paid', payment_id: paymentId })
    .eq('id', referralId);
  if (error) throw error;
}

export async function updateReferralToRewarded(
  supabase: Supabase,
  referralId: number,
  rewardAmount: number
) {
  const { error } = await supabase
    .from('referrals')
    .update({
      status: 'rewarded',
      reward_amount: rewardAmount,
      rewarded_at: new Date().toISOString(),
    })
    .eq('id', referralId);
  if (error) throw error;
}

export async function updateReferralDiscountUsed(
  supabase: Supabase,
  referralId: number
) {
  const { error } = await supabase
    .from('referrals')
    .update({ discount_used: true })
    .eq('id', referralId);
  if (error) throw error;
}

export async function getUserReferralBalance(
  supabase: Supabase,
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

export async function addReferralRewardToUser(
  supabase: Supabase,
  userId: number,
  rewardAmount: number
) {
  const { data: user, error: fetchErr } = await supabase
    .from('users')
    .select('referral_balance, total_referral_earned')
    .eq('id', userId)
    .single();
  if (fetchErr || !user) throw new Error('User not found');
  const newBalance = Number(user.referral_balance ?? 0) + rewardAmount;
  const newTotal = Number(user.total_referral_earned ?? 0) + rewardAmount;
  const { error: updateErr } = await supabase
    .from('users')
    .update({ referral_balance: newBalance, total_referral_earned: newTotal })
    .eq('id', userId);
  if (updateErr) throw updateErr;
}

export async function createWithdrawal(
  supabase: Supabase,
  userId: number,
  amount: number
) {
  const { data, error } = await supabase
    .from('referral_withdrawals')
    .insert({ user_id: userId, amount, status: 'pending' })
    .select('id')
    .single();
  if (error) throw error;
  return data!.id;
}

export async function deductReferralBalance(
  supabase: Supabase,
  userId: number,
  amount: number
) {
  const { data: user, error: fetchErr } = await supabase
    .from('users')
    .select('referral_balance')
    .eq('id', userId)
    .single();
  if (fetchErr || !user) throw new Error('User not found');
  const balance = Number(user.referral_balance ?? 0);
  if (balance < amount) throw new Error('Insufficient balance');
  const { error: updateErr } = await supabase
    .from('users')
    .update({ referral_balance: balance - amount })
    .eq('id', userId);
  if (updateErr) throw updateErr;
}
