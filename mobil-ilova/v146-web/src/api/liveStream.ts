import { apiUrl } from '../api';

/**
 * Jonli efir (vebinar).
 *
 * Efirni ADMIN PANELI emas, OLTIN SUPPORT HISOBI boshqaradi: u o'z hisobidan
 * ilova ichida ochadi va yuritadi. Server har bir boshqaruv so'rovida
 * `users.is_golden` ni tekshiradi.
 *
 * `room_slug` server tomonidan talabaga FAQAT efir jonli bo'lganda yuboriladi:
 * shunda support xonaga birinchi kirib, Jitsi'da moderator bo'lib qoladi.
 */

export type LiveStreamStatus = 'scheduled' | 'live' | 'ended' | 'cancelled';

export type PublicLiveStream = {
  id: number;
  title: string;
  description: string;
  status: LiveStreamStatus;
  starts_at: string | null;
  duration_minutes: number;
  started_at: string | null;
  room_slug: string | null;
};

export type LiveStreamState = {
  domain: string;
  live: PublicLiveStream | null;
  upcoming: PublicLiveStream[];
};

export type ManagedLiveStream = PublicLiveStream & {
  room_slug: string;
  ended_at: string | null;
  created_at: string;
};

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function so(res: Response): Promise<any> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || 'Amal bajarilmadi');
  return data;
}

/* ─────────────────────────── Hamma uchun ─────────────────────────── */

export async function getLiveStreamState(token: string): Promise<LiveStreamState> {
  return so(await fetch(apiUrl('/api/live-streams'), { headers: { Authorization: `Bearer ${token}` } }));
}

/* ───────────────────── Support (oltin hisob) uchun ───────────────────── */

export async function listManagedStreams(
  token: string,
): Promise<{ domain: string; streams: ManagedLiveStream[] }> {
  return so(await fetch(apiUrl('/api/live-streams/manage'), { headers: authHeaders(token) }));
}

export async function createLiveStream(
  token: string,
  body: {
    title: string;
    description?: string;
    starts_at?: string | null;
    duration_minutes?: number;
    start_now?: boolean;
  },
): Promise<ManagedLiveStream> {
  return so(
    await fetch(apiUrl('/api/live-streams'), {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    }),
  );
}

async function amal(token: string, id: number, yol: string): Promise<ManagedLiveStream> {
  return so(
    await fetch(apiUrl(`/api/live-streams/${id}/${yol}`), {
      method: 'POST',
      headers: authHeaders(token),
    }),
  );
}

export const startLiveStream = (token: string, id: number) => amal(token, id, 'start');
export const endLiveStream = (token: string, id: number) => amal(token, id, 'end');
export const cancelLiveStream = (token: string, id: number) => amal(token, id, 'cancel');

export async function getHostRoom(
  token: string,
  id: number,
): Promise<{ domain: string; room_slug: string; title: string }> {
  return so(await fetch(apiUrl(`/api/live-streams/${id}/room`), { headers: authHeaders(token) }));
}
