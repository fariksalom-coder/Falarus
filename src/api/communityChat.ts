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

export type SavolJavobSummary = {
  group_code: string;
  title: string;
  last_message: {
    id: number;
    content: string;
    sender_user_id: number;
    created_at: string;
  } | null;
  unread_count: number;
};

export async function getSavolJavobSummary(token: string): Promise<SavolJavobSummary> {
  const res = await fetch(apiUrl('/api/community/savol-javob/summary'), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Guruh yuklanmadi');
  return data;
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
