import { Flame } from 'lucide-react';
import type { LeaderboardUser } from '../../api/leaderboard';
import {
  getLeaderboardDisplayName,
  getLeaderboardInitial,
} from './leaderboardHelpers';

type LeaderboardPodiumProps = {
  items: LeaderboardUser[];
};

const PODIUM_META = {
  1: {
    order: 2,
    avatarSize: 'h-[7.4rem] w-[7.4rem] sm:h-[8.8rem] sm:w-[8.8rem]',
    ringClassName: 'border-[#F2B400]',
    badgeClassName: 'bg-[#F2B400] text-white',
    nameClassName: 'text-[#1E1B3A]',
  },
  2: {
    order: 1,
    avatarSize: 'h-[5.8rem] w-[5.8rem] sm:h-[7rem] sm:w-[7rem]',
    ringClassName: 'border-[#D6D4DE]',
    badgeClassName: 'bg-[#B8B8B8] text-white',
    nameClassName: 'text-[#25233D]',
  },
  3: {
    order: 3,
    avatarSize: 'h-[5.8rem] w-[5.8rem] sm:h-[7rem] sm:w-[7rem]',
    ringClassName: 'border-[#D9D0DA]',
    badgeClassName: 'bg-[#D07B34] text-white',
    nameClassName: 'text-[#25233D]',
  },
} as const;

function PodiumAvatar({ user, rank }: { user: LeaderboardUser; rank: 1 | 2 | 3 }) {
  const meta = PODIUM_META[rank];
  const name = getLeaderboardDisplayName(user);
  const badgeRank = user.rank ?? rank;

  return (
    <div className="relative">
      <div
        className={`relative overflow-hidden rounded-full border-[5px] bg-[#EAF4FF] ${meta.avatarSize} ${meta.ringClassName}`}
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#DBECFF] text-3xl font-bold text-[#2563EB] sm:text-5xl">
            {getLeaderboardInitial(user)}
          </div>
        )}
      </div>
      <div
        className={`absolute left-1/2 top-full flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xl font-bold shadow-[0_10px_18px_rgba(15,23,42,0.16)] ${meta.badgeClassName}`}
      >
        {badgeRank}
      </div>
    </div>
  );
}

function PodiumEntry({ user, rank }: { user: LeaderboardUser; rank: 1 | 2 | 3 }) {
  const meta = PODIUM_META[rank];
  const name = getLeaderboardDisplayName(user);

  return (
    <div className="flex flex-col items-center text-center">
      <PodiumAvatar user={user} rank={rank} />
      <div className="mt-8">
        <p className={`max-w-[110px] truncate text-base font-bold sm:max-w-[160px] sm:text-[1.05rem] ${meta.nameClassName}`}>
          {name}
        </p>
        <div className="mt-1 flex items-center justify-center gap-1 text-[1rem] font-medium text-[#74718F]">
          <Flame className="h-4 w-4 text-[#FF7A1A]" />
          <span>{user.points.toLocaleString('uz')}</span>
        </div>
      </div>
    </div>
  );
}

export default function LeaderboardPodium({ items }: LeaderboardPodiumProps) {
  const first = items[0];
  const second = items[1];
  const third = items[2];

  if (!first && !second && !third) {
    return null;
  }

  return (
    <div className="mb-6 rounded-[32px] bg-white px-4 py-6 shadow-[0_14px_40px_rgba(148,163,184,0.12)] sm:px-8 sm:py-8">
      <div className="grid grid-cols-3 items-end gap-3 sm:gap-6">
        <div className="flex justify-center" style={{ order: PODIUM_META[2].order }}>
          {second ? <PodiumEntry user={second} rank={2} /> : <div />}
        </div>
        <div className="flex justify-center" style={{ order: PODIUM_META[1].order }}>
          {first ? <PodiumEntry user={first} rank={1} /> : <div />}
        </div>
        <div className="flex justify-center" style={{ order: PODIUM_META[3].order }}>
          {third ? <PodiumEntry user={third} rank={3} /> : <div />}
        </div>
      </div>
    </div>
  );
}
