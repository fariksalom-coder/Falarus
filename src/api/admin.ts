import { adminApi } from '../lib/adminApi';
import type { PaymentProductCode, PaymentProvider } from '../../shared/paymentProducts';

export type RevenueByCurrency = { UZS: number; USD: number; RUB: number };

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
  payments_daily_last_30: {
    date: string;
    count: number;
    revenue: RevenueByCurrency;
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
  last_seen_at: string | null;
};

export type AdminUserProfile = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  registration_date: string;
  subscription: { plan_type: string | null; status: string; expires_at: string | null };
  statistics: { total_points: number };
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

export type AdminTeacherRow = {
  user_id: number;
  /*
   * HISOBNING O'ZIDAGI ma'lumot — anketa to'ldirilmagan bo'lsa ham bor.
   * Admin bog'lanish uchun aynan shu raqamdan foydalanadi.
   */
  account_first_name: string | null;
  account_last_name: string | null;
  account_phone: string | null;
  account_email: string | null;
  registered_at: string | null;
  /** `false` — anketa umuman boshlanmagan. */
  has_profile: boolean;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  age?: number;
  avatar_url: string | null;
  region?: string;
  city?: string;
  experience_years?: number;
  experience_months?: number;
  teaching_format?: string;
  headline?: string;
  about?: string;
  subjects?: string[];
  teaching_levels?: string[];
  languages?: string[];
  monthly_course_price_amount?: number;
  monthly_course_price_currency?: string;
  rating_avg?: number;
  rating_count?: number;
  lesson_price_uzs?: number | null;
  onboarding_path?: 'certified' | 'experienced' | null;
  is_recommended?: boolean;
  telegram_username: string | null;
  telegram_url: string | null;
  whatsapp_phone_e164: string | null;
  max_contact: string | null;
  public_phone_e164: string | null;
  public_email: string | null;
  preferred_contact_method: string | null;
  profile_status?: string;
  admin_note: string | null;
  first_listing_discount_used?: boolean;
  created_at: string;
  updated_at: string;
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
    payment?: {
      has_paid: boolean;
      latest_status: string | null;
      latest_product: string | null;
      latest_tariff: string | null;
      latest_at: string | null;
    };
    total_points: number;
    referral_balance: number;
    account_type: string | null;
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
  page?: number;
  q?: string;
  date?: string;
  registered?: string;
  subscription?: string;
  referral?: boolean;
  sort?: string;
  days?: string;
  active?: string;
}, signal?: AbortSignal): Promise<{ items: AdminUserRow[]; total: number; page: number; pageSize: number }> {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.q) sp.set('q', params.q);
  if (params?.date) sp.set('date', params.date);
  if (params?.registered) sp.set('registered', params.registered);
  if (params?.subscription) sp.set('subscription', params.subscription);
  if (params?.referral) sp.set('referral', 'true');
  if (params?.sort) sp.set('sort', params.sort);
  if (params?.days) sp.set('days', params.days);
  if (params?.active) sp.set('active', params.active);
  const q = sp.toString();
  return adminApi(`/users${q ? `?${q}` : ''}`, { signal });
}

export function getRegistrations(month: string, signal?: AbortSignal) {
  return adminApi<{ days: { day: string; count: number }[]; total: number; timezone: string }>(`/registrations?month=${encodeURIComponent(month)}`, { signal });
}

export function getAdminUnreadCount() { return adminApi<{ count: number }>('/help/unread-count'); }

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
  grants: { russian: boolean; patent: boolean; vnzh: boolean; week_trial: boolean };
  access_expires_at: string | null;
  updated_existing: boolean;
};

