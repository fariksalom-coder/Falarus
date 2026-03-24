import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchLeaderboard, type LeaderboardPeriod, type LeaderboardResponse } from '../api/leaderboard';
import LeaderboardList from '../components/leaderboard/LeaderboardList';
import UserRankCard from '../components/leaderboard/UserRankCard';

const BG = '#F8FAFC';
const BORDER = '#E2E8F0';
const PRIMARY = '#6D35D2';
const TEXT = '#0F172A';
const TEXT_SECONDARY = '#64748B';
const TAB_TRACK_BG = 'linear-gradient(180deg, #F0EDF8 0%, #ECEAF4 100%)';
const TAB_ACTIVE_BG = 'linear-gradient(135deg, #6E2DE2 0%, #7C3AED 52%, #8B5CF6 100%)';
const TAB_ACTIVE_SHADOW = `
  0 14px 28px rgba(109,53,210,0.20),
  0 4px 10px rgba(124,58,237,0.16),
  inset 0 1px 0 rgba(255,255,255,0.28),
  inset 0 -10px 18px rgba(91,33,182,0.14)
`;

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

  return (
    <div className="min-h-screen pb-10" style={{ backgroundColor: BG }}>
      <main className="mx-auto max-w-4xl px-4 pt-6 sm:px-5">
        <h1 className="mb-6 text-2xl font-bold sm:text-[2rem]" style={{ color: TEXT }}>
          Reyting
        </h1>

        <div
          className="mb-8 flex rounded-[28px] border p-1.5 shadow-[0_14px_30px_rgba(148,163,184,0.10)]"
          style={{
            borderColor: '#E7E2F3',
            background: TAB_TRACK_BG,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.72), 0 14px 30px rgba(148,163,184,0.10)',
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setPeriod(tab.key)}
              className="relative flex-1 overflow-hidden rounded-[22px] py-3 text-sm font-semibold transition-all duration-200 sm:text-base"
              style={{
                background: period === tab.key ? TAB_ACTIVE_BG : 'transparent',
                color: period === tab.key ? '#fff' : TEXT_SECONDARY,
                border: period === tab.key ? '1px solid rgba(255,255,255,0.14)' : '1px solid transparent',
                boxShadow: period === tab.key ? TAB_ACTIVE_SHADOW : 'none',
                textShadow: period === tab.key ? '0 1px 2px rgba(76,29,149,0.24)' : 'none',
              }}
            >
              {period === tab.key && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-4 top-1 h-1/2 rounded-full opacity-70"
                  style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 100%)' }}
                />
              )}
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
            {data?.top.length ? (
              <LeaderboardList
                items={data.top}
                currentUserId={user?.id}
              />
            ) : null}

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
