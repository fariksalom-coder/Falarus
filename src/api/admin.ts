import { adminApi } from '../lib/adminApi';
import type { PaymentProductCode, PaymentProvider } from '../../shared/paymentProducts';

export type RevenueByCurrency = { UZS: number; USD: number; RUB: number };
export type ClickTodayStats = { total: number; success: number; errors: number };

export type DashboardStats = {
  total_users: number;
  users_today: number;
  users_this_week: number;
  users_this_month: number;
  active_users: number;
  inactive_users: number;
  payments_today: RevenueByCurrency;
  payments_this_month: RevenueByCurrency;
  total_revenue: RevenueByCurrency;
  pending_payments: number;
  refunded_payments_this_month: number;
  active_subscriptions: number;
  subscriptions_expiring_soon: number;
  referral_payouts_pending: number;
  support_chats_open: number;
  click_today: ClickTodayStats;
  payment_statuses_this_month: {
    pending: number;
    approved: number;
    rejected: number;
    refunded: number;
  };
  revenue_by_product_this_month: {
    product_code: string;
    label: string;
    revenue: RevenueByCurrency;
    count: number;
  }[];
  recent_users: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    created_at: string;
    subscription_status: string;
    plan_name: string | null;
  }[];
  recent_payments: {
    id: number;
    user_id: number;
    user: string;
    amount: number;
    currency: keyof RevenueByCurrency;
    status: string;
    product_label: string;
    payment_channel: string | null;
    created_at: string;
    approved_at: string | null;
  }[];
};

export type AdminUserRow = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  registration_date: string;
  subscription_type: string;
  subscription_status: string;
  reached_day: number;
  day_progress: {
    day_number: number;
    grammar_done: number;
    grammar_total: number;
    vocabulary_done: boolean;
    reading_done: boolean;
    speaking_level: number;
  } | null;
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
  product_code: PaymentProductCode;
  product_label: string;
  payment_provider: PaymentProvider;
  currency: string;
  payment_proof_url: string | null;
  payment_time: string;
  date: string;
  status: string;
  approved_at: string | null;
  payment_channel?: string | null;
  click_merchant_payment_id?: string | null;
  /** OFD / Click fiscalization (admin only) */
  fiscal_status?: string | null;
  fiscal_receipt_id?: string | null;
};

export type AdminSubscriptionRow = {
  id: number;
  user_id: number;
  user: string;
  plan_type: string;
  status: string;
  started_at: string;
  expires_at: string;
  next_payment_date?: string | null;
  auto_payment_enabled?: boolean;
  card_token_id?: number | null;
  auto_payment_retry_count?: number;
  auto_payment_last_error?: string | null;
};

export type AdminCardTokenRow = {
  id: number;
  user_id: number;
  user: string;
  user_email: string | null;
  masked_phone: string | null;
  masked_card: string | null;
  is_active: boolean;
  created_at: string;
};

export type AdminClickPaymentLogRow = {
  id: number;
  user_id: number | null;
  subscription_id: number | null;
  user: string | null;
  operation: string;
  click_payment_id: string | null;
  merchant_trans_id: string | null;
  error_code: number | null;
  error_note: string | null;
  created_at: string;
};

