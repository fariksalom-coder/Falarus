import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchLeaderboard, type LeaderboardPeriod, type LeaderboardResponse } from '../api/leaderboard';
import LeaderboardList from '../components/leaderboard/LeaderboardList';
import UserRankCard from '../components/leaderboard/UserRankCard';

const BG = '#F8FAFC';
const BORDER = '#E2E8F0';
const PRIMARY = '#6366F1';
const TEXT = '#0F172A';
const TEXT_SECONDARY = '#64748B';

const TABS: { key: LeaderboardPeriod; label: string }[] = [
  { key: 'weekly', label: 'Haftalik' },
  { key: 'monthly', label: 'Oylik' },
  { key: 'all', label: 'Umumiy' },
];

export default function LeaderboardPage() {
  const { user, token } = useAuth();
  const [period, setPeriod] = useState<LeaderboardPeriod>('weekly');
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

  const inTop10 = data?.myRank && data.myRank.rank <= 10;

  return (
    <div className="min-h-screen pb-10" style={{ backgroundColor: BG }}>
      <main className="mx-auto max-w-2xl px-4 pt-6">
        <h1 className="mb-6 text-2xl font-bold" style={{ color: TEXT }}>
          Reyting
        </h1>

        <div
          className="mb-6 flex rounded-2xl border p-1"
          style={{ borderColor: BORDER, backgroundColor: 'white' }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setPeriod(tab.key)}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all duration-200"
              style={{
                backgroundColor: period === tab.key ? PRIMARY : 'transparent',
                color: period === tab.key ? '#fff' : TEXT_SECONDARY,
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
            <div
              className="rounded-2xl border p-4 shadow-sm"
              style={{ backgroundColor: 'white', borderColor: BORDER }}
            >
              <LeaderboardList
                items={data?.top ?? []}
                currentUserId={user?.id}
              />
            </div>

            {data?.myRank != null && (
              <div className="mt-6">
                <p
                  className="mb-3 text-sm font-semibold"
                  style={{ color: TEXT_SECONDARY }}
                >
                  Sizning o‘rningiz
                </p>
                <div
                  className={`rounded-2xl border p-4 shadow-sm transition-all ${
                    inTop10 ? 'ring-2 ring-[#6366F1]' : ''
                  }`}
                  style={{ backgroundColor: 'white', borderColor: BORDER }}
                >
                  <p className="mb-2 text-sm font-medium" style={{ color: TEXT_SECONDARY }}>
                    {data.myRank.rank}-o‘rin
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
                  />
                </div>
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
