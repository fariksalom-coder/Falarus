import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchVocabularyDailyWordStats,
  getCachedVocabularyDailyWordStats,
} from '../api/vocabularyProgress';
import {
  fetchVocabularyTopics,
  getCachedTopicsProgress,
  setCachedTopicsProgress,
  type VocabularyTopic,
} from '../api/vocabulary';
import { VOCABULARY_TOPICS } from '../data/vocabularyTopics';
import { getTopicWordCount } from '../data/vocabularyContent';
import { getTotalLessonTaskStats } from '../utils/lessonTaskResults';
import { fetchStreak, getCachedStreak, type StreakResponse } from '../api/activity';
import {
  Flame,
  MessageCircle,
  Target,
  RefreshCw,
  Award,
} from 'lucide-react';

const BG = '#F8FAFC';
const BORDER = '#E2E8F0';
const PRIMARY = '#6366F1';
const TEXT = '#0F172A';
const TEXT_SECONDARY = '#64748B';
const EMPTY_STREAK: StreakResponse = {
  streak_days: 0,
  last_7_days: [false, false, false, false, false, false, false],
};

// JS Date.getDay(): 0=Sunday .. 6=Saturday
const DAY_LABEL_BY_WEEKDAY: Record<number, string> = {
  0: 'Ya', // Sunday
  1: 'Du', // Monday
  2: 'Se', // Tuesday
  3: 'Ch', // Wednesday
  4: 'Pa', // Thursday
  5: 'Ju', // Friday
  6: 'Sh', // Saturday
};

