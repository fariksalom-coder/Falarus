import { apiUrl } from '../api';

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export type SavolJavobMessage = {
  id: number;
  group_code: string;
  sender_user_id: number;
  sender_name: string;
  content: string;
  created_at: string;
};

export type SavolJavobTypingUser = {
  user_id: number;
  full_name: string;
};

export type SavolJavobSummary = {
  group_code: string;
  title: string;
  member_count: number;
  online_count: number;
  last_message: {
    id: number;
    content: string;
    sender_user_id: number;
    created_at: string;
  } | null;
  unread_count: number;
};

export type SavolJavobLiveState = {
  member_count: number;
  online_count: number;
  typing_users: SavolJavobTypingUser[];
};

export async function getSavolJavobSummary(token: string): Promise<SavolJavobSummary> {
  const res = await fetch(apiUrl('/api/community/savol-javob/summary'), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Guruh yuklanmadi');
  return data;
}

export async function getSavolJavobLiveState(token: string): Promise<SavolJavobLiveState> {
  const res = await fetch(apiUrl('/api/community/savol-javob/live'), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Guruh holati yuklanmadi');
  return data;
}

export async function pingSavolJavobPresence(token: string): Promise<void> {
  const res = await fetch(apiUrl('/api/community/savol-javob/presence'), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'Onlayn holat saqlanmadi');
  }
}

export async function setSavolJavobTyping(token: string, typing: boolean): Promise<void> {
  const res = await fetch(apiUrl('/api/community/savol-javob/typing'), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ typing }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'Yozish holati saqlanmadi');
  }
}

export async function getSavolJavobMessages(token: string, beforeId?: number): Promise<SavolJavobMessage[]> {
  const qs = beforeId ? `?before_id=${beforeId}` : '';
  const res = await fetch(apiUrl(`/api/community/savol-javob/messages${qs}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Xabarlar yuklanmadi');
  return data;
}

export async function sendSavolJavobMessage(token: string, content: string): Promise<SavolJavobMessage> {
  const res = await fetch(apiUrl('/api/community/savol-javob/messages'), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ content }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Xabar yuborilmadi');
  return data;
}

export async function markSavolJavobRead(token: string): Promise<void> {
  const res = await fetch(apiUrl('/api/community/savol-javob/read'), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'O\'qilgan holat saqlanmadi');
  }
}
