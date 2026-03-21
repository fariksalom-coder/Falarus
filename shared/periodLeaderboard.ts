import type { SupabaseClient } from '@supabase/supabase-js';
import { isMissingPointEventsError } from './pointEvents.js';

export type PeriodLeaderboardKind = 'daily' | 'weekly';

export type PeriodLeaderboardUser = {
  id: number;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  points: number;
  rank: number;
};

export type PeriodLeaderboardPayload = {
  top: PeriodLeaderboardUser[];
  myRank: PeriodLeaderboardUser | null;
};

type PeriodLeaderboardRow = {
  id?: number | string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  points?: number | string | null;
  rank?: number | string | null;
};

function mapLeaderboardRow(row: PeriodLeaderboardRow | null | undefined): PeriodLeaderboardUser | null {
  if (!row?.id) return null;
  return {
    id: Number(row.id),
    firstName: row.first_name ?? null,
    lastName: row.last_name ?? null,
    avatarUrl: row.avatar_url ?? null,
    points: Number(row.points ?? 0),
    rank: Number(row.rank ?? 0),
  };
}

export async function fetchPeriodLeaderboardFromEvents(
  supabase: Pick<SupabaseClient, 'rpc'>,
  userId: number,
  period: PeriodLeaderboardKind,
  periodValue: string
): Promise<PeriodLeaderboardPayload | null> {
  const { data: topRows, error: topError } = await supabase.rpc('get_period_leaderboard', {
    period_kind: period,
    period_value: periodValue,
    lim: 100,
  });
  if (topError) {
    if (isMissingPointEventsError(topError)) return null;
    throw topError;
  }

  const { data: myRows, error: myError } = await supabase.rpc('get_period_user_rank', {
    period_kind: period,
    period_value: periodValue,
    requested_user_id: userId,
  });
  if (myError) {
    if (isMissingPointEventsError(myError)) return null;
    throw myError;
  }

  const top = Array.isArray(topRows)
    ? topRows
        .map((row) => mapLeaderboardRow(row as PeriodLeaderboardRow))
        .filter((row): row is PeriodLeaderboardUser => row != null)
    : [];

  const rawMyRow = Array.isArray(myRows) ? myRows[0] : myRows;
  const myRank = mapLeaderboardRow((rawMyRow as PeriodLeaderboardRow | undefined) ?? null);

  if (top.length === 0 && (myRank == null || myRank.points === 0)) {
    return null;
  }

  return { top, myRank };
}
