import { apiUrl } from '../api';

function authHeaders(token: string | null): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

export type ReferralStats = {
  invited_users: number;
  registered_users: number;
  paid_users: number;
  total_earned: number;
  balance: number;
};

export type ReferralListItem = { name: string; status: string };

export async function getReferralLink(token: string | null): Promise<{ referral_link: string }> {
  const res = await fetch(apiUrl('/api/referral/link'), { headers: authHeaders(token) });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || 'Failed to load referral link');
  }
  return res.json();
}

export async function getReferralStats(token: string | null): Promise<ReferralStats> {
  const res = await fetch(apiUrl('/api/referral/stats'), { headers: authHeaders(token) });
  if (!res.ok) throw new Error('Failed to load referral stats');
  return res.json();
}

export async function getReferralList(token: string | null): Promise<ReferralListItem[]> {
  const res = await fetch(apiUrl('/api/referral/list'), { headers: authHeaders(token) });
  if (!res.ok) throw new Error('Failed to load referral list');
  return res.json();
}

export async function withdrawReferral(
  token: string | null,
  amount: number
): Promise<{ success: boolean; id: number; amount: number }> {
  const res = await fetch(apiUrl('/api/referral/withdraw'), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ amount }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Withdraw failed');
  return data;
}
