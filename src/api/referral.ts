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

export type ReferralStats = {
  invited_users: number;
  registered_users: number;
  paid_users: number;
  total_earned: number;
  balance: number;
};

export type ReferralListItem = { name: string; status: string };

/** All invite page data in one request (faster load). */
export type ReferralPageData = ReferralStats & {
  referral_link: string;
  list: ReferralListItem[];
};

export async function getReferralPageData(
  token: string | null
): Promise<ReferralPageData> {
  const res = await fetch(apiUrl('/api/referral?action=page'), {
    headers: authHeaders(token),
  });
  const data = await parseJsonOrThrow<ReferralPageData & { error?: string }>(
    res,
    "Ma'lumotlar yuklanmadi"
  );
  if (!res.ok) throw new Error(data.error || "Ma'lumotlar yuklanmadi");
  if (!data.referral_link) throw new Error("Ma'lumotlar yuklanmadi");
  return data as ReferralPageData;
}

export async function getReferralLink(token: string | null): Promise<{ referral_link: string }> {
  const res = await fetch(apiUrl('/api/referral?action=link'), { headers: authHeaders(token) });
  const data = await parseJsonOrThrow<{ referral_link?: string; error?: string }>(
    res,
    'Taklif havolasi yuklanmadi'
  );
  if (!res.ok) throw new Error(data.error || 'Taklif havolasi yuklanmadi');
  if (!data.referral_link) throw new Error('Taklif havolasi yuklanmadi');
  return { referral_link: data.referral_link };
}

export async function getReferralStats(token: string | null): Promise<ReferralStats> {
  const res = await fetch(apiUrl('/api/referral?action=stats'), { headers: authHeaders(token) });
  const data = await parseJsonOrThrow<ReferralStats & { error?: string }>(
    res,
    'Statistika yuklanmadi'
  );
  if (!res.ok) throw new Error((data as { error?: string }).error || 'Statistika yuklanmadi');
  return data as ReferralStats;
}

export async function getReferralList(token: string | null): Promise<ReferralListItem[]> {
  const res = await fetch(apiUrl('/api/referral?action=list'), { headers: authHeaders(token) });
  const data = await parseJsonOrThrow<ReferralListItem[] & { error?: string }>(
    res,
    'Ro\'yxat yuklanmadi'
  );
  if (!res.ok) throw new Error((data as { error?: string }).error || "Ro'yxat yuklanmadi");
  return Array.isArray(data) ? data : [];
}

export async function withdrawReferral(
  token: string | null,
  amount: number
): Promise<{ success: boolean; id: number; amount: number }> {
  const res = await fetch(apiUrl('/api/referral'), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ amount }),
  });
  const data = await parseJsonOrThrow<{ success?: boolean; id?: number; amount?: number; error?: string }>(
    res,
    'Yechib olish amalga oshmadi'
  );
  if (!res.ok) throw new Error(data.error || 'Yechib olish amalga oshmadi');
  return data as { success: boolean; id: number; amount: number };
}
