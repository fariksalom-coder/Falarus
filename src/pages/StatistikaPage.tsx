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

  const summaryCards = [
    {
      title: 'Bugun',
      value: dailyStatsLoaded ? String(todayWords) : '—',
      subtitle: 'Bugun o‘rganildi',
    },
    {
      title: 'Bu hafta',
      value: dailyStatsLoaded ? String(weekWords) : '—',
      subtitle: 'Haftalik natija',
    },
    {
      title: 'Jami',
      value: topicsLoaded ? String(totalLearnedFromApi ?? 0) : '—',
      subtitle: 'Barcha vaqt',
    },
  ];

  return (
    <div className="min-h-screen pb-12" style={{ backgroundColor: BG }}>
      <main className="mx-auto max-w-6xl px-4 pt-6 md:px-6">
        <h1 className="mb-6 text-2xl font-bold md:text-3xl" style={{ color: TEXT }}>
          Statistika
        </h1>

        <div className="space-y-6">
          <div
            className="overflow-hidden rounded-[32px] px-6 py-7 text-white shadow-[0_30px_80px_rgba(255,98,54,0.28)] md:px-8 md:py-8"
            style={{
              background:
                'linear-gradient(135deg, #FF8A1E 0%, #FF6A1A 36%, #FF5538 72%, #FF2E52 100%)',
            }}
          >
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-lg font-semibold tracking-tight text-white/95 md:text-[22px]">
                  Ketma-ket kunlar
                </p>
                <div className="mt-4 flex items-end gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/12 backdrop-blur-sm md:h-20 md:w-20">
                    <Flame className="h-9 w-9 text-white md:h-11 md:w-11" />
                  </div>
                  <div className="leading-none">
                    <div className="text-[56px] font-black tracking-tight md:text-[76px]">
                      {streakLoaded ? streak.streak_days : '—'}
                    </div>
                    <div className="mt-1 text-lg font-medium text-white/80 md:text-xl">
                      kun ketma-ket
                    </div>
                  </div>
                </div>
              </div>
              <div className="md:pt-3 md:text-right">
                <p className="text-sm font-medium uppercase tracking-[0.28em] text-white/60">
                  Oxirgi hafta
                </p>
                <p className="mt-2 text-base font-medium text-white/90 md:text-[22px]">
                  Oxirgi 7 kun faoliyati
                </p>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {last7Rotated.map(({ label: d, active }, i) => {
                return (
                  <div key={`${d}-${i}`} className="flex flex-col items-center gap-3">
                    <div
                      className="flex h-24 w-full items-center justify-center rounded-[24px] backdrop-blur-sm transition-all duration-300 md:h-28"
                      title={d}
                      style={{
                        backgroundColor: active
                          ? 'rgba(255,255,255,0.24)'
                          : 'rgba(255,255,255,0.12)',
                        boxShadow: active
                          ? 'inset 0 1px 0 rgba(255,255,255,0.15)'
                          : 'inset 0 1px 0 rgba(255,255,255,0.05)',
                      }}
                    >
                      {active ? (
                        <Flame className="h-8 w-8 text-white md:h-9 md:w-9" />
                      ) : (
                        <span className="h-3 w-3 rounded-full bg-white/35" />
                      )}
                    </div>
                    <div className="text-lg font-medium text-white/92 md:text-xl">
                      {d}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {summaryCards.map((card, index) => (
              <div
                key={card.title}
                className="rounded-[28px] border bg-white px-6 py-8 text-center shadow-[0_20px_45px_rgba(15,23,42,0.08)] transition-transform duration-200 hover:-translate-y-0.5"
                style={{ borderColor: BORDER }}
              >
                <div
                  className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor:
                      index === 0 ? '#ECFDF5' : index === 1 ? '#EEF2FF' : '#FFF7ED',
                    color: index === 0 ? '#059669' : index === 1 ? '#4F46E5' : '#EA580C',
                  }}
                >
                  {index === 0 ? (
                    <MessageCircle className="h-5 w-5" />
                  ) : index === 1 ? (
                    <RefreshCw className="h-5 w-5" />
                  ) : (
                    <Award className="h-5 w-5" />
                  )}
                </div>
                <p className="mt-5 text-[15px] font-medium" style={{ color: TEXT_SECONDARY }}>
                  {card.title}
                </p>
                <p className="mt-3 text-5xl font-black tracking-tight" style={{ color: TEXT }}>
                  {card.value}
                </p>
                <p className="mt-3 text-base" style={{ color: '#7C879B' }}>
                  {card.subtitle}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
            <div
              className="rounded-[28px] border bg-white p-6 shadow-[0_20px_45px_rgba(15,23,42,0.06)]"
              style={{ borderColor: BORDER }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-100 text-teal-600">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold" style={{ color: TEXT }}>Javoblar aniqligi</h2>
                  <p className="text-sm" style={{ color: TEXT_SECONDARY }}>
                    Dars vazifalari bo‘yicha umumiy natija
                  </p>
                </div>
              </div>
              <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="relative h-28 w-28 shrink-0">
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
                  <span
                    className="absolute inset-0 flex items-center justify-center text-2xl font-black"
                    style={{ color: TEXT }}
                  >
                    {accuracyPercent}%
                  </span>
                </div>
                <div className="grid flex-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.2em]" style={{ color: TEXT_SECONDARY }}>
                      To‘g‘ri
                    </p>
                    <p className="mt-2 text-3xl font-black" style={{ color: TEXT }}>
                      {lessonStats.correct}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.2em]" style={{ color: TEXT_SECONDARY }}>
                      Noto‘g‘ri
                    </p>
                    <p className="mt-2 text-3xl font-black" style={{ color: TEXT }}>
                      {wrongCount}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="rounded-[28px] border bg-white p-6 shadow-[0_20px_45px_rgba(15,23,42,0.06)]"
              style={{ borderColor: BORDER }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold" style={{ color: TEXT }}>Yutuqlar</h2>
                  <p className="text-sm" style={{ color: TEXT_SECONDARY }}>
                    Siz erishgan milestone-lar
                  </p>
                </div>
              </div>
              <ul className="mt-6 space-y-3">
                {achievements.length > 0 ? (
                  achievements.map((a, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm"
                      style={{ color: TEXT }}
                    >
                      <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                      {a.text}
                    </li>
                  ))
                ) : (
                  <li className="rounded-2xl bg-slate-50 px-4 py-4 text-sm" style={{ color: TEXT_SECONDARY }}>
                    Hali yutuqlar yo&apos;q
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div
            className="rounded-[28px] border bg-white p-6 shadow-[0_20px_45px_rgba(15,23,42,0.06)]"
            style={{ borderColor: BORDER }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                <RefreshCw className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold" style={{ color: TEXT }}>Bo&apos;limlar progressi</h2>
                <p className="text-sm" style={{ color: TEXT_SECONDARY }}>
                  Lug&apos;at bo&apos;yicha DB dagi real progress
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {VOCABULARY_TOPICS.map((topic, index) => {
                const fromApi = topicsProgress.find((t) => t.id === topic.id);
                const total = getTopicWordCount(topic.id);
                const learned = fromApi?.learned_words ?? 0;
                const pct = total > 0 ? Math.round((learned / total) * 100) : 0;
                return (
                  <div
                    key={topic.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5"
                  >
                    <p
                      className="text-xs font-medium uppercase tracking-[0.24em]"
                      style={{ color: TEXT_SECONDARY }}
                    >
                      {index + 1}-bo&apos;lim
                    </p>
                    <div className="mt-2 flex items-start justify-between gap-4">
                      <span className="text-base font-semibold" style={{ color: TEXT }}>
                        {topic.title}
                      </span>
                      <span className="shrink-0 text-sm" style={{ color: TEXT_SECONDARY }}>
                        {topicsLoaded ? `${learned} / ${total}` : 'Yuklanmoqda...'}
                      </span>
                    </div>
                    <p className="mt-3 text-sm" style={{ color: TEXT_SECONDARY }}>
                      {topicsLoaded ? `${pct}% o'rganildi` : 'Server ma’lumotlari yuklanmoqda'}
                    </p>
                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: topicsLoaded ? `${Math.max(pct, 2)}%` : '22%',
                          background:
                            'linear-gradient(90deg, #6366F1 0%, #8B5CF6 55%, #22C55E 100%)',
                          opacity: topicsLoaded ? 1 : 0.3,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
