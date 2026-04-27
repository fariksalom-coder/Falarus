import { apiUrl } from '../api';

function authHeaders(token: string | null): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

// -- Types ------------------------------------------------------------------

export type PartnerProfile = {
  user_id: number;
  display_name: string;
  age: number;
  gender: 'male' | 'female';
  language_level: string;
  goal: 'work' | 'conversation';
  about: string;
  seeking: string;
  created_at: string;
  updated_at: string;
};

export type PartnerPerson = Pick<
  PartnerProfile,
  'user_id' | 'display_name' | 'age' | 'gender' | 'language_level' | 'goal' | 'about' | 'seeking'
>;

export type PartnerRequest = {
  id: number;
  sender_id: number;
  receiver_id: number;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  responded_at: string | null;
  sender_profile?: PartnerPerson | null;
};

export type PartnerMatch = {
  id: number;
  user1_id: number;
  user2_id: number;
  status: 'active' | 'ended';
  matched_at: string;
  partner_profile?: PartnerPerson | null;
};

export type ChatMessage = {
  id: number;
  match_id: number;
  sender_id: number;
  content: string;
  created_at: string;
};

export type PartnerStatus = {
  hasProfile: boolean;
  match: PartnerMatch | null;
  outgoingRequest: {
    id: number;
    receiver_id: number;
    created_at: string;
    receiver_profile?: PartnerPerson | null;
  } | null;
  incomingRequestsCount: number;
};

// -- API calls --------------------------------------------------------------

export async function getPartnerStatus(token: string): Promise<PartnerStatus> {
  const res = await fetch(apiUrl('/api/partner/status'), { headers: authHeaders(token) });
  if (!res.ok) throw new Error('Partner status yuklanmadi');
  return res.json();
}

export async function getPartnerProfile(token: string): Promise<PartnerProfile | null> {
  const res = await fetch(apiUrl('/api/partner/profile'), { headers: authHeaders(token) });
  if (!res.ok) throw new Error('Profil yuklanmadi');
  return res.json();
}

export async function savePartnerProfile(
  token: string,
  data: Omit<PartnerProfile, 'user_id' | 'created_at' | 'updated_at'>
): Promise<PartnerProfile> {
  const res = await fetch(apiUrl('/api/partner/profile'), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Profil saqlanmadi');
  }
  return res.json();
}

export async function getPartnerPeople(token: string): Promise<PartnerPerson[]> {
  const res = await fetch(apiUrl('/api/partner/people'), { headers: authHeaders(token) });
  if (!res.ok) throw new Error('Odamlar yuklanmadi');
  return res.json();
}

export async function sendPartnerRequest(token: string, receiverId: number): Promise<void> {
  const res = await fetch(apiUrl('/api/partner/request'), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ receiver_id: receiverId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'So\'rov yuborilmadi');
  }
}

export async function cancelPartnerRequest(token: string, requestId: number): Promise<void> {
  const res = await fetch(apiUrl(`/api/partner/cancel-request?id=${requestId}`), {
    method: 'POST',
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'So\'rovni bekor qilib bo\'lmadi');
  }
}

export async function getIncomingRequests(token: string): Promise<PartnerRequest[]> {
  const res = await fetch(apiUrl('/api/partner/incoming-requests'), { headers: authHeaders(token) });
  if (!res.ok) throw new Error('So\'rovlar yuklanmadi');
  return res.json();
}

export async function acceptRequest(token: string, requestId: number): Promise<PartnerMatch> {
  const res = await fetch(apiUrl(`/api/partner/accept-request?id=${requestId}`), {
    method: 'POST',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('Qabul qilishda xatolik');
  return res.json();
}

export async function rejectRequest(token: string, requestId: number): Promise<void> {
  const res = await fetch(apiUrl(`/api/partner/reject-request?id=${requestId}`), {
    method: 'POST',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('Rad etishda xatolik');
}

export async function getPartnerMatch(token: string): Promise<PartnerMatch | null> {
  const res = await fetch(apiUrl('/api/partner/match'), { headers: authHeaders(token) });
  if (!res.ok) throw new Error('Match yuklanmadi');
  return res.json();
}

export async function endPartnership(token: string): Promise<void> {
  const res = await fetch(apiUrl('/api/partner/end-match'), {
    method: 'POST',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('Tugatishda xatolik');
}

export async function getChatMessages(
  token: string,
  matchId: number,
  before?: string
): Promise<ChatMessage[]> {
  let url = `/api/partner/messages?match_id=${matchId}`;
  if (before) url += `&before=${encodeURIComponent(before)}`;
  const res = await fetch(apiUrl(url), { headers: authHeaders(token) });
  if (!res.ok) throw new Error('Xabarlar yuklanmadi');
  return res.json();
}

export async function sendChatMessage(
  token: string,
  matchId: number,
  content: string
): Promise<ChatMessage> {
  const res = await fetch(apiUrl('/api/partner/messages'), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ match_id: matchId, content }),
  });
  if (!res.ok) throw new Error('Xabar yuborilmadi');
  return res.json();
}
