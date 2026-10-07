import { supportCrmApi } from '../lib/supportCrmApi';

export type SupportCrmAgent = {
  id: number;
  login: string;
  name: string;
};

export type SupportCrmStats = {
  needs_contact_count:number;
  contacted_count:number;
  no_contact_needed_count:number;
  total_premium:number;
};
export type SupportCrmQueueFilter = 'needs_contact'|'contacted'|'no_contact_needed';

/** Kurs bo'yicha qayerga yetgani (1-kundan ketma-ket yopilgan kunlar). */
export type SupportCrmDayProgress = {
  completed_days: number;
  current_day: number;
};

export type SupportCrmQueueRow = SupportCrmDayProgress & {
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
  last_contact_channel_other: string | null;
  bucket:SupportCrmQueueFilter;
  last_activity_at:string|null;
  contact_activity:'after_contact'|'not_recorded'|null;
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

export async function getSupportCrmQueue(filter:SupportCrmQueueFilter='needs_contact',q='',offset=0) {
 return supportCrmApi<{rows:SupportCrmQueueRow[];total:number;counts:SupportCrmStats}>(
  `/queue?filter=${encodeURIComponent(filter)}&limit=100&offset=${offset}&q=${encodeURIComponent(q)}`
 );
}

export type SupportCrmContactedRow = SupportCrmDayProgress & {
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
  last_seen_at: string | null;
};

export async function getSupportCrmContacted(date: string, q = '') {
  return supportCrmApi<{ rows: SupportCrmContactedRow[]; total: number; date: string }>(
    `/contacted?date=${encodeURIComponent(date)}&limit=300&q=${encodeURIComponent(q)}`
  );
}

export type PremiumSort =
  | 'purchase_desc'
  | 'purchase_asc'
  | 'last_seen_desc'
  | 'last_seen_asc';

export type SupportCrmPremiumRow = SupportCrmDayProgress & {
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

export type SupportCrmSearchRow = SupportCrmDayProgress & {
  id: number;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  last_seen_at: string | null;
  plan_name: string | null;
  plan_expires_at: string | null;
};

export async function searchSupportCrmUsers(q: string) {
  return supportCrmApi<{ rows: SupportCrmSearchRow[]; limit: number }>(
    `/search?q=${encodeURIComponent(q)}`
  );
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

export async function getSupportCrmPremiumCalendar(month:string,cohort:import('../../shared/supportCrmCalendar').PremiumCohort='historical',signal?:AbortSignal) {
  return supportCrmApi<import('../../shared/supportCrmCalendar').CrmPremiumCalendar>(`/calendar?month=${encodeURIComponent(month)}&cohort=${cohort}`,{signal});
}
export async function getSupportCrmStudentCalendar(id:number,month:string,signal?:AbortSignal) {
  return supportCrmApi<import('../../shared/supportCrmCalendar').CrmStudentCalendar>(`/users/${id}/calendar?month=${encodeURIComponent(month)}`,{signal});
}
