import { apiUrl } from '../api';

/**
 * Bildirishnomalar — ilova ichidagi kirish qutisi (matn + ovoz) va mobil
 * ilovaning push tokeni. Server: server/routes/notificationRoutes.ts.
 */
export type AppNotification = {
  id: number;
  title: string;
  body: string;
  url: string;
  audio_url: string | null;
  created_at: string;
  seen_at: string | null;
  opened_at: string | null;
};

const headers = (token: string) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });

export async function getNotifications(token: string): Promise<{ items: AppNotification[]; unseen: number }> {
  const res = await fetch(apiUrl('/api/notifications'), { headers: headers(token) });
  if (!res.ok) throw new Error('Bildirishnomalar yuklanmadi');
  return res.json();
}

export async function markNotification(token: string, id: number, what: 'seen' | 'opened'): Promise<void> {
  await fetch(apiUrl(`/api/notifications/${id}/${what}`), { method: 'POST', headers: headers(token) }).catch(() => undefined);
}

export async function registerPushDevice(token: string, platform: 'android' | 'ios', deviceToken: string): Promise<void> {
  await fetch(apiUrl('/api/push/device'), {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ platform, token: deviceToken }),
  });
}
