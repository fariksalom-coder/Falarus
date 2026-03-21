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
import { clampVocabDailyDisplayToTotals } from '../../shared/vocabDailyStatsClamp';

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

  const totalLearned = totalLearnedFromApi ?? 0;
  const rawToday = dailyStats?.todayWords ?? 0;
  const rawWeek = dailyStats?.weekWords ?? 0;
  const { todayWords, weekWords } = topicsLoaded
    ? clampVocabDailyDisplayToTotals(totalLearned, rawToday, rawWeek)
    : { todayWords: rawToday, weekWords: rawWeek };

  const achievements = [
    { done: lessonStats.total > 0, text: "Birinchi dars tugatildi" },
    { done: streak.streak_days >= 7, text: '7 kun ketma-ket' },
    { done: totalLearned >= 100, text: "100 ta so'z o'rganildi" },
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
      value: topicsLoaded ? String(totalLearned) : '—',
      subtitle: 'Barcha vaqt',
    },
  ];

  return (
    <div className="min-h-screen pb-12" style={{ backgroundColor: BG }}>
      <main className="mx-auto max-w-4xl px-3 py-4 md:px-5 md:py-5">
        <h1 className="mb-4 text-[22px] font-bold md:text-[26px]" style={{ color: TEXT }}>
          Statistika
        </h1>

        <div className="space-y-4">
          <div
            className="overflow-hidden rounded-[22px] px-3.5 py-3.5 text-white shadow-[0_16px_34px_rgba(255,98,54,0.2)] md:rounded-[24px] md:px-4.5 md:py-4.5"
            style={{
              background:
                'linear-gradient(135deg, #FF8A1E 0%, #FF6A1A 36%, #FF5538 72%, #FF2E52 100%)',
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold tracking-tight text-white/95 md:text-[15px]">
                  Ketma-ket kunlar
                </p>
                <div className="mt-2 flex items-end gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/12 backdrop-blur-sm md:h-11 md:w-11">
                    <Flame className="h-5 w-5 text-white md:h-6 md:w-6" />
                  </div>
                  <div className="leading-none">
                    <div className="text-[28px] font-black tracking-tight md:text-[36px]">
                      {streakLoaded ? streak.streak_days : '—'}
                    </div>
                    <div className="mt-0.5 text-[10px] font-medium text-white/80 md:text-xs">
                      kun ketma-ket
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-0.5 text-right">
                <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-white/60 md:text-[10px]">
                  Oxirgi hafta
                </p>
                <p className="mt-1 text-[10px] font-medium text-white/90 md:text-[12px]">
                  Oxirgi 7 kun faoliyati
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-1.5 md:mt-5 md:gap-2">
              {last7Rotated.map(({ label: d, active }, i) => {
                return (
                  <div key={`${d}-${i}`} className="flex min-w-0 flex-col items-center gap-1.5">
                    <div
                      className="flex h-12 w-full items-center justify-center rounded-[14px] backdrop-blur-sm transition-all duration-300 md:h-14 md:rounded-[16px]"
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
                        <Flame className="h-4 w-4 text-white md:h-5 md:w-5" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-white/35 md:h-2 md:w-2" />
                      )}
                    </div>
                    <div className="truncate text-[11px] font-medium text-white/92 md:text-[12px]">
                      {d}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 md:gap-3">
            {summaryCards.map((card, index) => (
              <div
                key={card.title}
                className="rounded-[18px] border bg-white px-2.5 py-3 text-center shadow-[0_12px_24px_rgba(15,23,42,0.08)] transition-transform duration-200 hover:-translate-y-0.5 md:rounded-[20px] md:px-4 md:py-4"
                style={{ borderColor: BORDER }}
              >
                <div
                  className="mx-auto flex h-8 w-8 items-center justify-center rounded-xl md:h-9 md:w-9"
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
                <p className="mt-2.5 text-[11px] font-medium md:text-xs" style={{ color: TEXT_SECONDARY }}>
                  {card.title}
                </p>
                <p className="mt-1.5 text-[28px] font-black tracking-tight md:text-[34px]" style={{ color: TEXT }}>
                  {card.value}
                </p>
                <p className="mt-1.5 text-[10px] leading-tight md:text-[12px]" style={{ color: '#7C879B' }}>
                  {card.subtitle}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.08fr,0.92fr]">
            <div
              className="rounded-[20px] border bg-white p-4 shadow-[0_12px_26px_rgba(15,23,42,0.06)] md:rounded-[22px] md:p-5"
              style={{ borderColor: BORDER }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-100 text-teal-600 md:h-9 md:w-9">
                  <Target className="h-4 w-4 md:h-[18px] md:w-[18px]" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold md:text-[15px]" style={{ color: TEXT }}>Javoblar aniqligi</h2>
                  <p className="text-[11px] md:text-xs" style={{ color: TEXT_SECONDARY }}>
                    Dars vazifalari bo‘yicha umumiy natija
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative h-20 w-20 shrink-0 md:h-24 md:w-24">
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
                    className="absolute inset-0 flex items-center justify-center text-base font-black md:text-xl"
                    style={{ color: TEXT }}
                  >
                    {accuracyPercent}%
                  </span>
                </div>
                <div className="grid flex-1 gap-2.5 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 px-3 py-3">
                    <p className="text-[10px] uppercase tracking-[0.14em]" style={{ color: TEXT_SECONDARY }}>
                      To‘g‘ri
                    </p>
                    <p className="mt-1 text-[22px] font-black md:text-[26px]" style={{ color: TEXT }}>
                      {lessonStats.correct}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-3 py-3">
                    <p className="text-[10px] uppercase tracking-[0.14em]" style={{ color: TEXT_SECONDARY }}>
                      Noto‘g‘ri
                    </p>
                    <p className="mt-1 text-[22px] font-black md:text-[26px]" style={{ color: TEXT }}>
                      {wrongCount}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="rounded-[20px] border bg-white p-4 shadow-[0_12px_26px_rgba(15,23,42,0.06)] md:rounded-[22px] md:p-5"
              style={{ borderColor: BORDER }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-600 md:h-9 md:w-9">
                  <Award className="h-4 w-4 md:h-[18px] md:w-[18px]" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold md:text-[15px]" style={{ color: TEXT }}>Yutuqlar</h2>
                  <p className="text-[11px] md:text-xs" style={{ color: TEXT_SECONDARY }}>
                    Siz erishgan milestone-lar
                  </p>
                </div>
              </div>
              <ul className="mt-4 space-y-2">
                {achievements.length > 0 ? (
                  achievements.map((a, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2.5 rounded-2xl bg-slate-50 px-3 py-2.5 text-[13px] md:text-sm"
                      style={{ color: TEXT }}
                    >
                      <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                      {a.text}
                    </li>
                  ))
                ) : (
                  <li className="rounded-2xl bg-slate-50 px-3 py-3 text-[13px] md:text-sm" style={{ color: TEXT_SECONDARY }}>
                    Hali yutuqlar yo&apos;q
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div
            className="rounded-[20px] border bg-white p-4 shadow-[0_12px_26px_rgba(15,23,42,0.06)] md:rounded-[22px] md:p-5"
            style={{ borderColor: BORDER }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-violet-600 md:h-9 md:w-9">
                <RefreshCw className="h-4 w-4 md:h-[18px] md:w-[18px]" />
              </div>
              <div>
                <h2 className="text-sm font-semibold md:text-[15px]" style={{ color: TEXT }}>Bo&apos;limlar progressi</h2>
                <p className="text-[11px] md:text-xs" style={{ color: TEXT_SECONDARY }}>
                  Lug&apos;at bo&apos;yicha DB dagi real progress
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {VOCABULARY_TOPICS.map((topic, index) => {
                const fromApi = topicsProgress.find((t) => t.id === topic.id);
                const total = getTopicWordCount(topic.id);
                const learned = fromApi?.learned_words ?? 0;
                const pct = total > 0 ? Math.round((learned / total) * 100) : 0;
                return (
                  <div
                    key={topic.id}
                    className="rounded-[18px] border border-slate-200 bg-slate-50/70 p-3.5 md:rounded-[20px] md:p-4"
                  >
                    <p
                      className="text-[9px] font-medium uppercase tracking-[0.16em] md:text-[10px]"
                      style={{ color: TEXT_SECONDARY }}
                    >
                      {index + 1}-bo&apos;lim
                    </p>
                    <div className="mt-2 flex items-start justify-between gap-3">
                      <span className="text-[13px] font-semibold md:text-[14px]" style={{ color: TEXT }}>
                        {topic.title}
                      </span>
                      <span className="shrink-0 text-[11px] md:text-[12px]" style={{ color: TEXT_SECONDARY }}>
                        {topicsLoaded ? `${learned} / ${total}` : 'Yuklanmoqda...'}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] md:text-[12px]" style={{ color: TEXT_SECONDARY }}>
                      {topicsLoaded ? `${pct}% o'rganildi` : 'Server ma’lumotlari yuklanmoqda'}
                    </p>
                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white md:h-2">
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
