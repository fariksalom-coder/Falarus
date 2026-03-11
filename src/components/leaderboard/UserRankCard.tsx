import type { LeaderboardUser } from '../../api/leaderboard';

const BORDER = '#E2E8F0';
const TEXT = '#0F172A';
const TEXT_SECONDARY = '#64748B';

type UserRankCardProps = {
  rank: number;
  user: LeaderboardUser;
  isCurrentUser?: boolean;
};

function getDisplayName(user: LeaderboardUser): string {
  const first = (user.firstName || '').trim();
  const last = (user.lastName || '').trim();
  if (first && last) return `${first} ${last}`;
  return first || last || 'Foydalanuvchi';
}

function getRankEmoji(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return '';
}

function getRankStyle(rank: number): string {
  if (rank === 1) return 'text-amber-500'; // gold
  if (rank === 2) return 'text-slate-400'; // silver
  if (rank === 3) return 'text-amber-700'; // bronze
  return 'text-slate-600';
}

export default function UserRankCard({ rank, user, isCurrentUser }: UserRankCardProps) {
  const name = getDisplayName(user);
  const emoji = getRankEmoji(rank);
  const rankStyle = getRankStyle(rank);

  return (
    <div
      className={`
        flex items-center gap-4 rounded-2xl border bg-white px-4 py-3 transition-all duration-200
        hover:shadow-md
        ${isCurrentUser ? 'ring-2 ring-[#6366F1] shadow-lg' : ''}
      `}
      style={{ borderColor: BORDER }}
    >
      <div className={`flex w-10 shrink-0 items-center justify-center text-xl font-bold ${rankStyle}`}>
        {emoji || `${rank}`}
      </div>
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-semibold">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm">{(name[0] || '?').toUpperCase()}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold" style={{ color: TEXT }}>
          {name}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1 font-bold" style={{ color: TEXT }}>
        <span>🔥</span>
        <span>{user.points.toLocaleString('uz')} ball</span>
      </div>
    </div>
  );
}
