import { Flame } from 'lucide-react';
import type { LeaderboardUser } from '../../api/leaderboard';
import {
  getLeaderboardDisplayName,
  getLeaderboardInitial,
} from './leaderboardHelpers';

const BORDER = '#E2E8F0';
const TEXT = '#0F172A';
const TEXT_SECONDARY = '#64748B';

type UserRankCardProps = {
  rank: number;
  user: LeaderboardUser;
  isCurrentUser?: boolean;
  caption?: string;
};

export default function UserRankCard({ rank, user, isCurrentUser, caption }: UserRankCardProps) {
  const name = getLeaderboardDisplayName(user);

  return (
    <div
      className={`
        flex items-center gap-3 rounded-[28px] border bg-white px-4 py-4 transition-all duration-200
        shadow-[0_12px_30px_rgba(148,163,184,0.12)] sm:gap-5 sm:px-6
        ${isCurrentUser ? 'ring-2 ring-[#2563EB] shadow-[0_18px_40px_rgba(37,99,235,0.16)]' : ''}
      `}
      style={{ borderColor: BORDER }}
    >
      <div className="flex w-10 shrink-0 items-center justify-center text-[1.05rem] font-bold text-[#7A7894] sm:w-12 sm:text-[1.15rem]">
        {rank}
      </div>

      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#EAF4FF] text-xl font-bold text-[#2563EB] sm:h-16 sm:w-16 sm:text-2xl">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span>{getLeaderboardInitial(user)}</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xl font-bold leading-tight" style={{ color: TEXT }}>
          {name}
        </p>
        <p className="mt-1 text-sm font-medium sm:text-base" style={{ color: TEXT_SECONDARY }}>
          {caption ?? `${rank}-o‘rin`}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2 text-2xl font-bold" style={{ color: TEXT }}>
        <Flame className="h-5 w-5 text-[#FF7A1A]" />
        <span>{user.points.toLocaleString('uz')}</span>
      </div>
    </div>
  );
}
