import LeaderboardItem from './LeaderboardItem';
import type { LeaderboardUser } from '../../api/leaderboard';

type LeaderboardListProps = {
  items: LeaderboardUser[];
  currentUserId?: number;
  startRank?: number;
};

export default function LeaderboardList({
  items,
  currentUserId,
  startRank = 1,
}: LeaderboardListProps) {
  return (
    <ul className="space-y-3">
      {items.map((user, index) => (
        <LeaderboardItem
          key={user.id}
          rank={startRank + index}
          user={user}
          isCurrentUser={currentUserId != null && user.id === currentUserId}
        />
      ))}
    </ul>
  );
}
