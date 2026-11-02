import { apiUrl } from '../api';

/** O'yinlardan bepul foydalanish holati. */
export type GameQuota = {
  /** To'lovi bor — chek yo'q. */
  premium: boolean;
  used: number;
  limit: number;
  allowed: boolean;
};

function headers(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

/** Holatni ko'rish (hisobga yozmaydi). */
export async function getGameQuota(token: string): Promise<GameQuota> {
  const res = await fetch(apiUrl('/api/games/quota'), { headers: headers(token) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || 'Maʼlumot yuklanmadi');
  return data as GameQuota;
}

/**
 * O'yin ochilganini serverga yozadi.
 *
 * Bepul urinishlar tugagan bo'lsa `allowed: false` qaytadi — o'shanda
 * o'yin o'rniga to'lov ekrani ko'rsatiladi.
 */
export async function startGamePlay(token: string, game: string): Promise<GameQuota> {
  const res = await fetch(apiUrl('/api/games/play'), {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ game }),
  });
  const data = (await res.json().catch(() => ({}))) as GameQuota & { error?: string };
  if (res.status === 402) return { ...data, allowed: false };
  if (!res.ok) throw new Error(data?.error || 'Amal bajarilmadi');
  return data;
}
