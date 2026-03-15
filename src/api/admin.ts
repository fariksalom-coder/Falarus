import { apiUrl } from '../api';

const ADMIN_TOKEN_KEY = 'adminToken';

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

function adminHeaders(): HeadersInit {
  const token = getAdminToken();
  const h: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = JSON.parse(text);
      if (j?.error) msg = j.error;
    } catch {}
    throw new Error(msg);
  }
  if (!text.trim()) return {} as T;
  return JSON.parse(text) as T;
}

export type DashboardStats = {
  users_today: number;
  users_this_week: number;
  users_this_month: number;
  active_users: number;
  payments_today: number;
  payments_this_month: number;
  total_revenue: number;
  active_subscriptions: number;
  referral_payouts_pending: number;
};

export type AdminUserRow = {
  id: number;
  name: string;
  email: string;
  registration_date: string;
  subscription_type: string;
  subscription_status: string;
  total_points: number;
  referral_earnings: number;
};

export type AdminUserProfile = {
  id: number;
  name: string;
  email: string;
  registration_date: string;
  subscription: { plan_type: string | null; status: string; expires_at: string | null };
  statistics: { total_points: number; lessons_completed: number; words_learned: number };
  referral: { referral_balance: number; invited_users: number };
};

export type AdminPaymentRow = {
  id: number;
  user_id: number;
  user: string;
  user_email: string;
  plan: string;
  tariff_type: string;
  currency: string;
  payment_proof_url: string | null;
  payment_time: string;
  date: string;
  status: string;
  approved_at: string | null;
};

export type AdminSubscriptionRow = {
  id: number;
  user_id: number;
  user: string;
  plan_type: string;
  status: string;
  started_at: string;
  expires_at: string;
};

export type AdminWithdrawalRow = {
  id: number;
  user_id: number;
  user: string;
  amount: number;
  card_number: string;
  phone: string;
  full_name: string;
  status: string;
  created_at: string;
  processed_at: string | null;
  admin_receipt: string | null;
};

export type AdminSupportRow = {
  id: number;
  user_id: number;
  user: string;
  message: string;
  status: string;
  created_at: string;
  answered_at: string | null;
  reply: string | null;
};

export type PricingPlan = {
  id: number;
  plan_name: string;
  duration_days: number;
  price: number;
  discount_percent: number;
  active: boolean;
};

export async function adminLogin(email: string, password: string): Promise<{ token: string }> {
  const res = await fetch(apiUrl('/api/admin/login'), {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJson<{ token: string }>(res);
  return data;
}

export async function getDashboard(): Promise<DashboardStats> {
  const res = await fetch(apiUrl('/api/admin/dashboard'), { headers: adminHeaders() });
  return parseJson<DashboardStats>(res);
}

export async function getUsers(params?: {
  registered?: string;
  subscription?: string;
  referral?: boolean;
}): Promise<AdminUserRow[]> {
  const sp = new URLSearchParams();
  if (params?.registered) sp.set('registered', params.registered);
  if (params?.subscription) sp.set('subscription', params.subscription);
  if (params?.referral) sp.set('referral', 'true');
  const q = sp.toString();
  const res = await fetch(apiUrl('/api/admin/users' + (q ? '?' + q : '')), { headers: adminHeaders() });
  return parseJson<AdminUserRow[]>(res);
}

export async function getUserProfile(id: number): Promise<AdminUserProfile> {
  const res = await fetch(apiUrl(`/api/admin/users/${id}`), { headers: adminHeaders() });
  return parseJson<AdminUserProfile>(res);
}

export async function getPayments(): Promise<AdminPaymentRow[]> {
  const res = await fetch(apiUrl('/api/admin/payments'), { headers: adminHeaders() });
  return parseJson<AdminPaymentRow[]>(res);
}

export async function confirmPayment(id: number): Promise<void> {
  const res = await fetch(apiUrl(`/api/admin/payments/${id}/confirm`), {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({}),
  });
  await parseJson(res);
}

export async function rejectPayment(id: number): Promise<void> {
  const res = await fetch(apiUrl(`/api/admin/payments/${id}/reject`), {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({}),
  });
  await parseJson(res);
}

export async function getSubscriptions(): Promise<AdminSubscriptionRow[]> {
  const res = await fetch(apiUrl('/api/admin/subscriptions'), { headers: adminHeaders() });
  return parseJson<AdminSubscriptionRow[]>(res);
}

export async function getWithdrawals(): Promise<AdminWithdrawalRow[]> {
  const res = await fetch(apiUrl('/api/admin/referrals/withdrawals'), { headers: adminHeaders() });
  return parseJson<AdminWithdrawalRow[]>(res);
}

export async function approveWithdrawal(id: number, adminReceipt?: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/admin/referrals/${id}/approve`), {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({ admin_receipt: adminReceipt ?? null }),
  });
  await parseJson(res);
}

export async function rejectWithdrawal(id: number): Promise<void> {
  const res = await fetch(apiUrl(`/api/admin/referrals/${id}/reject`), {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({}),
  });
  await parseJson(res);
}

export async function getSupportMessages(): Promise<AdminSupportRow[]> {
  const res = await fetch(apiUrl('/api/admin/support'), { headers: adminHeaders() });
  return parseJson<AdminSupportRow[]>(res);
}

export async function replySupport(id: number, reply: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/admin/support/${id}/reply`), {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({ reply }),
  });
  await parseJson(res);
}

