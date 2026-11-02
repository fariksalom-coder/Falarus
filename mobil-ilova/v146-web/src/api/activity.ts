import { apiUrl } from '../api';

export type StreakResponse = {
  streak_days: number;
  last_7_days: boolean[];
  best_streak_days: number;
  /** Seconds spent on the platform today (0 if backend not yet migrated). */
  today_seconds?: number;
  /** Cumulative seconds ever spent on the platform. */
  total_seconds?: number;
  /** Cached from users.total_points — matches leaderboard. */
  total_points?: number;
  level?: number;
};

const CACHE_STREAK = 'activity_streak';

export function getCachedStreak(): StreakResponse | null {
  try {
    const raw = sessionStorage.getItem(CACHE_STREAK);
    if (!raw) return null;
    const data = JSON.parse(raw) as {
      streak_days?: unknown;
      last_7_days?: unknown;
      best_streak_days?: unknown;
    };
    return {
      streak_days: typeof data.streak_days === 'number' ? data.streak_days : 0,
      last_7_days: Array.isArray(data.last_7_days)
        ? data.last_7_days.map((value) => value === true)
        : Array(7).fill(false),
      best_streak_days: typeof data.best_streak_days === 'number' ? data.best_streak_days : 0,
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
    const normalized: StreakResponse = {
      streak_days: typeof data.streak_days === 'number' ? data.streak_days : 0,
      last_7_days: Array.isArray(data.last_7_days) ? data.last_7_days : Array(7).fill(false),
      best_streak_days: typeof data.best_streak_days === 'number' ? data.best_streak_days : 0,
      today_seconds: typeof data.today_seconds === 'number' ? data.today_seconds : 0,
      total_seconds: typeof data.total_seconds === 'number' ? data.total_seconds : 0,
      total_points: typeof data.total_points === 'number' ? data.total_points : 0,
      level: typeof data.level === 'number' ? data.level : undefined,
    };
    setCachedStreak(normalized);
    return normalized;
  } catch {
    return null;
  }
}
