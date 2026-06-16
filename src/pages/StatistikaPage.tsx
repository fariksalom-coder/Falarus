import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import {
  fetchCourseProgress,
  fetchActivityCalendar,
  type ActivityCalendar,
  type CourseProgress,
} from '../api/stats';
import { fetchStreak, getCachedStreak, type StreakResponse } from '../api/activity';
import LeaderboardList from '../components/leaderboard/LeaderboardList';
import UserRankCard from '../components/leaderboard/UserRankCard';
import { KunlikTodayStatsCard } from '../components/stats/KunlikTodayStatsCard';
import ActivityCalendarCard from '../components/stats/ActivityCalendarCard';
import {
  BookOpen,
  ChevronRight,
  Flame,
  Award,
  Trophy,
  Star,
  Zap,
} from 'lucide-react';
import { appMainBottomOffsetCss } from '../constants/appLayout';

const BG = 'var(--app-bg)';
const BORDER = 'var(--app-border)';
const PRIMARY = 'var(--app-primary)';
const TEXT = 'var(--app-text)';
const TEXT_SECONDARY = 'var(--app-text-muted)';
const EMPTY_STREAK: StreakResponse = {
  streak_days: 0,
  last_7_days: [false, false, false, false, false, false, false],
};
const TAB_TRACK_BG = 'linear-gradient(180deg, #EFF6FF 0%, #EAF2FF 100%)';

const DAY_LABEL_BY_WEEKDAY: Record<number, string> = {
  0: 'Ya',
  1: 'Du',
  2: 'Se',
  3: 'Ch',
  4: 'Pa',
  5: 'Ju',
  6: 'Sh',
};

// Milestone badges (streak days)
const MILESTONES = [
  { days: 3, icon: Flame, color: '#F97316', bg: '#FFF7ED' },
  { days: 10, icon: Zap, color: '#EAB308', bg: '#FEFCE8' },
  { days: 30, icon: Star, color: '#8B5CF6', bg: '#F5F3FF' },
  { days: 45, icon: Award, color: '#EC4899', bg: '#FDF2F8' },
  { days: 60, icon: Trophy, color: '#0EA5E9', bg: '#F0F9FF' },
  { days: 100, icon: Star, color: '#2563EB', bg: '#EFF6FF' },
  { days: 182, icon: Trophy, color: '#059669', bg: '#ECFDF5' },
];

