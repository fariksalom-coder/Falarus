const TOKEN_KEY = 'salesCrmToken';

export function getSalesCrmToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setSalesCrmToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getSalesCrmToken();
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`/api/sales-crm${path}`, { ...init, headers });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string; code?: string };
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`) as Error & {
      status?: number;
      code?: string;
    };
    err.status = res.status;
    err.code = data.code;
    throw err;
  }
  return data;
}

export const salesCrmApi = {
  login: (login: string, password: string) =>
    request<{
      token: string;
      agent: { id: number; login: string; name: string; role: 'admin' | 'operator' };
    }>('/login', { method: 'POST', body: JSON.stringify({ login, password }) }),
  me: () =>
    request<{
      agent: { id: number; login: string; name: string; role: string };
      role: 'admin' | 'operator';
      tasks: { overdue: number; today: number; done_today: number; open_total: number };
    }>('/me'),
  dashboard: (period = '30d') => request<Record<string, unknown>>(`/dashboard?period=${period}`),
  leads: (qs: string) =>
    request<{ items: LeadRow[]; total: number; page: number; pageSize: number }>(`/leads?${qs}`),
  lead: (id: number) => request<LeadDetail>(`/leads/${id}`),
  setStatus: (
    id: number,
    status: string,
    opts?: { confirmPaidDowngrade?: boolean; comment?: string; nextContactAt?: string | null },
  ) =>
    request(`/leads/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({
        status,
        confirmPaidDowngrade: Boolean(opts?.confirmPaidDowngrade),
        comment: opts?.comment,
        nextContactAt: opts?.nextContactAt,
      }),
    }),
  assign: (id: number, operatorId: number | null) =>
    request(`/leads/${id}/assign`, { method: 'POST', body: JSON.stringify({ operatorId }) }),
  comment: (id: number, comment: string) =>
    request(`/leads/${id}/comment`, { method: 'POST', body: JSON.stringify({ comment }) }),
  task: (id: number, scheduledAt: string, note?: string) =>
    request(`/leads/${id}/task`, {
      method: 'POST',
      body: JSON.stringify({ scheduledAt, note }),
    }),
  call: (
    id: number,
    body: {
      answered: boolean;
      result: string;
      comment?: string;
      nextContactAt?: string | null;
    },
  ) => request(`/leads/${id}/call`, { method: 'POST', body: JSON.stringify(body) }),
  tasks: (bucket: string) =>
    request<{ items: TaskRow[]; summary: TaskSummary }>(`/tasks?bucket=${bucket}`),
  completeTask: (id: number) => request(`/tasks/${id}/complete`, { method: 'POST', body: '{}' }),
  operators: () =>
    request<{
      items: OperatorRow[];
      assignment: { mode: string };
    }>('/operators'),
  operatorStats: (period = '30d') =>
    request<{ items: OperatorStatRow[] }>(`/operators/stats?period=${period}`),
  setAssignment: (mode: 'manual' | 'round_robin') =>
    request('/settings/assignment', { method: 'POST', body: JSON.stringify({ mode }) }),
  sync: () => request<{ synced: number }>('/sync', { method: 'POST', body: '{}' }),
};

async function sheetsRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getSalesCrmToken();
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`/api/integrations/google-sheets${path}`, { ...init, headers });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string; errorMessage?: string };
  if (!res.ok) {
    throw new Error(data.errorMessage || data.error || `HTTP ${res.status}`);
  }
  return data;
}

export type SheetsStatus = {
  configured: boolean;
  connected: boolean;
  spreadsheetId: string | null;
  range: string;
  webhookConfigured: boolean;
  apiSyncConfigured?: boolean;
  crmLeadCount?: number;
  hint?: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  logs: {
    id: number;
    source: string;
    started_at: string;
    finished_at: string | null;
    ok: boolean;
    rows_checked: number;
    new_leads: number;
    duplicates: number;
    errors: number;
    error_message: string | null;
  }[];
};

export type SheetsSyncResult = {
  ok: boolean;
  connected: boolean;
  rowsChecked: number;
  newLeads: number;
  duplicates: number;
  errors: number;
  errorMessage?: string | null;
  lastSyncAt?: string | null;
};

export const sheetsApi = {
  status: () => sheetsRequest<SheetsStatus>('/status'),
  sync: () => sheetsRequest<SheetsSyncResult>('/sync', { method: 'POST', body: '{}' }),
  check: () => sheetsRequest<SheetsSyncResult>('/check', { method: 'POST', body: '{}' }),
};

export type LeadRow = {
  id: number;
  user_id: number;
  status: string;
  source: string | null;
  phone_normalized: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  operator_name: string | null;
  assigned_operator_id: number | null;
  next_contact_at: string | null;
  last_contact_at: string | null;
  created_at: string;
};

export type LeadDetail = {
  lead: LeadRow & Record<string, unknown>;
  events: { id: number; event_type: string; payload: unknown; created_at: string; actor_name: string | null }[];
  comments: { id: number; comment: string; created_at: string; agent_name: string | null }[];
  tasks: TaskRow[];
  calls: { id: number; result: string; answered: boolean; called_at: string; comment: string | null; operator_name: string | null }[];
};

export type TaskRow = {
  id: number;
  lead_id: number;
  scheduled_at: string;
  status: string;
  note: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  lead_status: string;
};

export type TaskSummary = {
  overdue: number;
  today: number;
  done_today: number;
  open_total: number;
};

export type OperatorRow = {
  id: number;
  login: string;
  name: string;
  role: string;
  active: boolean;
};

export type OperatorStatRow = {
  id: number;
  name: string;
  leads: number;
  processed: number;
  calls: number;
  answered_calls: number;
  no_answer_calls: number;
  paid: number;
  payment_pending: number;
  refused: number;
  paid_sum: number;
  overdue_tasks: number;
  no_next_action: number;
  conversion: number;
  process_rate: number;
};
