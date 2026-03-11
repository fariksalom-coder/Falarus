import LeaderboardItem from './LeaderboardItem';
import type { LeaderboardUser } from '../../api/leaderboard';

type LeaderboardListProps = {
  items: LeaderboardUser[];
  currentUserId?: number;
};

export default function LeaderboardList({ items, currentUserId }: LeaderboardListProps) {
  return (
    <ul className="space-y-3">
      {items.map((user, index) => (
        <LeaderboardItem
          key={user.id}
          rank={index + 1}
          user={user}
          isCurrentUser={currentUserId != null && user.id === currentUserId}
        />
      ))}
    </ul>
  );
}