function MilestoneAchievements({
  streakDays,
  t,
}: {
  streakDays: number;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  return (
    <div
      className="rounded-[20px] border bg-app-surface p-4 shadow-app-soft md:rounded-[22px] md:p-5"
      style={{ borderColor: BORDER }}
    >
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300 md:h-9 md:w-9">
          <Trophy className="h-4 w-4 md:h-[18px] md:w-[18px]" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-app-text md:text-[15px]">{t('stats.milestonesTitle')}</h2>
          <p className="text-[12px] text-app-text-muted md:text-xs">{t('stats.milestonesSub')}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {MILESTONES.map((m) => {
          const earned = streakDays >= m.days;
          const Icon = m.icon;
          return (
            <div
              key={m.days}
              className={`flex flex-col items-center gap-1.5 rounded-[14px] p-2.5 text-center ${
                earned ? '' : 'bg-app-bg-subtle dark:bg-white/5'
              }`}
              style={earned ? { background: m.bg } : undefined}
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                  earned ? '' : 'bg-app-border dark:bg-white/10'
                }`}
                style={earned ? { background: m.color } : undefined}
              >
                <Icon className={`h-4 w-4 ${earned ? 'text-white' : 'text-app-icon-fg'}`} />
              </div>
              <span
                className={`text-[11px] font-bold leading-tight ${
                  earned ? '' : 'text-app-icon-fg'
                }`}
                style={earned ? { color: m.color } : undefined}
              >
                {t('stats.kunlikDay', { day: m.days })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function StatistikaPage() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { t } = useLocale();

  // --- Streak ---
  const [streak, setStreak] = useState<StreakResponse>(() => getCachedStreak() ?? EMPTY_STREAK);
  const [streakLoaded, setStreakLoaded] = useState<boolean>(() => getCachedStreak() != null);
  useEffect(() => {
    if (!token) { setStreak(EMPTY_STREAK); setStreakLoaded(true); return; }
    const cached = getCachedStreak();
    if (cached) { setStreak(cached); setStreakLoaded(true); }
    else setStreakLoaded(false);
    fetchStreak(token).then((data) => {
      if (data) setStreak({ streak_days: data.streak_days, last_7_days: data.last_7_days });
      setStreakLoaded(true);
    });
  }, [token]);

  // --- Course progress ---
  const [courseProgress, setCourseProgress] = useState<CourseProgress | null>(null);
  const [courseLoaded, setCourseLoaded] = useState(false);
  useEffect(() => {
    if (!token) { setCourseLoaded(true); return; }
    fetchCourseProgress(token).then((data) => {
      if (data) setCourseProgress(data);
      setCourseLoaded(true);
    });
  }, [token]);

  // --- Activity calendar ---
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth() + 1);
  const [calendar, setCalendar] = useState<ActivityCalendar | null>(null);
  const [calLoading, setCalLoading] = useState(true);
  useEffect(() => {
    setCalLoading(true);
    fetchActivityCalendar(token, calYear, calMonth).then((data) => {
      setCalendar(data);
      setCalLoading(false);
    });
  }, [token, calYear, calMonth]);

  const prevMonth = () => {
    if (calMonth === 1) { setCalYear((y) => y - 1); setCalMonth(12); }
    else setCalMonth((m) => m - 1);
  };
  const nextMonth = () => {
    const now = new Date();
    const isCurrentMonth = calYear === now.getFullYear() && calMonth === now.getMonth() + 1;
    if (isCurrentMonth) return;
    if (calMonth === 12) { setCalYear((y) => y + 1); setCalMonth(1); }
    else setCalMonth((m) => m + 1);
  };

  // Monday-first 7-day streak rotation
  const last7Rotated = useMemo(() => {
    const today = new Date();
    const dates = Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - idx));
      return d;
    });
    const mondayPos = dates.findIndex((d) => d.getDay() === 1);
    const shift = mondayPos >= 0 ? mondayPos : 0;
    return Array.from({ length: 7 }, (_, newIdx) => {
      const oldIdx = (shift + newIdx) % 7;
      return {
        label: DAY_LABEL_BY_WEEKDAY[dates[oldIdx].getDay()] ?? '',
        active: streak.last_7_days[oldIdx] === true,
      };
    });
  }, [streak.last_7_days]);

  return (
    <div className="min-h-screen bg-app-bg" style={{ paddingBottom: `calc(${appMainBottomOffsetCss()} + 24px)` }}>
      <main className="mx-auto max-w-4xl px-3 py-4 md:px-5 md:py-5">
        <h1 className="mb-4 text-[22px] font-bold text-app-text md:text-[26px]">{t('stats.title')}</h1>

        <div className="space-y-4">
          <>
              {/* Streak card */}
              <div
                className="overflow-hidden rounded-[22px] px-3.5 py-3.5 text-white shadow-[0_16px_34px_rgba(255,98,54,0.2)] md:rounded-[24px] md:px-4.5 md:py-4.5"
                style={{ background: 'linear-gradient(135deg, #FF8A1E 0%, #FF6A1A 36%, #FF5538 72%, #FF2E52 100%)' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-semibold tracking-tight text-white/95 md:text-[15px]">
                      {t('stats.streakTitle')}
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
                          {t('stats.streakDays', { days: streak.streak_days })}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="pt-0.5 text-right">
                    <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-white/60 md:text-[10px]">
                      {t('stats.lastWeek')}
                    </p>
                    <p className="mt-1 text-[10px] font-medium text-white/90 md:text-[12px]">
                      {t('stats.last7Days')}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-7 gap-1.5 md:mt-5 md:gap-2">
                  {last7Rotated.map(({ label: d, active }, i) => (
                    <div key={`${d}-${i}`} className="flex min-w-0 flex-col items-center gap-1.5">
                      <div
                        className="flex h-12 w-full items-center justify-center rounded-[14px] backdrop-blur-sm transition-all duration-300 md:h-14 md:rounded-[16px]"
                        style={{
                          backgroundColor: active ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.12)',
                          boxShadow: active ? 'inset 0 1px 0 rgba(255,255,255,0.15)' : 'inset 0 1px 0 rgba(255,255,255,0.05)',
                        }}
                      >
                        {active
                          ? <Flame className="h-4 w-4 text-white md:h-5 md:w-5" />
                          : <span className="h-1.5 w-1.5 rounded-full bg-white/35 md:h-2 md:w-2" />
                        }
                      </div>
                      <div className="truncate text-[11px] font-medium text-white/92 md:text-[12px]">{d}</div>
                    </div>
                  ))}
                </div>
              </div>

              <ActivityCalendarCard
                calendar={calendar}
                loading={calLoading}
                year={calYear}
                month={calMonth}
                onPrev={prevMonth}
                onNext={nextMonth}
                onMonthChange={(y, m) => {
                  const n = new Date();
                  const maxY = n.getFullYear();
                  const maxM = n.getMonth() + 1;
                  if (y > maxY || (y === maxY && m > maxM)) return;
                  setCalYear(y);
                  setCalMonth(m);
                }}
              />

              <KunlikTodayStatsCard token={token} />

              {/* Course progress card */}
              <div
                className="overflow-hidden rounded-[22px] border bg-app-surface shadow-app-soft md:rounded-[24px]"
                style={{ borderColor: BORDER }}
              >
                <div
                  className="px-4 py-3.5"
                  style={{ background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 60%, #60A5FA 100%)' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20">
                        <BookOpen className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-white">{t('stats.courseTitle')}</p>
                        <p className="text-[11px] text-blue-100">{t('stats.courseSubtitle')}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/')}
                      className="flex items-center gap-1 rounded-xl bg-white/20 px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-white/30"
                    >
                      {t('stats.courseContinue')}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="px-4 py-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[28px] font-black" style={{ color: TEXT }}>
                        {courseLoaded ? (courseProgress?.completed_days ?? 0) : '—'}
                      </span>
                      <span className="ml-1 text-[14px] font-medium" style={{ color: TEXT_SECONDARY }}>
                        {t('stats.courseTotalDays')}
                      </span>
                    </div>
                    <div
                      className="rounded-full px-3 py-1 text-[12px] font-bold"
                      style={{
                        background: 'var(--app-icon-bg)',
                        color: PRIMARY,
                      }}
                    >
                      {courseLoaded ? `${courseProgress?.pct ?? 0}%` : '—'}
                    </div>
                  </div>
                  <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-app-bg-subtle">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: courseLoaded ? `${Math.max(courseProgress?.pct ?? 0, courseProgress && courseProgress.completed_days > 0 ? 1 : 0)}%` : '0%',
                        background: 'linear-gradient(90deg, #2563EB 0%, #60A5FA 100%)',
                      }}
                    />
                  </div>
                  <p className="mt-2 text-[13px] font-medium text-app-icon-fg">
                    {courseLoaded && courseProgress && courseProgress.completed_days > 0
                      ? t('stats.courseDaysLeft', { days: 182 - Math.min(courseProgress.completed_days, 182) })
                      : t('stats.courseNotStarted')}
                  </p>
                </div>
              </div>

              {/* Milestone achievements */}
              <MilestoneAchievements streakDays={streak.streak_days} t={t} />

          </>
        </div>
      </main>
    </div>
  );
}
