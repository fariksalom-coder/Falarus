import type { SupabaseClient } from '@supabase/supabase-js';

const BASE_URL = process.env.REFERRAL_BASE_URL || 'https://www.falarus.uz';
const MIN_WITHDRAWAL = 50000;

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

export async function getOrCreateReferralCode(sb: SupabaseClient, userId: number): Promise<string> {
  const { data: user, error: fetchErr } = await sb
    .from('users')
    .select('referral_code')
    .eq('id', userId)
    .single();
  if (fetchErr) throw fetchErr;
  if (user?.referral_code) return user.referral_code;
  const code = generateReferralCode();
  const { error: updateErr } = await sb.from('users').update({ referral_code: code }).eq('id', userId);
  if (updateErr) throw updateErr;
  return code;
}

export async function getReferralLink(sb: SupabaseClient, userId: number): Promise<{ referral_link: string }> {
  const code = await getOrCreateReferralCode(sb, userId);
  return { referral_link: `${BASE_URL}/register?ref=${code}` };
}

export async function getReferralStats(sb: SupabaseClient, userId: number) {
  const [listRes, balanceRes] = await Promise.all([
    sb.from('referrals').select('status').eq('referrer_id', userId),
    sb.from('users').select('referral_balance, total_referral_earned').eq('id', userId).single(),
  ]);
  const list = (listRes.data ?? []) as { status: string }[];
  const paid = list.filter((r) => r.status === 'paid' || r.status === 'rewarded').length;
  const balance = balanceRes.data
    ? {
        referral_balance: Number(balanceRes.data.referral_balance ?? 0),
        total_referral_earned: Number(balanceRes.data.total_referral_earned ?? 0),
      }
    : { referral_balance: 0, total_referral_earned: 0 };
  return {
    invited_users: list.length,
    registered_users: list.length,
    paid_users: paid,
    total_earned: balance.total_referral_earned,
    balance: balance.referral_balance,
  };
}

export async function getReferralList(sb: SupabaseClient, userId: number): Promise<{ name: string; status: string }[]> {
  const { data: refs, error } = await sb
    .from('referrals')
    .select('referred_user_id, status')
    .eq('referrer_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (refs ?? []) as { referred_user_id: number; status: string }[];
  if (rows.length === 0) return [];
  const ids = [...new Set(rows.map((r) => r.referred_user_id))];
  const { data: users } = await sb.from('users').select('id, first_name, last_name').in('id', ids);
  const nameMap = new Map<number, string>();
  (users ?? []).forEach((u: { id: number; first_name: string; last_name: string }) => {
    nameMap.set(u.id, [u.first_name, u.last_name].filter(Boolean).join(' ') || 'User');
  });
  return rows.map((r) => ({ name: nameMap.get(r.referred_user_id) ?? 'User', status: r.status }));
}

/** All data for invite page in one round-trip (link + stats + list). */
export async function getReferralPageData(sb: SupabaseClient, userId: number) {
  const [linkRes, stats, list] = await Promise.all([
    getReferralLink(sb, userId),
    getReferralStats(sb, userId),
    getReferralList(sb, userId),
  ]);
  return { referral_link: linkRes.referral_link, ...stats, list };
}

export async function createWithdrawal(sb: SupabaseClient, userId: number, amount: number) {
  const balanceRow = await sb.from('users').select('referral_balance').eq('id', userId).single();
  const balance = balanceRow.data ? Number(balanceRow.data.referral_balance ?? 0) : 0;
  if (amount < MIN_WITHDRAWAL) throw new Error(`Minimal summa ${MIN_WITHDRAWAL.toLocaleString()} so'm`);
  if (amount > balance) throw new Error('Balans yetarli emas');
  const { data, error } = await sb
    .from('referral_withdrawals')
    .insert({ user_id: userId, amount, status: 'pending' })
    .select('id')
    .single();
  if (error) throw error;
  await sb.from('users').update({ referral_balance: balance - amount }).eq('id', userId);
  return { id: data.id, amount };
}