export type AdminTeacherRow = {
  user_id: number;
  first_name: string;
  last_name: string;
  display_name: string;
  age: number;
  avatar_url: string | null;
  region: string;
  city: string;
  experience_years: number;
  experience_months: number;
  teaching_format: string;
  headline: string;
  about: string;
  subjects: string[];
  teaching_levels: string[];
  languages: string[];
  monthly_course_price_amount: number;
  monthly_course_price_currency: string;
  rating_avg: number;
  rating_count: number;
  listing_paid_until: string | null;
  telegram_username: string | null;
  telegram_url: string | null;
  whatsapp_phone_e164: string | null;
  max_contact: string | null;
  public_phone_e164: string | null;
  public_email: string | null;
  preferred_contact_method: string | null;
  profile_status: string;
  admin_note: string | null;
  first_listing_discount_used: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminTeacherTrialRow = {
  id: number;
  teacher_user_id: number;
  student_user_id: number;
  payment_id: number | null;
  requested_starts_at: string | null;
  scheduled_starts_at: string | null;
  status: string;
  student_phone_e164: string | null;
  student_email: string | null;
  student_message: string;
  price_rub_snapshot: number;
  price_uzs_snapshot: number;
  paid_currency: string | null;
  contact_shared_at: string | null;
  teacher_notified_at: string | null;
  completed_by_teacher_at: string | null;
  created_at: string;
  updated_at: string;
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

export type AdminHelpChatListRow = {
  id: number;
  user_id: number;
  status: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  unread_count: number;
  user: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    registration_date: string | null;
    subscription: {
      plan_type: string | null;
      status: 'active' | 'inactive';
      expires_at: string | null;
    };
    total_points: number;
    referral_balance: number;
  };
  last_message: {
    id: number;
    sender_type: 'user' | 'admin';
    content: string;
    created_at: string;
  } | null;
};

export type AdminHelpChatMessage = {
  id: number;
  chat_id: number;
  sender_type: 'user' | 'admin';
  sender_user_id: number | null;
  content: string;
  created_at: string;
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

export type AdminCreateUserResponse = {
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  };
  login_identifier: string;
  password: string;
  grants: { russian: boolean; patent: boolean; vnzh: boolean };
};

export async function createAdminUser(body: {
  firstName: string;
  lastName: string;
  identifier: string;
  password: string;
  russianTariff: 'month' | 'year' | null;
  grantPatent: boolean;
  grantVnzh: boolean;
  courseCurrency?: 'UZS' | 'USD' | 'RUB';
  amountRussian?: number | null;
  amountPatent?: number | null;
  amountVnzh?: number | null;
}): Promise<AdminCreateUserResponse> {
  return adminApi<AdminCreateUserResponse>('/users', {
    method: 'POST',
    body: JSON.stringify(body),
  });
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

export async function refundPayment(id: number): Promise<void> {
  await adminApi(`/payments/${id}/refund`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function getSubscriptions(): Promise<AdminSubscriptionRow[]> {
  return adminApi<AdminSubscriptionRow[]>('/subscriptions');
}

export async function getCardTokens(): Promise<AdminCardTokenRow[]> {
  return adminApi<AdminCardTokenRow[]>('/card-tokens');
}

export async function getClickPaymentLogs(): Promise<AdminClickPaymentLogRow[]> {
  return adminApi<AdminClickPaymentLogRow[]>('/click-payment-logs');
}

export async function getAdminTeachers(): Promise<AdminTeacherRow[]> {
  return adminApi<AdminTeacherRow[]>('/teachers');
}

export async function getAdminTeacherTrials(): Promise<AdminTeacherTrialRow[]> {
  return adminApi<AdminTeacherTrialRow[]>('/teacher-trials');
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

export async function getAdminHelpChats(): Promise<AdminHelpChatListRow[]> {
  return adminApi<AdminHelpChatListRow[]>('/help/chats');
}

export async function getAdminHelpChatMessages(chatId: number): Promise<AdminHelpChatMessage[]> {
  return adminApi<AdminHelpChatMessage[]>(`/help/chats/${chatId}/messages`);
}

export async function sendAdminHelpChatMessage(chatId: number, content: string): Promise<AdminHelpChatMessage> {
  return adminApi<AdminHelpChatMessage>(`/help/chats/${chatId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export async function sendAdminHelpChatImage(chatId: number, file: File): Promise<AdminHelpChatMessage> {
  const form = new FormData();
  form.append('image', file);
  return adminApi<AdminHelpChatMessage>(`/help/chats/${chatId}/media`, {
    method: 'POST',
    body: form as unknown as BodyInit,
  });
}

export type HelpBroadcastFilter =
  | 'subscription_active'
  | 'subscription_inactive'
  | 'kunlik_not_started'
  | 'kunlik_day1_complete'
  | 'kunlik_day1_incomplete'
  | 'kunlik_registered_week_stalled'
  | 'all_users';

export async function getHelpBroadcastPreview(filter: HelpBroadcastFilter): Promise<{
  count: number;
  filter: string;
  max: number;
}> {
  return adminApi(`/help/broadcast-preview?filter=${encodeURIComponent(filter)}`);
}

export async function postHelpBroadcast(body: {
  filter: HelpBroadcastFilter;
  content: string;
  confirm_broadcast?: boolean;
}): Promise<{ sent: number; total: number; filter: string }> {
  return adminApi('/help/broadcast', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function sendHelpDirectUserMessage(
  userId: number,
  content: string
): Promise<{ chat_id: number; message: AdminHelpChatMessage }> {
  return adminApi(`/help/users/${userId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export async function markAdminHelpChatRead(chatId: number): Promise<void> {
  await adminApi(`/help/chats/${chatId}/read`, {
    method: 'POST',
    body: JSON.stringify({}),
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
