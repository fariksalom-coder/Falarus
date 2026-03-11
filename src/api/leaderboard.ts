import { apiUrl } from '../api';

export type LeaderboardUser = {
  id: number;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  points: number;
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
};

export type LeaderboardPeriod = 'weekly' | 'monthly' | 'all';

export async function fetchLeaderboard(
  token: string | null,
  period: LeaderboardPeriod
): Promise<LeaderboardResponse> {
  if (!token) return { top: [], myRank: null };
  try {
    const res = await fetch(
      apiUrl(`/api/leaderboard?period=${period === 'all' ? 'all' : period === 'monthly' ? 'monthly' : 'weekly'}`),
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return { top: [], myRank: null };
    const data = (await res.json()) as LeaderboardResponse;
    return data;
  } catch {
    return { top: [], myRank: null };
  }
}

export async function addUserPoints(
  token: string | null,
  amount: number
): Promise<{ points: number; weekly_points: number; monthly_points: number } | null> {
  if (!token || amount <= 0) return null;
  try {
    const res = await fetch(apiUrl('/api/user/points'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ amount }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { points: number; weekly_points: number; monthly_points: number };
    return data;
  } catch {
    return null;
  }
}
