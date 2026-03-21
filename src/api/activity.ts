import { apiUrl } from '../api';

export type StreakResponse = {
  streak_days: number;
  last_7_days: boolean[];
};

const CACHE_STREAK = 'activity_streak';

export function getCachedStreak(): StreakResponse | null {
  try {
    const raw = sessionStorage.getItem(CACHE_STREAK);
    if (!raw) return null;
    const data = JSON.parse(raw) as {
      streak_days?: unknown;
      last_7_days?: unknown;
    };
    return {
      streak_days: typeof data.streak_days === 'number' ? data.streak_days : 0,
      last_7_days: Array.isArray(data.last_7_days)
        ? data.last_7_days.map((value) => value === true)
        : Array(7).fill(false),
    };
  } catch {
    return null;
  }
}

function setCachedStreak(data: StreakResponse): void {
  try {
    sessionStorage.setItem(CACHE_STREAK, JSON.stringify(data));
  } catch {
    // ignore
  }
}

function authHeaders(token: string | null): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) (h as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  return h;
}

export async function fetchStreak(token: string | null): Promise<StreakResponse | null> {
  if (!token) return null;
  try {
    const res = await fetch(apiUrl('/api/streak'), { headers: authHeaders(token) });
    if (!res.ok) return null;
    const data = await res.json();
    const normalized = {
      streak_days: typeof data.streak_days === 'number' ? data.streak_days : 0,
      last_7_days: Array.isArray(data.last_7_days) ? data.last_7_days : Array(7).fill(false),
    };
    setCachedStreak(normalized);
    return normalized;
  } catch {
    return null;
  }
}
