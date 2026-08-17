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
  /** Moderator tahrirlagan bo'lsa — vaqti. */
  edited_at?: string | null;
};

/** O'qish rejimi: chatda yozib bo'lmaydi, faqat Support kanali ochiq. */
export type ChatBlock = {
  id: number;
  user_id: number;
  reason: string | null;
  expires_at: string | null;
  blocked_by_name: string | null;
  created_at: string;
};

export type ChatBlockListItem = ChatBlock & {
  full_name: string;
  phone: string | null;
  active: boolean;
};

export type SavolJavobTypingUser = {
  user_id: number;
  full_name: string;
};

export type SavolJavobMember = {
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
  /** Shu foydalanuvchini "@" bilan belgilagan o'qilmagan xabarlar soni. */
  mention_count: number;
  /** Bo'sh bo'lmasa — foydalanuvchi o'qish rejimida. */
  block?: ChatBlock | null;
  /** Moderator huquqi (support hisobi). */
  can_moderate?: boolean;
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

/** Pastki menyudagi nishon uchun yengil so'rov. */
export async function getSavolJavobMentionCount(token: string): Promise<number> {
  const res = await fetch(apiUrl('/api/community/savol-javob/mentions'), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Belgilashlar yuklanmadi');
  return Number(data?.mention_count ?? 0);
}

/** "@" bilan belgilash uchun odam qidirish. Bo'sh so'rov — yaqinda yozganlar. */
export async function searchSavolJavobMembers(
  token: string,
  query: string,
  signal?: AbortSignal
): Promise<SavolJavobMember[]> {
  const res = await fetch(
    apiUrl(`/api/community/savol-javob/members?q=${encodeURIComponent(query)}`),
    { headers: { Authorization: `Bearer ${token}` }, signal }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Aʼzolar topilmadi');
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

/* ------------------------------------------------------------------ *
 * MODERATSIYA — support hisobi chat ichidan boshqaradi.
 * ------------------------------------------------------------------ */

export async function getChatBlocks(token: string): Promise<ChatBlockListItem[]> {
  const res = await fetch(apiUrl('/api/community/moderation/blocks'), {
    headers: authHeaders(token),
  });
  const data = await res.json().catch(() => []);
  if (!res.ok) throw new Error((data as { error?: string })?.error || "Ro'yxat yuklanmadi");
  return data as ChatBlockListItem[];
}

export async function blockChatUser(
  token: string,
  params: { userId: number; reason?: string; days?: number | null }
): Promise<ChatBlock> {
  const res = await fetch(apiUrl('/api/community/moderation/blocks'), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ user_id: params.userId, reason: params.reason ?? '', days: params.days ?? null }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || 'Blok saqlanmadi');
  return data as ChatBlock;
}

export async function unblockChatUser(token: string, userId: number): Promise<void> {
  const res = await fetch(apiUrl(`/api/community/moderation/blocks/${userId}`), {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string })?.error || 'Blok olinmadi');
  }
}

export async function editGroupMessage(token: string, id: number, content: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/community/moderation/messages/${id}`), {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string })?.error || 'Xabar tahrirlanmadi');
  }
}

export async function deleteGroupMessage(token: string, id: number): Promise<void> {
  const res = await fetch(apiUrl(`/api/community/moderation/messages/${id}`), {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string })?.error || "Xabar o'chirilmadi");
  }
}
