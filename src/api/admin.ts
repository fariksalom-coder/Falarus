import { adminApi } from '../lib/adminApi';

export type RevenueByCurrency = { UZS: number; USD: number; RUB: number };

export type DashboardStats = {
  users_today: number;
  users_this_week: number;
  users_this_month: number;
  active_users: number;
  payments_today: RevenueByCurrency;
  payments_this_month: RevenueByCurrency;
  total_revenue: RevenueByCurrency;
  active_subscriptions: number;
  referral_payouts_pending: number;
};

export type AdminUserRow = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  registration_date: string;
  subscription_type: string;
  subscription_status: string;
  total_points: number;
  referral_earnings: number;
};

export type AdminUserProfile = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
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
  user_phone: string | null;
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
  return adminApi<{ token: string }>('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    // при логине редирект не нужен
    skipAuthRedirect: true,
  });
}

export async function getDashboard(): Promise<DashboardStats> {
  return adminApi<DashboardStats>('/dashboard');
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
  return adminApi<AdminUserRow[]>(`/users${q ? `?${q}` : ''}`);
}

export async function getUserProfile(id: number): Promise<AdminUserProfile> {
  return adminApi<AdminUserProfile>(`/users/${id}`);
}

export async function getPayments(): Promise<AdminPaymentRow[]> {
  return adminApi<AdminPaymentRow[]>('/payments');
}

export async function confirmPayment(id: number): Promise<void> {
  await adminApi(`/payments/${id}/confirm`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function rejectPayment(id: number): Promise<void> {
  await adminApi(`/payments/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function getSubscriptions(): Promise<AdminSubscriptionRow[]> {
  return adminApi<AdminSubscriptionRow[]>('/subscriptions');
}

export async function getWithdrawals(): Promise<AdminWithdrawalRow[]> {
  return adminApi<AdminWithdrawalRow[]>('/referrals/withdrawals');
}

export async function approveWithdrawal(id: number, adminReceipt?: string): Promise<void> {
  await adminApi(`/referrals/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ admin_receipt: adminReceipt ?? null }),
  });
}

export async function rejectWithdrawal(id: number): Promise<void> {
  await adminApi(`/referrals/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function getSupportMessages(): Promise<AdminSupportRow[]> {
  return adminApi<AdminSupportRow[]>('/support');
}

export async function replySupport(id: number, reply: string): Promise<void> {
  await adminApi(`/support/${id}/reply`, {
    method: 'POST',
    body: JSON.stringify({ reply }),
  });
}

export async function getPricing(): Promise<PricingPlan[]> {
  return adminApi<PricingPlan[]>('/pricing');
}

export async function updatePricing(plans: Partial<PricingPlan>[]): Promise<void> {
  await adminApi('/pricing/update', {
    method: 'PUT',
    body: JSON.stringify(plans),
  });
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
  return adminApi<PaymentMethodRow[]>('/payment-methods');
}

export async function createPaymentMethod(data: {
  currency: string;
  bank_name: string;
  card_number: string;
  phone_number?: string;
  card_holder_name: string;
}): Promise<{ id: number }> {
  return adminApi<{ id: number }>('/payment-methods', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePaymentMethod(id: number, data: Partial<PaymentMethodRow>): Promise<void> {
  await adminApi(`/payment-methods/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function togglePaymentMethod(id: number): Promise<{ status: string }> {
  return adminApi<{ status: string }>(`/payment-methods/${id}/toggle`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function deletePaymentMethod(id: number): Promise<void> {
  await adminApi(`/payment-methods/${id}`, {
    method: 'DELETE',
  });
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
  return adminApi<TariffPriceRow[]>('/tariff-prices');
}

export async function updateTariffPrice(data: {
  tariff_type: string;
  currency: string;
  price: number;
}): Promise<void> {
  await adminApi('/tariff-prices', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