export async function createAdminUser(body: {
  firstName: string;
  lastName: string;
  identifier: string;
  password: string;
  russianTariff: 'month' | 'three_month' | 'six_month' | 'week' | null;
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

export type AdminUserManageSnapshot = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  registration_date: string | null;
  last_seen_at: string | null;
  account_type: string | null;
  is_golden: boolean;
  access_frozen: boolean;
  access_frozen_at: string | null;
  access_frozen_reason: string | null;
  subscription: {
    plan_type: string | null;
    status: 'active' | 'inactive';
    expires_at: string | null;
  };
  reached_day: number;
  day_progress: {
    day_number: number;
    grammar_done: number;
    grammar_total: number;
    vocabulary_done: boolean;
    reading_done: boolean;
    speaking_level: number;
    updated_at: string | null;
  } | null;
  payments: Array<{
    id: number;
    status: string;
    product_code: string | null;
    tariff_type: string | null;
    amount: number | null;
    currency: string | null;
    created_at: string | null;
    approved_at: string | null;
  }>;
  revoked_payments?: number;
};

export async function lookupAdminUserByPhone(phone: string): Promise<AdminUserManageSnapshot> {
  const q = encodeURIComponent(phone.trim());
  return adminApi<AdminUserManageSnapshot>(`/users/lookup?phone=${q}`);
}

export function getAdminUserManage(id: number): Promise<AdminUserManageSnapshot> {
  return adminApi(`/users/${id}/manage`);
}

export async function freezeAdminUser(id: number, reason?: string): Promise<AdminUserManageSnapshot> {
  return adminApi<AdminUserManageSnapshot>(`/users/${id}/freeze`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason ?? null }),
  });
}

