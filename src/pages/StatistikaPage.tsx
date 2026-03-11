import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchVocabularyProgress } from '../api/vocabularyProgress';
import { fetchLeaderboard, type LeaderboardResponse } from '../api/leaderboard';
import { getVocabularyStats } from '../utils/statsHelpers';
import { getTotalLessonTaskStats } from '../utils/lessonTaskResults';
import {
  BookOpen,
  Flame,
  MessageCircle,
  Target,
  RefreshCw,
  Trophy,
  Award,
} from 'lucide-react';
import UserRankCard from '../components/leaderboard/UserRankCard';

const BG = '#F8FAFC';
const BORDER = '#E2E8F0';
const PRIMARY = '#6366F1';
const TEXT = '#0F172A';
const TEXT_SECONDARY = '#64748B';

const DAY_LABELS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

export default function StatistikaPage() {
  const { user, token } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);

  useEffect(() => {
    fetchVocabularyProgress(token);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchLeaderboard(token, 'all').then(setLeaderboard);
  }, [token]);

  const vocabStats = useMemo(() => getVocabularyStats(), []);
  const lessonStats = useMemo(() => getTotalLessonTaskStats(), []);
  const accuracyPercent = lessonStats.total > 0
    ? Math.round((lessonStats.correct / lessonStats.total) * 100)
    : 0;
  const wrongCount = lessonStats.total - lessonStats.correct;

  const streakDays = 0;
  const todayWords = 0;
  const weekWords = 0;
  const dailyGoal = 10;
  const dailyDone = todayWords;

  const achievements = [
    { done: lessonStats.total > 0, text: "Birinchi dars tugatildi" },
    { done: streakDays >= 7, text: '7 kun ketma-ket' },
    { done: vocabStats.totalLearned >= 100, text: "100 ta so'z o'rganildi" },
  ].filter((a) => a.done);

  return (
    <div className="min-h-screen pb-12" style={{ backgroundColor: BG }}>
      <main className="mx-auto max-w-2xl px-4 pt-6">
        <h1 className="mb-6 text-2xl font-bold" style={{ color: TEXT }}>
          Statistika
        </h1>

        <div className="space-y-4">
          {/* Umumiy progress */}
          <div
            className="rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            style={{ borderColor: BORDER }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold" style={{ color: TEXT }}>Umumiy progress</h2>
                <p className="text-sm" style={{ color: TEXT_SECONDARY }}>
                  {vocabStats.totalLearned} / {vocabStats.totalWords} so'z o'rganildi
                </p>
              </div>
            </div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${vocabStats.totalWords > 0 ? Math.min(100, (vocabStats.totalLearned / vocabStats.totalWords) * 100) : 0}%`,
                  backgroundColor: PRIMARY,
                }}
              />
            </div>
            <p className="mt-2 text-xs" style={{ color: TEXT_SECONDARY }}>
              Bugun o'rganildi {todayWords} so'z
            </p>
          </div>

          {/* Ketma-ket kunlar */}
          <div
            className="rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            style={{ borderColor: BORDER }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold" style={{ color: TEXT }}>Ketma-ket kunlar</h2>
                <p className="text-2xl font-bold" style={{ color: PRIMARY }}>{streakDays} kun</p>
              </div>
            </div>
            <div className="mt-4 flex justify-between gap-1">
              {DAY_LABELS.map((d, i) => (
                <div
                  key={d}
                  className="h-8 flex-1 rounded-lg bg-slate-100"
                  title={d}
                  style={{ backgroundColor: i < streakDays ? '#22c55e' : undefined, opacity: i < streakDays ? 0.9 : 0.4 }}
                />
              ))}
            </div>
            <p className="mt-2 text-xs" style={{ color: TEXT_SECONDARY }}>
              Oxirgi 7 kun faoliyat
            </p>
          </div>

          {/* O'rganilgan so'zlar */}
          <div
            className="rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            style={{ borderColor: BORDER }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <MessageCircle className="h-5 w-5" />
              </div>
              <h2 className="font-semibold" style={{ color: TEXT }}>O'rganilgan so'zlar</h2>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold" style={{ color: TEXT }}>{todayWords}</p>
                <p className="text-xs" style={{ color: TEXT_SECONDARY }}>Bugun</p>
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: TEXT }}>{weekWords}</p>
                <p className="text-xs" style={{ color: TEXT_SECONDARY }}>Bu hafta</p>
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: TEXT }}>{vocabStats.totalLearned}</p>
                <p className="text-xs" style={{ color: TEXT_SECONDARY }}>Jami</p>
              </div>
            </div>
          </div>

          {/* Javoblar aniqligi */}
          <div
            className="rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            style={{ borderColor: BORDER }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-600">
                <Target className="h-5 w-5" />
              </div>
              <h2 className="font-semibold" style={{ color: TEXT }}>Javoblar aniqligi</h2>
            </div>
            <div className="mt-4 flex items-center gap-6">
              <div className="relative h-20 w-20">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    fill="none"
                    stroke="#E2E8F0"
                    strokeWidth="3"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    fill="none"
                    stroke="#14b8a6"
                    strokeWidth="3"
                    strokeDasharray={`${accuracyPercent}, 100`}
                    strokeLinecap="round"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-bold" style={{ color: TEXT }}>
                  {accuracyPercent}%
                </span>
              </div>
              <div className="text-sm" style={{ color: TEXT_SECONDARY }}>
                <p>{lessonStats.correct} ta to'g'ri</p>
                <p>{wrongCount} ta noto'g'ri</p>
              </div>
            </div>
          </div>

          {/* Bo'limlar progressi */}
          <div
            className="rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            style={{ borderColor: BORDER }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                <RefreshCw className="h-5 w-5" />
              </div>
              <h2 className="font-semibold" style={{ color: TEXT }}>Bo'limlar progressi</h2>
            </div>
            <div className="mt-4 space-y-3">
              {vocabStats.byTopic.slice(0, 5).map((t) => {
                const pct = t.total > 0 ? Math.round((t.learned / t.total) * 100) : 0;
                return (
                  <div key={t.topicId}>
                    <div className="flex justify-between text-sm">
                      <span style={{ color: TEXT }}>{t.title}</span>
                      <span style={{ color: TEXT_SECONDARY }}>{t.learned} / {t.total}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.max(pct, 2)}%`,
                          backgroundColor: pct >= 50 ? '#14b8a6' : pct >= 20 ? '#f59e0b' : '#94a3b8',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reyting */}
          <div
            className="rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            style={{ borderColor: BORDER }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <Trophy className="h-5 w-5" />
              </div>
              <h2 className="font-semibold" style={{ color: TEXT }}>Reyting</h2>
            </div>
            <div className="mt-4 space-y-3">
              {(leaderboard?.top ?? []).slice(0, 5).map((u, i) => (
                <UserRankCard
                  key={u.id}
                  rank={i + 1}
                  user={u}
                  isCurrentUser={user?.id === u.id}
                />
              ))}
            </div>
            {leaderboard?.myRank != null && (leaderboard.myRank.rank > 5) && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium" style={{ color: TEXT_SECONDARY }}>Sizning o'rningiz</p>
                <UserRankCard
                  rank={leaderboard.myRank.rank}
                  user={{
                    id: leaderboard.myRank.id,
                    firstName: leaderboard.myRank.firstName,
                    lastName: leaderboard.myRank.lastName,
                    avatarUrl: leaderboard.myRank.avatarUrl,
                    points: leaderboard.myRank.points,
                  }}
                  isCurrentUser
                />
              </div>
            )}
          </div>

          {/* Yutuqlar */}
          <div
            className="rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            style={{ borderColor: BORDER }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                <Award className="h-5 w-5" />
              </div>
              <h2 className="font-semibold" style={{ color: TEXT }}>Yutuqlar</h2>
            </div>
            <ul className="mt-4 space-y-2">
              {achievements.length > 0 ? (
                achievements.map((a, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm" style={{ color: TEXT }}>
                    <span className="h-2 w-2 rounded-full bg-indigo-500" />
                    {a.text}
                  </li>
                ))
              ) : (
                <li className="text-sm" style={{ color: TEXT_SECONDARY }}>
                  Hali yutuqlar yo'q
                </li>
              )}
            </ul>
          </div>

          {/* Kunlik maqsad */}
          <div
            className="rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            style={{ borderColor: BORDER }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold" style={{ color: TEXT }}>Kunlik maqsad</h2>
                <p className="text-sm" style={{ color: TEXT_SECONDARY }}>{dailyGoal} so'z</p>
              </div>
            </div>
            <p className="mt-3 text-sm" style={{ color: TEXT }}>Bugun: {dailyDone} / {dailyGoal}</p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (dailyDone / dailyGoal) * 100)}%`,
                  backgroundColor: PRIMARY,
                }}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
