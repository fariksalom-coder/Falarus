import type { LeaderboardUser } from '../../api/leaderboard';

export function getLeaderboardDisplayName(user: LeaderboardUser): string {
  const first = (user.firstName || '').trim();
  const last = (user.lastName || '').trim();
  if (first && last) return `${first} ${last}`;
  return first || last || 'Foydalanuvchi';
}

export function getLeaderboardInitial(user: LeaderboardUser): string {
  const name = getLeaderboardDisplayName(user);
  return (name[0] || '?').toUpperCase();
}
