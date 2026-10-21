import { apiUrl } from '../api';

// Referral API: single endpoint /api/referral with ?action=link|stats|list, POST for withdraw
function authHeaders(token: string | null): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function parseJsonOrThrow<T>(res: Response, fallbackError: string): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  if (!contentType.includes('application/json') || text.trim().startsWith('<')) {
    throw new Error(
      fallbackError +
        (text.trim().startsWith('<')
          ? ' (server javob bermadi – backend ishlab turganini tekshiring)'
          : '')
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(fallbackError);
  }
}

export type Currency = 'UZS' | 'RUB' | 'USD';

export type ReferralBalance = {
  currency: Currency;
  available: number;
  /** Rewards held for a manual check. */
  pending: number;
  /** Requested for withdrawal, not paid yet. */
  reserved: number;
  debt: number;
  earned: number;
  paid_out: number;
  spent: number;
};

export type InvitedFriend = { name: string; status: 'registered' | 'purchased' | 'not_eligible' | 'review'; joined_at: string };

export type LedgerItem = {
  id: number;
  currency: Currency;
  type: 'reward' | 'hold_release' | 'hold_cancel' | 'reversal' | 'withdrawal_reserve' | 'withdrawal_release' | 'withdrawal_payout' | 'spend' | 'spend_release';
  amount: number;
  available_change: number;
  pending_change: number;
  reserved_change: number;
  debt_change: number;
  base_amount: number | null;
  rate_percent: number | null;
  created_at: string;
};

export type WithdrawalItem = {
  id: number;
  amount: number;
  currency: Currency;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  card: string;
  created_at: string;
  paid_at: string | null;
  reject_reason: string | null;
};

export type ReferralPageData = {
  referral_link: string;
  program: { enabled: boolean; reward_percent: number; min_withdrawal_rub: number; products: string[] };
  invited: InvitedFriend[];
  balances: ReferralBalance[];
  history: LedgerItem[];
  withdrawals: WithdrawalItem[];
};

async function request<T>(token: string | null, path: string, init?: RequestInit, fallbackError = "Ma'lumotlar yuklanmadi"): Promise<T> {
  const res = await fetch(apiUrl(path), { ...init, headers: authHeaders(token) });
  const data = await parseJsonOrThrow<T & { error?: string }>(res, fallbackError);
  if (!res.ok) throw new Error(data.error || fallbackError);
  return data;
}

/** All invite page data in one request (faster load). */
export async function getReferralPageData(token: string | null): Promise<ReferralPageData> {
  const data = await request<ReferralPageData>(token, '/api/referral?action=page');
  if (!data.referral_link) throw new Error("Ma'lumotlar yuklanmadi");
  return data;
}

export async function getReferralHistory(token: string | null, beforeId: number): Promise<LedgerItem[]> {
  return request<LedgerItem[]>(token, `/api/referral/history?before=${beforeId}`);
}

export type WithdrawalMinimums = { minimums: Record<Currency, number>; rate_as_of: string; rate_source: string };

/** Fails with the bank error text when the official rate is unavailable. */
export async function getWithdrawalMinimums(token: string | null): Promise<WithdrawalMinimums> {
  return request<WithdrawalMinimums>(token, '/api/referral/minimums', undefined, 'Valyuta kursi olinmadi');
}

export async function requestWithdrawal(token: string | null, body: {
  currency: Currency; amount: number; card_number: string; full_name: string; phone: string; idempotency_key: string;
}): Promise<{ id: number; status: string }> {
  return request(token, '/api/referral/withdraw', { method: 'POST', body: JSON.stringify(body) }, "So'rov yuborilmadi");
}

export type BonusPriceItem = { product: string; tariff: string | null; label: string; price: number };

export async function getBonusPrices(token: string | null, currency: Currency): Promise<BonusPriceItem[]> {
  return (await request<{ items: BonusPriceItem[] }>(token, `/api/referral/bonus-prices?currency=${currency}`)).items;
}

export async function buyWithBonus(token: string | null, body: {
  product: string; tariff: string | null; currency: Currency; idempotency_key: string;
}): Promise<{ paymentId: number }> {
  return request(token, '/api/referral/purchase', { method: 'POST', body: JSON.stringify(body) }, 'Xarid amalga oshmadi');
}
