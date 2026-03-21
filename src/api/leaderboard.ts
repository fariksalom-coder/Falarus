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

export async function addUserPoints(
  token: string | null,
  amount: number
): Promise<{ points: number; weekly_points: number; total_points?: number } | null> {
  // Deprecated: points are now awarded through server-side lesson/vocabulary progress endpoints
  // to keep scoring idempotent and avoid double-counting on retries.
  void token;
  void amount;
  return null;
}
