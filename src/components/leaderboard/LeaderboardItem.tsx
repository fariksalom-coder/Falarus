import UserRankCard from './UserRankCard';
import type { LeaderboardUser } from '../../api/leaderboard';

type LeaderboardItemProps = {
  rank: number;
  user: LeaderboardUser;
  isCurrentUser?: boolean;
};

export default function LeaderboardItem({ rank, user, isCurrentUser }: LeaderboardItemProps) {
  return (
    <li>
      <UserRankCard rank={rank} user={user} isCurrentUser={isCurrentUser} />
    </li>
  );
}
