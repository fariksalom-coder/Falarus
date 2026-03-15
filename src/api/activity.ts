import { apiUrl } from '../api';

export type StreakResponse = {
  streak_days: number;
  last_7_days: boolean[];
};

function authHeaders(token: string | null): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) (h as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  return h;
}

export async function fetchStreak(token: string | null): Promise<StreakResponse | null> {
  if (!token) return null;
  try {
    const res = await fetch(apiUrl('/api/activity/streak'), { headers: authHeaders(token) });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      streak_days: typeof data.streak_days === 'number' ? data.streak_days : 0,
      last_7_days: Array.isArray(data.last_7_days) ? data.last_7_days : Array(7).fill(false),
    };
  } catch {
    return null;
  }
}
