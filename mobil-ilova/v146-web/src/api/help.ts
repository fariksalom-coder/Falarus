import { apiUrl } from '../api';

function authHeaders(token: string | null): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

export type HelpChatListItem = {
  id: number;
  title: string;
  status: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  unread_count: number;
  last_message: {
    id: number;
    content: string;
    sender_type: 'user' | 'admin';
    created_at: string;
  } | null;
};

export type HelpChatMessage = {
  id: number;
  chat_id: number;
  sender_type: 'user' | 'admin';
  sender_user_id: number | null;
  content: string;
  created_at: string;
};

export async function getHelpChats(token: string): Promise<HelpChatListItem[]> {
  const res = await fetch(apiUrl('/api/help/chats'), { headers: authHeaders(token) });
  if (!res.ok) throw new Error('Yozishmalar yuklanmadi');
  return res.json();
}

export async function getHelpChatMessages(token: string, chatId: number): Promise<HelpChatMessage[]> {
  const res = await fetch(apiUrl(`/api/help/chats/${chatId}/messages`), { headers: authHeaders(token) });
  if (!res.ok) throw new Error('Xabarlar yuklanmadi');
  return res.json();
}

export async function sendHelpChatMessage(token: string, chatId: number, content: string): Promise<HelpChatMessage> {
  const res = await fetch(apiUrl(`/api/help/chats/${chatId}/messages`), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error('Xabar yuborilmadi');
  return res.json();
}

export async function sendHelpChatImage(token: string, chatId: number, file: File): Promise<HelpChatMessage> {
  const form = new FormData();
  form.append('image', file);
  const headers: HeadersInit = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(apiUrl(`/api/help/chats/${chatId}/media`), {
    method: 'POST',
    headers,
    body: form,
  });
  if (!res.ok) throw new Error('Rasm yuborilmadi');
  return res.json();
}

export async function markHelpChatRead(token: string, chatId: number): Promise<void> {
  const res = await fetch(apiUrl(`/api/help/chats/${chatId}/read`), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error('Read holati saqlanmadi');
}

