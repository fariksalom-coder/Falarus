import type { SupabaseClient } from '@supabase/supabase-js';

export async function ensureUserInLeaderboard(
  supabase: SupabaseClient,
  userId: number
): Promise<void> {
  const { error } = await supabase.from('leaderboard').upsert(
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

export async function updateUserPoints(
  supabase: SupabaseClient,
  userId: number,
  totalPoints: number
): Promise<void> {
  const { error } = await supabase
    .from('leaderboard')
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
