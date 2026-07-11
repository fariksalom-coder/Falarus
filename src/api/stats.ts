import { apiUrl } from '../api';

export type CourseProgress = {
  completed_days: number;
  total_days: number;
  pct: number;
};

export type CalendarDay = {
  date: string;
  status: 'done' | 'extra' | 'missed' | 'today' | 'future' | 'none';
  extra_days: number;
};

export type ActivityCalendar = {
  year: number;
  month: number;
  days: CalendarDay[];
};

function authHeaders(token: string | null): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) (h as Record<string, string>).Authorization = `Bearer ${token}`;
  return h;
}

export async function fetchCourseProgress(token: string | null): Promise<CourseProgress | null> {
  if (!token) return null;
  try {
    const res = await fetch(apiUrl('/api/stats/course-progress'), {
      headers: authHeaders(token),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export type WeeklyActivityDay = {
  date: string;
  minutes: number;
  active: boolean;
  is_today: boolean;
  height_pct: number;
};

export type WeeklyActivityResponse = {
  source: 'daily_time' | 'activity_dates';
  days: WeeklyActivityDay[];
  max_minutes: number;
};

export async function fetchWeeklyActivity(
  token: string | null,
): Promise<WeeklyActivityResponse | null> {
  if (!token) return null;
  try {
    const res = await fetch(apiUrl('/api/stats/weekly-activity'), {
      headers: authHeaders(token),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchActivityCalendar(
  token: string | null,
  year: number,
  month: number
): Promise<ActivityCalendar | null> {
  if (!token) return null;
  try {
    const res = await fetch(apiUrl(`/api/stats/activity-calendar?year=${year}&month=${month}`), {
      headers: authHeaders(token),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function recordCourseDay(token: string | null): Promise<void> {
  if (!token) return;
  try {
    await fetch(apiUrl('/api/stats/record-course-day'), {
      method: 'POST',
      headers: authHeaders(token),
    });
  } catch {
    // fire-and-forget
  }
}
