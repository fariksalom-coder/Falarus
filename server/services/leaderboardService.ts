import type { Supabase } from '../types/progress';

const USERS = 'users';

export type LeaderboardEntry = {
  rank: number;
  user: string;
  points: number;
};

/**
 * Get leaderboard: users ordered by total_points DESC.
 */
export async function getLeaderboard(
  supabase: Supabase,
  limit: number = 100
): Promise<LeaderboardEntry[]> {
  const { data: rows, error } = await supabase
    .from(USERS)
    .select('id, first_name, last_name, total_points')
    .order('total_points', { ascending: false })
    .limit(limit);
  if (error) throw error;
  const list = rows ?? [];
  return list.map((u: any, index: number) => ({
    rank: index + 1,
    user: [u.first_name, u.last_name].filter(Boolean).join(' ') || 'User',
    points: u.total_points ?? 0,
  }));
}
