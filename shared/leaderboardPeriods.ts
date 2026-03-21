export type LeaderboardPeriod = 'daily' | 'weekly' | 'all' | 'monthly';

export type PeriodicPointsRow = {
  points?: number | null;
  points_date?: string | null;
  weekly_points?: number | null;
  weekly_points_week_start?: string | null;
  monthly_points?: number | null;
  total_points?: number | null;
};

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function formatUtcDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function getWeekStartDateString(dateString: string): string {
  const [year, month, day] = dateString.split('-').map((value) => Number.parseInt(value, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekDay = date.getUTCDay();
  const mondayOffset = weekDay === 0 ? 6 : weekDay - 1;
  date.setUTCDate(date.getUTCDate() - mondayOffset);
  return formatUtcDate(date);
}

export function getDailyPoints(row: PeriodicPointsRow, today: string): number {
  return row.points_date === today ? Number(row.points ?? 0) : 0;
}

export function getWeeklyPoints(row: PeriodicPointsRow, today: string): number {
  const weekStart = getWeekStartDateString(today);
  return row.weekly_points_week_start === weekStart ? Number(row.weekly_points ?? 0) : 0;
}

export function buildPeriodicPointsUpdate(
  row: PeriodicPointsRow,
  delta: number,
  today: string
): {
  points: number;
  points_date: string;
  weekly_points: number;
  weekly_points_week_start: string;
  monthly_points: number;
  total_points: number;
} {
  const weekStart = getWeekStartDateString(today);
  const nextDaily = getDailyPoints(row, today) + delta;
  const nextWeekly =
    (row.weekly_points_week_start === weekStart ? Number(row.weekly_points ?? 0) : 0) + delta;

  return {
    points: nextDaily,
    points_date: today,
    weekly_points: nextWeekly,
    weekly_points_week_start: weekStart,
    monthly_points: Number(row.monthly_points ?? 0) + delta,
    total_points: Number(row.total_points ?? 0) + delta,
  };
}

export function isMissingLeaderboardColumnError(
  error: { message?: string | null; details?: string | null; hint?: string | null } | null | undefined,
  columnName: string
): boolean {
  const haystack = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`.toLowerCase();
  const needle = columnName.toLowerCase();
  return haystack.includes(needle) && (haystack.includes('column') || haystack.includes('schema cache'));
}
