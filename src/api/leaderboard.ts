import { apiUrl } from '../api';

export type LeaderboardUser = {
  id: number;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  points: number;
  rank?: number;
};

export type LeaderboardResponse = {
  top: LeaderboardUser[];
  myRank: {
    rank: number;
    id: number;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    points: number;
  } | null;
  /** Set when API returned non-OK (e.g. 401, 500) for diagnostics */
  error?: { status: number; message?: string };
};

export type LeaderboardPeriod = 'daily' | 'weekly' | 'all';

export async function fetchLeaderboard(
  token: string | null,
  period: LeaderboardPeriod
): Promise<LeaderboardResponse> {
  if (!token) return { top: [], myRank: null };
  try {
    const res = await fetch(
      apiUrl(`/api/leaderboard?period=${period}`),
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        top: [],
        myRank: null,
        error: { status: res.status, message: (body as { error?: string }).error || res.statusText },
      };
    }
    return body as LeaderboardResponse;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Tarmoq xatosi';
    return { top: [], myRank: null, error: { status: 0, message } };
  }
}


/** XP bo'yicha platformadagi o'rin (bosh sahifa sarlavhasi uchun). */
export type MyRankResponse = {
  /** 1 dan boshlanadi. `null` — reytingga kirmaydigan hisob. */
  rank: number | null;
  points: number;
  /** Umuman reytingda qatnashayotganlar soni. */
  total: number;
  /**
   * Bugungi boshlang'ich o'rinnga nisbatan o'zgarish.
   * Musbat — yuqoriga ko'tarilgan, manfiy — tushgan, 0 — o'zgarmagan.
   */
  delta: number;
};

const MY_RANK_CACHE_KEY = 'falarus:myRank:v1';
/** O'rin yangilanganda tarqatiladigan hodisa — sarlavha darhol qayta chizadi. */
export const MY_RANK_EVENT = 'falarus:my-rank';

/**
 * Yangi o'rinni keshga yozadi va butun ilovaga xabar beradi.
 * XP olingan zahoti (masalan ibora testi yakunlangach) chaqiriladi — shunda
 * bosh sahifadagi raqam sahifani yangilamasdan o'zgaradi.
 */
export function publishMyRank(data: MyRankResponse): void {
  try {
    localStorage.setItem(MY_RANK_CACHE_KEY, JSON.stringify(data));
  } catch {
    /* saqlanmasa ham hodisa yuboriladi */
  }
  window.dispatchEvent(new CustomEvent(MY_RANK_EVENT, { detail: data }));
}

/** Oxirgi ma'lum o'rin — sahifa ochilishi bilan raqam "sakramasin". */
export function getCachedMyRank(): MyRankResponse | null {
  try {
    const raw = localStorage.getItem(MY_RANK_CACHE_KEY);
    return raw ? (JSON.parse(raw) as MyRankResponse) : null;
  } catch {
    return null;
  }
}

export async function fetchMyRank(token: string | null): Promise<MyRankResponse | null> {
  if (!token) return null;
  try {
    const res = await fetch(apiUrl('/api/my-rank'), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as MyRankResponse;
    publishMyRank(body);
    return body;
  } catch {
    return null;
  }
}
