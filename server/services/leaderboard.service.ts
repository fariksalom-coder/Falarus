import type { SupabaseClient } from '@supabase/supabase-js';

const LEADERBOARD = 'leaderboard';
const USERS = 'users';
const TOP_LIMIT = 100;

export type LeaderboardRow = {
  id: number;
  user_id: number;
  total_points: number;
  rank: number;
  updated_at: string;
};

export type LeaderboardEntry = {
  id: number;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  total_points: number;
  rank: number;
};

export type MyPosition = {
  rank: number;
  points: number;
};

/**
 * Ensure user has a row in leaderboard (e.g. new user). Idempotent.
 */
export async function ensureUserInLeaderboard(
  supabase: SupabaseClient,
  userId: number
): Promise<void> {
  const { error } = await supabase.from(LEADERBOARD).upsert(
    {
      user_id: userId,
      total_points: 0,
      rank: 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id', ignoreDuplicates: true }
  );
  if (error) throw error;
}

/**
 * Sync leaderboard.total_points from users.total_points for one user.
 * Call after updating users.total_points.
 */
export async function updateUserPoints(
  supabase: SupabaseClient,
  userId: number,
  totalPoints: number
): Promise<void> {
  const { error } = await supabase
    .from(LEADERBOARD)
    .update({
      total_points: totalPoints,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) {
    if (error.code === '23503' || error.message?.includes('0 rows')) {
      await ensureUserInLeaderboard(supabase, userId);
      await updateUserPoints(supabase, userId, totalPoints);
      return;
    }
    throw error;
  }
}

/**
 * Get top 100 from leaderboard with user names. Used by cache miss.
 */
export async function getTop100(supabase: SupabaseClient): Promise<LeaderboardEntry[]> {
  const { data: lbRows, error: lbErr } = await supabase
    .from(LEADERBOARD)
    .select('user_id, total_points, rank')
    .order('rank', { ascending: true })
    .limit(TOP_LIMIT);
  if (lbErr) throw lbErr;
  const rows = lbRows ?? [];
  if (rows.length === 0) return [];
  const userIds = [...new Set(rows.map((r: { user_id: number }) => r.user_id))];
  const { data: users, error: uErr } = await supabase
    .from(USERS)
    .select('id, first_name, last_name, avatar_url')
    .in('id', userIds);
  if (uErr) throw uErr;
  const byId = (users ?? []).reduce(
    (acc: Record<number, { id: number; first_name: string; last_name: string; avatar_url?: string | null }>, u: any) => {
      acc[u.id] = u;
      return acc;
    },
    {}
  );
  return rows.map((r: any) => {
    const u = byId[r.user_id];
    return {
      id: u?.id ?? r.user_id,
      firstName: u?.first_name ?? '',
      lastName: u?.last_name ?? '',
      avatarUrl: u?.avatar_url ?? null,
      total_points: Number(r.total_points),
      rank: Number(r.rank),
    };
  });
}

/**
 * Get current user's rank and points from leaderboard.
 */
export async function getMyPosition(
  supabase: SupabaseClient,
  userId: number
): Promise<MyPosition | null> {
  const { data, error } = await supabase
    .from(LEADERBOARD)
    .select('rank, total_points')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    rank: Number(data.rank),
    points: Number(data.total_points),
  };
}

/**
 * Recalculate rank for all rows: RANK() OVER (ORDER BY total_points DESC).
 * Call from cron every 5 minutes.
 */
export async function recalculateRanks(supabase: SupabaseClient): Promise<void> {
  const { data: rows, error: fetchErr } = await supabase
    .from(LEADERBOARD)
    .select('user_id, total_points')
    .order('total_points', { ascending: false });
  if (fetchErr) throw fetchErr;
  if (!rows?.length) return;
  for (let i = 0; i < rows.length; i++) {
    const rank = i + 1;
    await supabase
      .from(LEADERBOARD)
      .update({ rank, updated_at: new Date().toISOString() })
      .eq('user_id', rows[i].user_id);
  }
}