export async function getPricing(): Promise<PricingPlan[]> {
  const res = await fetch(apiUrl('/api/admin/pricing'), { headers: adminHeaders() });
  return parseJson<PricingPlan[]>(res);
}

export async function updatePricing(plans: Partial<PricingPlan>[]): Promise<void> {
  const res = await fetch(apiUrl('/api/admin/pricing/update'), {
    method: 'PUT',
    headers: adminHeaders(),
    body: JSON.stringify(plans),
  });
  await parseJson(res);
}

// Payment methods
export type PaymentMethodRow = {
  id: number;
  currency: string;
  bank_name: string;
  card_number: string;
  phone_number: string | null;
  card_holder_name: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export async function getPaymentMethods(): Promise<PaymentMethodRow[]> {
  const res = await fetch(apiUrl('/api/admin/payment-methods'), { headers: adminHeaders() });
  return parseJson<PaymentMethodRow[]>(res);
}

export async function createPaymentMethod(data: {
  currency: string;
  bank_name: string;
  card_number: string;
  phone_number?: string;
  card_holder_name: string;
}): Promise<{ id: number }> {
  const res = await fetch(apiUrl('/api/admin/payment-methods'), {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify(data),
  });
  return parseJson<{ id: number }>(res);
}

export async function updatePaymentMethod(id: number, data: Partial<PaymentMethodRow>): Promise<void> {
  const res = await fetch(apiUrl(`/api/admin/payment-methods/${id}`), {
    method: 'PUT',
    headers: adminHeaders(),
    body: JSON.stringify(data),
  });
  await parseJson(res);
}

export async function togglePaymentMethod(id: number): Promise<{ status: string }> {
  const res = await fetch(apiUrl(`/api/admin/payment-methods/${id}/toggle`), {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({}),
  });
  return parseJson<{ status: string }>(res);
}

export async function deletePaymentMethod(id: number): Promise<void> {
  const res = await fetch(apiUrl(`/api/admin/payment-methods/${id}`), {
    method: 'DELETE',
    headers: adminHeaders(),
  });
  await parseJson(res);
}

// Tariff prices (multi-currency)
export type TariffPriceRow = {
  id: number;
  tariff_type: string;
  currency: string;
  price: number;
  created_at: string;
  updated_at: string;
};

export async function getTariffPrices(): Promise<TariffPriceRow[]> {
  const res = await fetch(apiUrl('/api/admin/tariff-prices'), { headers: adminHeaders() });
  return parseJson<TariffPriceRow[]>(res);
}

export async function updateTariffPrice(data: {
  tariff_type: string;
  currency: string;
  price: number;
}): Promise<void> {
  const res = await fetch(apiUrl('/api/admin/tariff-prices'), {
    method: 'PUT',
    headers: adminHeaders(),
    body: JSON.stringify(data),
  });
  await parseJson(res);
}
