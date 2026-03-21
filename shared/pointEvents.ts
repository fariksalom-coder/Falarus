import type { SupabaseClient } from '@supabase/supabase-js';
import { getWeekStartDateString } from './leaderboardPeriods.js';

export type PointEventType = 'award' | 'daily_snapshot' | 'weekly_snapshot';

type PointEventError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

export type PointEventInsertInput = {
  userId: number;
  points: number;
  source: string;
  sourceRef?: string | null;
  eventKey?: string | null;
  eventType?: PointEventType;
  activityDate?: string | null;
  activityWeekStart?: string | null;
};

export type PointEventInsertStatus = 'inserted' | 'duplicate' | 'missing' | 'skipped';

export function isMissingPointEventsError(
  error: PointEventError | null | undefined
): boolean {
  const haystack = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`.toLowerCase();
  return haystack.includes('point_events')
    || haystack.includes('get_period_leaderboard')
    || haystack.includes('get_period_user_rank');
}

export function buildPointEventInsert({
  userId,
  points,
  source,
  sourceRef,
  eventKey,
  eventType = 'award',
  activityDate,
  activityWeekStart,
}: PointEventInsertInput) {
  const safeActivityDate = activityDate ?? null;
  const safeActivityWeekStart =
    activityWeekStart
    ?? (safeActivityDate != null ? getWeekStartDateString(safeActivityDate) : null);

  return {
    user_id: userId,
    points,
    source,
    source_ref: sourceRef ?? null,
    event_key: eventKey ?? null,
    event_type: eventType,
    activity_date: safeActivityDate,
    activity_week_start: safeActivityWeekStart,
  };
}

export async function insertPointEvent(
  supabase: Pick<SupabaseClient, 'from'>,
  input: PointEventInsertInput
): Promise<PointEventInsertStatus> {
  if (input.points <= 0) return 'skipped';

  const { error } = await supabase
    .from('point_events')
    .insert(buildPointEventInsert(input));

  if (!error) return 'inserted';
  if (error.code === '23505') return 'duplicate';
  if (isMissingPointEventsError(error)) return 'missing';
  throw error;
}
