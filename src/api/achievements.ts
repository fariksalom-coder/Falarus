import { apiUrl } from '../api';
import type { AchievementKind } from '../../shared/achievements';

export type AchievementItem = {
  key: string;
  kind: AchievementKind;
  threshold: number;
  icon: 'flame' | 'zap' | 'star' | 'medal' | 'trophy' | 'crown' | 'sparkles' | 'book' | 'library' | 'graduation';
  reward: number;
  order: number;
  unlocked: boolean;
  unlocked_at: string | null;
  notified: boolean;
  progress: number;
  progress_pct: number;
};

export type AchievementsResponse = {
  items: AchievementItem[];
  total: number;
  unlocked_count: number;
  pending: string[];
  completed_days: number;
  words_learned: number;
};

function authHeaders(token: string | null): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) (h as Record<string, string>).Authorization = `Bearer ${token}`;
  return h;
}

export async function fetchAchievements(
  token: string | null,
): Promise<AchievementsResponse | null> {
  if (!token) return null;
  try {
    const res = await fetch(apiUrl('/api/achievements'), {
      headers: authHeaders(token),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function ackAchievements(
  token: string | null,
  keys: string[],
): Promise<void> {
  if (!token || keys.length === 0) return;
  try {
    await fetch(apiUrl('/api/achievements/ack'), {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ keys }),
    });
  } catch {
    // fire-and-forget
  }
}
