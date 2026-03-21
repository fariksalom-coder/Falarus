import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchLeaderboard, type LeaderboardPeriod, type LeaderboardResponse } from '../api/leaderboard';
import LeaderboardList from '../components/leaderboard/LeaderboardList';
import LeaderboardPodium from '../components/leaderboard/LeaderboardPodium';
import UserRankCard from '../components/leaderboard/UserRankCard';

const BG = '#F8FAFC';
const BORDER = '#E2E8F0';
const PRIMARY = '#6D35D2';
const TEXT = '#0F172A';
const TEXT_SECONDARY = '#64748B';

const TABS: { key: LeaderboardPeriod; label: string }[] = [
  { key: 'daily', label: 'Kunlik' },
  { key: 'weekly', label: 'Haftalik' },
  { key: 'all', label: 'Umumiy' },
];

export default function LeaderboardPage() {
  const { user, token } = useAuth();
  const [period, setPeriod] = useState<LeaderboardPeriod>('daily');
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchLeaderboard(token, period).then((res) => {
      setData(res);
      setLoading(false);
    });
  }, [token, period]);

  const topThree = data?.top.slice(0, 3) ?? [];
  const listItems = data?.top ?? [];

  return (
    <div className="min-h-screen pb-10" style={{ backgroundColor: BG }}>
      <main className="mx-auto max-w-4xl px-4 pt-6 sm:px-5">
        <h1 className="mb-6 text-2xl font-bold sm:text-[2rem]" style={{ color: TEXT }}>
          Reyting
        </h1>

        <div
          className="mb-8 flex rounded-[28px] border p-1.5 shadow-[0_10px_26px_rgba(148,163,184,0.10)]"
          style={{ borderColor: '#E3E2EC', backgroundColor: '#ECEAF2' }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setPeriod(tab.key)}
              className="flex-1 rounded-[22px] py-3 text-sm font-semibold transition-all duration-200 sm:text-base"
              style={{
                background: period === tab.key ? 'linear-gradient(135deg,#6E2DE2 0%,#7C3AED 100%)' : 'transparent',
                color: period === tab.key ? '#fff' : TEXT_SECONDARY,
                boxShadow:
                  period === tab.key
                    ? 'inset 0 0 0 2px #0EA5E9, 0 10px 24px rgba(109,53,210,0.18)'
                    : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div
              className="h-10 w-10 animate-spin rounded-full border-2 border-t-transparent"
              style={{ borderColor: PRIMARY }}
            />
          </div>
        ) : (
          <>
            {topThree.length > 0 && <LeaderboardPodium items={topThree} />}

            {listItems.length > 0 && (
              <LeaderboardList
                items={listItems}
                currentUserId={user?.id}
                startRank={1}
              />
            )}

            {data?.myRank != null && (
              <div className="mt-6">
                <p
                  className="mb-3 text-sm font-semibold"
                  style={{ color: TEXT_SECONDARY }}
                >
                  Sizning o‘rningiz
                </p>
                <UserRankCard
                  rank={data.myRank.rank}
                  user={{
                    id: data.myRank.id,
                    firstName: data.myRank.firstName,
                    lastName: data.myRank.lastName,
                    avatarUrl: data.myRank.avatarUrl,
                    points: data.myRank.points,
                  }}
                  isCurrentUser
                  caption="Joriy o‘rningiz"
                />
              </div>
            )}

            {data?.error != null && (
              <p className="py-6 text-center text-sm" style={{ color: '#b91c1c' }}>
                Xatolik: {data.error.status ? `${data.error.status}` : ''} {data.error.message || ''}
              </p>
            )}
            {data?.top?.length === 0 && !data?.myRank && !data?.error && (
              <p className="py-8 text-center" style={{ color: TEXT_SECONDARY }}>
                Hali reyting bo‘sh
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