export default function StatistikaPage() {
  const { token } = useAuth();
  const [topicsProgress, setTopicsProgress] = useState<VocabularyTopic[]>(() =>
    getCachedTopicsProgress() ?? []
  );
  const [topicsLoaded, setTopicsLoaded] = useState<boolean>(() => getCachedTopicsProgress() != null);

  useEffect(() => {
    if (!token) {
      setTopicsProgress([]);
      setTopicsLoaded(true);
      return;
    }
    const cached = getCachedTopicsProgress();
    if (cached) {
      setTopicsProgress(cached);
      setTopicsLoaded(true);
    } else {
      setTopicsLoaded(false);
    }
    fetchVocabularyTopics(token).then((data) => {
      setTopicsProgress(data);
      setCachedTopicsProgress(data);
      setTopicsLoaded(true);
    });
  }, [token]);

  const [streak, setStreak] = useState<StreakResponse>(() => getCachedStreak() ?? EMPTY_STREAK);
  const [streakLoaded, setStreakLoaded] = useState<boolean>(() => getCachedStreak() != null);
  useEffect(() => {
    if (!token) {
      setStreak(EMPTY_STREAK);
      setStreakLoaded(true);
      return;
    }
    const cached = getCachedStreak();
    if (cached) {
      setStreak(cached);
      setStreakLoaded(true);
    } else {
      setStreakLoaded(false);
    }
    fetchStreak(token).then((data) => {
      if (data) {
        setStreak({ streak_days: data.streak_days, last_7_days: data.last_7_days });
      }
      setStreakLoaded(true);
    });
  }, [token]);
  const totalLearnedFromApi = useMemo(() => {
    if (!topicsLoaded) return null;
    return topicsProgress.reduce((s, t) => s + t.learned_words, 0);
  }, [topicsLoaded, topicsProgress]);

  const [dailyStats, setDailyStats] = useState<{ todayWords: number; weekWords: number } | null>(
    () => getCachedVocabularyDailyWordStats()
  );
  const [dailyStatsLoaded, setDailyStatsLoaded] = useState<boolean>(
    () => getCachedVocabularyDailyWordStats() != null
  );
  useEffect(() => {
    if (!token) {
      setDailyStats({ todayWords: 0, weekWords: 0 });
      setDailyStatsLoaded(true);
      return;
    }
    const cached = getCachedVocabularyDailyWordStats();
    if (cached) {
      setDailyStats(cached);
      setDailyStatsLoaded(true);
    } else {
      setDailyStatsLoaded(false);
    }
    fetchVocabularyDailyWordStats(token).then((data) => {
      if (data) setDailyStats({ todayWords: data.todayWords, weekWords: data.weekWords });
      setDailyStatsLoaded(true);
    });
  }, [token]);

  const lessonStats = useMemo(() => getTotalLessonTaskStats(), []);
  const accuracyPercent = lessonStats.total > 0
    ? Math.round((lessonStats.correct / lessonStats.total) * 100)
    : 0;
  const wrongCount = lessonStats.total - lessonStats.correct;

  const todayWords = dailyStats?.todayWords ?? 0;
  const weekWords = dailyStats?.weekWords ?? 0;

  const achievements = [
    { done: lessonStats.total > 0, text: "Birinchi dars tugatildi" },
    { done: streak.streak_days >= 7, text: '7 kun ketma-ket' },
    { done: (totalLearnedFromApi ?? 0) >= 100, text: "100 ta so'z o'rganildi" },
  ].filter((a) => a.done);

  // `streak.last_7_days` is ordered as: [day-6, day-5, ..., today]
  // But UI requirement: Monday (`Du`) must always be the leftmost column.
  // So we rotate the 7-day window so that the date that is Monday becomes index 0.
  const last7Rotated = useMemo(() => {
    const today = new Date();
    const dates = Array.from({ length: 7 }, (_, idx) => {
      const dayOffsetFromToday = 6 - idx; // idx=0 => day-6, idx=6 => today
      const d = new Date(today);
      d.setDate(today.getDate() - dayOffsetFromToday);
      return d;
    });
    const mondayPos = dates.findIndex((d) => d.getDay() === 1); // 1 = Monday
    const shift = mondayPos >= 0 ? mondayPos : 0;

    // Build [rotatedIndex -> oldIndex] mapping
    return Array.from({ length: 7 }, (_, newIdx) => {
      const oldIdx = (shift + newIdx) % 7; // old day that corresponds to column newIdx
      const label = DAY_LABEL_BY_WEEKDAY[dates[oldIdx].getDay()] ?? '';
      const active = streak.last_7_days[oldIdx] === true;
      return { label, active };
    });
  }, [streak.last_7_days]);

  return (
    <div className="min-h-screen pb-12" style={{ backgroundColor: BG }}>
      <main className="mx-auto max-w-2xl px-4 pt-6">
        <h1 className="mb-6 text-2xl font-bold" style={{ color: TEXT }}>
          Statistika
        </h1>

        <div className="space-y-4">
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
                <p className="text-2xl font-bold" style={{ color: PRIMARY }}>
                  {streakLoaded ? `${streak.streak_days} kun` : 'Yuklanmoqda...'}
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-between gap-1">
              {last7Rotated.map(({ label: d, active }, i) => {
                return (
                  <div key={d} className="flex-1 flex flex-col items-center">
                    <div
                      className="flex h-10 w-full items-center justify-center rounded-lg bg-slate-100/70"
                      title={d}
                      style={{
                        backgroundColor: active ? '#fff7ed' : '#f1f5f9',
                        opacity: active ? 1 : 0.45,
                      }}
                    >
                      <Flame
                        className="h-6 w-6"
                        style={{ color: active ? '#f97316' : '#cbd5e1' }}
                      />
                    </div>
                    <div
                      className="mt-1 text-[10px] font-semibold"
                      style={{ color: TEXT_SECONDARY, opacity: active ? 1 : 0.55 }}
                    >
                      {d}
                    </div>
                  </div>
                );
              })}
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
                <p className="text-2xl font-bold" style={{ color: TEXT }}>
                  {dailyStatsLoaded ? todayWords : '—'}
                </p>
                <p className="text-xs" style={{ color: TEXT_SECONDARY }}>Bugun</p>
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: TEXT }}>
                  {dailyStatsLoaded ? weekWords : '—'}
                </p>
                <p className="text-xs" style={{ color: TEXT_SECONDARY }}>Bu hafta</p>
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: TEXT }}>
                  {topicsLoaded ? totalLearnedFromApi ?? 0 : '—'}
                </p>
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

          {/* Bo'limlar progressi — те же данные, что и на странице Lug'at */}
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
              {VOCABULARY_TOPICS.map((topic, index) => {
                const fromApi = topicsProgress.find((t) => t.id === topic.id);
                const total = getTopicWordCount(topic.id);
                const learned = fromApi?.learned_words ?? 0;
                const pct = total > 0 ? Math.round((learned / total) * 100) : 0;
                return (
                  <div key={topic.id}>
                    <p className="text-xs font-medium uppercase tracking-wider" style={{ color: TEXT_SECONDARY }}>
                      {index + 1}-bo&apos;lim
                    </p>
                    <div className="flex justify-between text-sm mt-0.5">
                      <span className="font-semibold" style={{ color: TEXT }}>{topic.title}</span>
                      <span style={{ color: TEXT_SECONDARY }}>
                        {topicsLoaded ? `${learned} / ${total} so'z` : 'Yuklanmoqda...'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs" style={{ color: TEXT_SECONDARY }}>
                      {topicsLoaded ? `${pct}% o'rganildi` : 'Server ma’lumotlari yuklanmoqda'}
                    </p>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: topicsLoaded ? `${Math.max(pct, 2)}%` : '24%',
                          backgroundColor: pct >= 50 ? '#14b8a6' : pct >= 20 ? '#f59e0b' : '#94a3b8',
                          opacity: topicsLoaded ? 1 : 0.35,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
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
        </div>
      </main>
    </div>
  );
}
