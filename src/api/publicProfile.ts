import { apiUrl } from '../api';

export type PublicProfileAchievement = {
  key: string;
  kind: 'days' | 'words';
  threshold: number;
  icon: 'flame' | 'zap' | 'star' | 'medal' | 'trophy' | 'crown' | 'sparkles' | 'book' | 'library' | 'graduation';
  reward: number;
  order: number;
  unlocked: boolean;
  unlocked_at: string | null;
};

export type PublicProfileResponse = {
  id: number;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  points: number;
  streakDays: number;
  bestStreakDays: number;
  level: number;
  hasPremium: boolean;
  memberSinceYear: number;
  achievements: PublicProfileAchievement[];
  unlockedAchievementsCount: number;
  totalAchievementsCount: number;
};

export async function fetchPublicProfile(
  token: string | null,
  userId: number,
): Promise<PublicProfileResponse | null> {
  if (!token) return null;
  try {
    const res = await fetch(apiUrl(`/api/users/${userId}/public`), {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
