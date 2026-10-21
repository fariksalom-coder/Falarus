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
