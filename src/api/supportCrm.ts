import { supportCrmApi } from '../lib/supportCrmApi';

export type SupportCrmAgent = {
  id: number;
  login: string;
  name: string;
};

export type SupportCrmStats = {
  queue_count: number;
  in_progress_count: number;
  contacted_today: number;
  reached_today: number;
  no_pickup_today: number;
};

export type SupportCrmQueueRow = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  plan_name: string | null;
  plan_expires_at: string;
  total_time_seconds: number;
  last_seen_at?: string | null;
  last_kunlik_at: string | null;
  idle_since: string;
  idle_hours: number;
  last_contact_at: string | null;
  last_contact_channel: string | null;
  last_contact_outcome: string | null;
};

export type SupportCrmContact = {
  id: number;
  agent_id: number;
  agent_name: string | null;
  user_id: number;
  channel: string;
  channel_other: string | null;
  outcome: string;
  result: string | null;
  comment_text: string | null;
  created_at: string;
};

export type SupportCrmUserDetail = {
  user: {
    id: number;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    email: string | null;
    plan_name: string | null;
    plan_expires_at: string | null;
    plan_started_at: string | null;
    plan_days_left: number | null;
    total_time_seconds: number;
    created_at: string;
    last_seen_at?: string | null;
    last_kunlik_at: string | null;
    idle_since: string | null;
    idle_hours: number | null;
    idle_days: number;
    premium_active: boolean;
  };
  progress: {
    total_days: number;
    current_day: number;
    completed_days: number;
    stages: { id: string; label: string; status: 'done' | 'active' | 'todo' }[];
  } | null;
  contacts: SupportCrmContact[];
};

export type ContactChannel =
  | 'phone'
  | 'telegram'
  | 'whatsapp'
  | 'max'
  | 'imo'
  | 'email'
  | 'other';
export type ContactOutcome =
  | 'reached'
  | 'no_answer'
  | 'no_pickup'
  | 'no_contact'
  | 'no_telegram'
  | 'no_whatsapp'
  | 'no_imo'
  | 'in_progress'
  | 'other';
export type ContactResult = 'returned_ok' | 'helped_login' | 'needs_fix' | 'feedback' | 'other';

export async function supportCrmLogin(login: string, password: string) {
  return supportCrmApi<{ token: string; agent: SupportCrmAgent }>('/login', {
    method: 'POST',
    body: JSON.stringify({ login, password }),
    skipAuthRedirect: true,
  });
}

export async function supportCrmMe() {
  return supportCrmApi<{ agent: SupportCrmAgent }>('/me', { skipAuthRedirect: true });
}

export async function getSupportCrmStats() {
  return supportCrmApi<SupportCrmStats>('/stats');
}

export async function getSupportCrmQueue(
  filter: 'needs_contact' | 'contacted_today' | 'in_progress' = 'needs_contact'
) {
  return supportCrmApi<{ rows: SupportCrmQueueRow[]; total: number }>(
    `/queue?filter=${encodeURIComponent(filter)}&limit=100`
  );
}

export type SupportCrmContactedRow = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  plan_name: string | null;
  plan_expires_at: string | null;
  contact_id: number;
  contact_at: string;
  contact_channel: string;
  contact_outcome: string;
  contact_result: string | null;
  agent_name: string | null;
};

export async function getSupportCrmContacted(date: string) {
  return supportCrmApi<{ rows: SupportCrmContactedRow[]; total: number; date: string }>(
    `/contacted?date=${encodeURIComponent(date)}&limit=300`
  );
}

export type PremiumSort =
  | 'purchase_desc'
  | 'purchase_asc'
  | 'last_seen_desc'
  | 'last_seen_asc';

export type SupportCrmPremiumRow = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  plan_name: string | null;
  plan_expires_at: string;
  last_seen_at: string | null;
  purchased_at: string | null;
  tariff_type: string | null;
};

export async function getSupportCrmPremiumUsers(sort: PremiumSort = 'purchase_desc') {
  return supportCrmApi<{ rows: SupportCrmPremiumRow[]; total: number }>(
    `/premium-users?sort=${encodeURIComponent(sort)}&limit=300`
  );
}

export type ReturnTrackFilter = 'returned' | 'waiting' | 'all';

export type SupportCrmReturnTrackRow = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  plan_name: string | null;
  plan_expires_at: string | null;
  last_seen_at: string | null;
  contact_id: number;
  contact_at: string;
  contact_channel: string;
  contact_outcome: string;
  agent_name: string | null;
  returned: boolean;
  hours_to_return: number | null;
};

export async function getSupportCrmReturnTracking(
  filter: ReturnTrackFilter = 'returned',
  days = 30
) {
  return supportCrmApi<{
    rows: SupportCrmReturnTrackRow[];
    total: number;
    returned_count: number;
    waiting_count: number;
  }>(`/return-tracking?filter=${encodeURIComponent(filter)}&days=${days}&limit=300`);
}

export async function getSupportCrmUser(id: number) {
  return supportCrmApi<SupportCrmUserDetail>(`/users/${id}`);
}

export async function postSupportCrmContact(body: {
  userId: number;
  channel: ContactChannel;
  channelOther?: string;
  outcome: ContactOutcome;
  result?: ContactResult | null;
  commentText?: string;
}) {
  return supportCrmApi<{ contact: SupportCrmContact; nextUserId: number | null }>('/contacts', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** Support CRM agent: reset student password and return the new one once. */
export async function supportCrmParolTiklash(userId: number) {
  return supportCrmApi<{
    parol: string;
    foydalanuvchi: { id: number; ism: string; telefon: string | null; email: string | null };
  }>(`/users/${userId}/parol-tiklash`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