export async function unfreezeAdminUser(id: number): Promise<AdminUserManageSnapshot> {
  return adminApi<AdminUserManageSnapshot>(`/users/${id}/unfreeze`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function revokeAdminUserAccess(id: number): Promise<AdminUserManageSnapshot> {
  return adminApi<AdminUserManageSnapshot>(`/users/${id}/revoke-access`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
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

export async function getAdminTeachers(): Promise<AdminTeacherRow[]> {
  return adminApi<AdminTeacherRow[]>('/teachers');
}

// --- Referral program
export type ReferralCurrency = 'UZS' | 'RUB' | 'USD';
export type AdminReferralOverview = {
  settings: { enabled: boolean; launch_at: string | null; reward_percent: number; min_withdrawal_rub: number };
  totals: { currency: ReferralCurrency; available: number; pending: number; reserved: number; debt: number; earned: number; paid_out: number; spent: number }[];
  events: { status: string; n: number }[];
  stuck_events: number;
  open_flags: number;
  withdrawals: { status: string; currency: ReferralCurrency; count: number; amount: number }[];
  ledger_mismatches: number;
};
export type AdminReferralLeader = {
  user_id: number; name: string; phone: string | null; invited: number; purchased: number; last_at: string | null;
  balances: { currency: ReferralCurrency; earned: number; available: number }[];
};
export type AdminReferralLeaders = {
  totals: { invited: number; purchased: number; inviters: number; invited_30d: number };
  leaders: AdminReferralLeader[];
};
export type AdminReferralLink = {
  id: number; created_at: string; status: string; outcome: string | null; outcome_reason: string | null;
  review_status: 'none' | 'pending' | 'cleared' | 'rejected'; review_note: string | null;
  first_source_type: string | null; first_source_id: number | null; first_confirmed_at: string | null;
  referrer_id: number; referred_user_id: number; referrer_name: string; referrer_phone: string | null;
  referred_name: string; referred_phone: string | null; rewards: { currency: ReferralCurrency; amount: number }[] | null;
};
export type AdminReferralWithdrawal = {
  id: number; user_id: number; user_name: string; amount: number; currency: ReferralCurrency;
  status: 'pending' | 'approved' | 'paid' | 'rejected'; card: string; full_name: string | null; created_at: string;
  approved_at: string | null; paid_at: string | null; payout_reference: string | null; reject_reason: string | null;
  min_amount: number | null; rate_as_of: string | null; debt: number; flagged: boolean;
};
export type AdminReferralLedgerRow = {
  id: number; user_id: number; user_name: string; currency: ReferralCurrency; entry_type: string; amount: number;
  d_available: number; d_held: number; d_reserved: number; d_debt: number; source_type: string | null; source_id: number | null;
  base_amount: number | null; rate_percent: number | null; actor_admin_id: number | null; note: string | null; created_at: string;
};
export type AdminReferralFlag = {
  id: number; kind: string; user_id: number | null; referral_id: number | null; withdrawal_id: number | null;
  details: Record<string, unknown>; status: string; created_at: string;
};

const post = (body: unknown) => ({ method: 'POST', body: JSON.stringify(body) });

export const referralAdmin = {
  overview: () => adminApi<AdminReferralOverview>('/referrals/overview'),
  leaders: (sort: 'invited' | 'purchased' | 'recent') => adminApi<AdminReferralLeaders>(`/referrals/leaders?sort=${sort}`),
  setEnabled: (enabled: boolean, confirm: string, launchAt?: string) =>
    adminApi<{ enabled: boolean; launch_at: string | null }>('/referrals/settings', { method: 'PUT', body: JSON.stringify({ enabled, confirm, launch_at: launchAt }) }),
  links: (review?: string, q?: string) =>
    adminApi<AdminReferralLink[]>(`/referrals/links?${new URLSearchParams({ ...(review ? { review } : {}), ...(q ? { q } : {}) })}`),
  review: (id: number, decision: 'cleared' | 'rejected', note: string) => adminApi(`/referrals/links/${id}/review`, post({ decision, note })),
  flagLink: (id: number, note: string) => adminApi(`/referrals/links/${id}/flag`, post({ note })),
  flags: (status = 'open') => adminApi<AdminReferralFlag[]>(`/referrals/flags?status=${status}`),
  closeFlag: (id: number, status: 'cleared' | 'confirmed', note: string) => adminApi(`/referrals/flags/${id}/close`, post({ status, note })),
  ledger: (userId?: number) => adminApi<AdminReferralLedgerRow[]>(`/referrals/ledger${userId ? `?user_id=${userId}` : ''}`),
  withdrawals: (status?: string) => adminApi<AdminReferralWithdrawal[]>(`/referrals/withdrawals${status ? `?status=${status}` : ''}`),
  withdrawalDetails: (id: number) => adminApi<{ id: number; card_number: string; full_name: string; phone: string; status: string }>(`/referrals/withdrawals/${id}/details`),
  approve: (id: number) => adminApi(`/referrals/withdrawals/${id}/approve`, post({})),
  paid: (id: number, payoutReference: string) => adminApi(`/referrals/withdrawals/${id}/paid`, post({ payout_reference: payoutReference })),
  reject: (id: number, reason: string) => adminApi(`/referrals/withdrawals/${id}/reject`, post({ reason })),
  refund: (body: { source_type: 'payment' | 'operator_receipt'; source_id: number; amount: number; reference: string; note?: string }) =>
    adminApi<{ reversed: number; debt: number; duplicate: boolean }>('/referrals/refunds', post(body)),
  cancelBonusPurchase: (paymentId: number, reason: string) => adminApi(`/referrals/bonus-purchases/${paymentId}/cancel`, post({ reason })),
  reconcile: () => adminApi<{ disabled: boolean; processed: number; failed: number }>('/referrals/reconcile', post({})),
};

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

/* ------------------------------------------------------------------ *
 * CHAT MODERATSIYASI — bloklash o'qish rejimini yoqadi.
 * ------------------------------------------------------------------ */

export type AdminChatBlock = {
  id: number;
  user_id: number;
  reason: string | null;
  expires_at: string | null;
  blocked_by_name: string | null;
  created_at: string;
  full_name: string;
  phone: string | null;
  active: boolean;
};

export type AdminCommunityMessage = {
  id: number;
  sender_user_id: number;
  sender_name: string;
  content: string;
  created_at: string;
  edited_at: string | null;
};

export async function getChatBlocks(): Promise<AdminChatBlock[]> {
  return adminApi<AdminChatBlock[]>('/chat-blocks');
}

export async function blockChatUser(body: {
  user_id: number;
  reason?: string;
  days?: number | null;
}): Promise<AdminChatBlock> {
  return adminApi<AdminChatBlock>('/chat-blocks', { method: 'POST', body: JSON.stringify(body) });
}

export async function unblockChatUser(userId: number): Promise<void> {
  await adminApi(`/chat-blocks/${userId}`, { method: 'DELETE' });
}

export async function getCommunityMessages(limit = 60): Promise<AdminCommunityMessage[]> {
  return adminApi<AdminCommunityMessage[]>(`/community-messages?limit=${limit}`);
}

export async function editCommunityMessage(id: number, content: string): Promise<void> {
  await adminApi(`/community-messages/${id}`, { method: 'PATCH', body: JSON.stringify({ content }) });
}

export async function deleteCommunityMessage(id: number): Promise<void> {
  await adminApi(`/community-messages/${id}`, { method: 'DELETE' });
}
