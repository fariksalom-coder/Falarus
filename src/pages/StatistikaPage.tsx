import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { resolveAssetUrl } from '../api';
import {
  fetchCourseProgress,
  fetchActivityCalendar,
  fetchWeeklyActivity,
  type ActivityCalendar,
  type CourseProgress,
  type WeeklyActivityDay,
} from '../api/stats';
import { fetchStreak, getCachedStreak, type StreakResponse } from '../api/activity';
import { fetchLeaderboard, type LeaderboardResponse, type LeaderboardUser } from '../api/leaderboard';
import { useKunlikProgress } from '../hooks/useKunlikProgress';
import { KunlikTodayStatsCard } from '../components/stats/KunlikTodayStatsCard';
import ActivityCalendarCard from '../components/stats/ActivityCalendarCard';
import AchievementsSection from '../components/achievements/AchievementsSection';
import { Flame } from 'lucide-react';
import { appMainBottomOffsetCss } from '../constants/appLayout';

const BORDER = 'var(--app-border)';
const PRIMARY = 'var(--app-primary)';
const TEXT = 'var(--app-text)';
const TEXT_SECONDARY = 'var(--app-text-muted)';
const EMPTY_STREAK: StreakResponse = {
  streak_days: 0,
  last_7_days: [false, false, false, false, false, false, false],
  best_streak_days: 0,
};

const POINTS_PER_LEVEL = 500;

function levelFromPoints(points: number): { level: number; toNext: number; pctInLevel: number } {
  const level = Math.floor(points / POINTS_PER_LEVEL) + 1;
  const inLevel = points % POINTS_PER_LEVEL;
  const toNext = POINTS_PER_LEVEL - inLevel;
  const pctInLevel = Math.round((inLevel / POINTS_PER_LEVEL) * 100);
  return { level, toNext, pctInLevel };
}

function LevelXpCard({
  points,
  loaded,
}: {
  points: number;
  loaded: boolean;
}) {
  const { level, toNext, pctInLevel } = levelFromPoints(points);
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][level - 1] ?? String(level);
  return (
    <div className="rounded-[22px] bg-pmn-card p-4 shadow-[0_12px_24px_-16px_rgba(15,27,59,0.18)] ring-1 ring-pmn-border">
      <div className="flex items-center gap-3">
        <div
          className="profile-heading flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[14px] text-[20px] text-[#0A1638] shadow-[0_10px_20px_-8px_rgba(212,172,92,0.5)]"
          style={{ background: 'linear-gradient(150deg, #F5D48F 0%, #D4AC5C 55%, #B8873A 100%)' }}
        >
          {roman}
        </div>
        <div className="min-w-0 flex-1">
          <p className="profile-heading text-[19px] leading-tight text-pmn-text">
            {loaded ? `${level}-daraja` : '—'}
          </p>
          <p className="mt-0.5 text-[12px] font-bold text-pmn-text-muted">
            {loaded ? `Keyingi darajaga ${toNext} XP` : ''}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="profile-heading text-[22px] leading-none tabular-nums text-pmn-text">
            {loaded ? points.toLocaleString('ru-RU').replace(/,/g, ' ') : '—'}
          </p>
          <p className="mt-1 text-[10.5px] font-bold uppercase tracking-[0.18em] text-pmn-gold-deep">
            <span aria-hidden>💎</span> Ball
          </p>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#F1E5C0]/40">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${loaded ? pctInLevel : 0}%`,
            background: 'linear-gradient(90deg, #EBD199 0%, #D4AC5C 100%)',
          }}
        />
      </div>
    </div>
  );
}

function MetricTile({
  emoji,
  label,
  value,
  valueSuffix,
  valueColor,
}: {
  emoji: string;
  label: string;
  value: string;
  valueSuffix?: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-[18px] bg-pmn-card p-[14px] shadow-[0_10px_20px_-14px_rgba(15,27,59,0.15)] ring-1 ring-pmn-border">
      <div className="flex items-center gap-2">
        <span className="text-[16px] leading-none">{emoji}</span>
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-pmn-text-muted">{label}</span>
      </div>
      <p
        className="profile-heading mt-2 text-[26px] leading-none text-pmn-text"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
        {valueSuffix ? (
          <span className="text-[15px] font-bold text-pmn-text-soft">{valueSuffix}</span>
        ) : null}
      </p>
    </div>
  );
}

function WeeklyActivityChart({
  last7,
  serverDays,
}: {
  last7: Array<{ label: string; active: boolean }>;
  /** Real per-day activity from backend, oldest → today. If null, falls back to boolean `active`. */
  serverDays: WeeklyActivityDay[] | null;
}) {
  const FALLBACK_H = [30, 44, 22, 60, 40, 46, 55];
  const useServer = serverDays != null && serverDays.length === last7.length;
  const totalMinutes = useServer ? serverDays!.reduce((a, d) => a + d.minutes, 0) : 0;
  const totalLabel = (() => {
    if (!useServer || totalMinutes <= 0) return 'daqiqa / kun';
    if (totalMinutes >= 60) {
      const h = Math.floor(totalMinutes / 60);
      const rem = totalMinutes % 60;
      return rem > 0 ? `${h}s ${rem}m` : `${h} soat`;
    }
    return `${totalMinutes} min`;
  })();
  // When we use server data (dates come in oldest → today order), derive labels
  // straight from those dates so bars align with day-of-week columns.
  const rows: Array<{ label: string; active: boolean; height: number; isToday: boolean; minutes: number }> =
    useServer
      ? serverDays!.map((s, i) => ({
          label: DAY_LABEL_BY_WEEKDAY[new Date(`${s.date}T00:00:00`).getDay()] ?? '',
          active: s.active,
          height: s.height_pct,
          isToday: s.is_today || i === serverDays!.length - 1,
          minutes: s.minutes,
        }))
      : last7.map((d, i) => ({
          label: d.label,
          active: d.active,
          height: d.active ? (i === last7.length - 1 ? 92 : FALLBACK_H[i % FALLBACK_H.length]) : 8,
          isToday: i === last7.length - 1,
          minutes: 0,
        }));

  return (
    <div className="rounded-[20px] bg-pmn-card p-4 shadow-[0_10px_24px_-14px_rgba(15,27,59,0.18)] ring-1 ring-pmn-border">
      <div className="mb-[14px] flex items-center justify-between">
        <p className="profile-heading text-[15px] leading-none text-pmn-text">Haftalik faollik</p>
      </div>
      <div className="flex h-[130px] items-end justify-between gap-2">
        {rows.map(({ label, active, height, isToday, minutes }, i) => {
          const bg =
            isToday && active
              ? 'linear-gradient(180deg, #D4AC5C, #B8873A)'
              : active
                ? 'linear-gradient(180deg, #F5D48F, #E4C88A)'
                : '#F1E5C0';
          const labelColor = isToday && active ? '#B0894A' : active ? '#7A756B' : '#B5AE97';
          const labelWeight = isToday && active ? '900' : '800';
          const minuteText = minutes > 0 ? `${minutes}m` : '';
          const minuteColor = isToday && active ? '#0F1B3B' : active ? '#B0894A' : 'transparent';
          return (
            <div key={`${label}-${i}`} className="flex h-full flex-1 flex-col items-center gap-1">
              {/* Bar container fills the vertical space; bar sits at the bottom and the
                  minute label rides on top of the bar so it moves up/down with height. */}
              <div className="relative flex h-full w-full items-end">
                <div
                  className="relative w-full rounded-t-[8px] rounded-b-[4px]"
                  style={{ height: `${height}%`, background: bg }}
                >
                  {minuteText ? (
                    <span
                      className="absolute left-1/2 -translate-x-1/2 -top-3 text-[10px] font-black leading-none tabular-nums whitespace-nowrap"
                      style={{ color: minuteColor }}
                    >
                      {minuteText}
                    </span>
                  ) : null}
                </div>
              </div>
              <span
                className="text-[10px] leading-none"
                style={{ color: labelColor, fontWeight: labelWeight }}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const DAY_LABEL_BY_WEEKDAY: Record<number, string> = {
  0: 'Ya',
  1: 'Du',
  2: 'Se',
  3: 'Ch',
  4: 'Pa',
  5: 'Ju',
  6: 'Sh',
};


function initialsFrom(user: Pick<LeaderboardUser, 'firstName' | 'lastName'>): string {
  const f = (user.firstName ?? '').trim();
  const l = (user.lastName ?? '').trim();
  const two = ((f[0] ?? '') + (l[0] ?? '')).toUpperCase();
  return two || (f[0] ?? '?').toUpperCase();
}

function displayNameFrom(user: Pick<LeaderboardUser, 'firstName' | 'lastName'>): string {
  const f = (user.firstName ?? '').trim();
  const l = (user.lastName ?? '').trim();
  return `${f} ${l}`.trim() || 'Foydalanuvchi';
}

function LeaderboardAvatar({
  avatarUrl,
  initials,
  className,
  goldFallback = false,
  ringGold = false,
}: {
  avatarUrl: string | null;
  initials: string;
  className: string;
  /** Use gold gradient for the initials fallback (my-rank row). */
  goldFallback?: boolean;
  /** Wrap the image with a gold ring like the podium winner. */
  ringGold?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const resolved = resolveAssetUrl(avatarUrl);
  const ringClass = ringGold ? ' ring-[3px] ring-[#D4AC5C]' : '';
  if (resolved && !broken) {
    return (
      <img
        src={resolved}
        alt={initials}
        onError={() => setBroken(true)}
        className={`rounded-full object-cover shadow-[0_10px_24px_-10px_rgba(15,27,59,0.5)] ${className}${ringClass}`}
        decoding="async"
        loading="lazy"
        referrerPolicy="same-origin"
      />
    );
  }
  return (
    <div
      className={`flex items-center justify-center rounded-full shadow-[0_10px_24px_-10px_rgba(15,27,59,0.5)] ${className}${ringClass}`}
      style={
        goldFallback
          ? { background: 'linear-gradient(150deg, #F5D48F 0%, #D4AC5C 100%)', color: '#0A1638' }
          : { background: 'linear-gradient(150deg, #16244A 0%, #0F1B3B 55%, #0A1638 100%)', color: '#fff' }
      }
    >
      <span className="profile-heading tracking-tight">{initials}</span>
    </div>
  );
}

function PodiumSlot({
  user,
  rank,
  size,
  onClick,
}: {
  user: LeaderboardUser | null;
  rank: 1 | 2 | 3;
  size: 'md' | 'lg';
  onClick?: (userId: number) => void;
}) {
  const isBig = size === 'lg';
  const diameter = isBig ? 'h-[86px] w-[86px] text-[22px]' : 'h-[64px] w-[64px] text-[18px]';
  const initials = user ? initialsFrom(user) : '—';
  const name = user ? displayNameFrom(user) : '';
  const points = user?.points ?? 0;
  const clickable = user != null && onClick != null;
  return (
    <div
      className={`flex flex-col items-center ${clickable ? 'cursor-pointer active:scale-[0.97] transition-transform' : ''}`}
      onClick={clickable ? () => onClick(user.id) : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(user.id);
              }
            }
          : undefined
      }
    >
      <div className="relative">
        {rank === 1 ? (
          <span aria-hidden className="absolute -top-4 left-1/2 -translate-x-1/2 text-[18px]">
            👑
          </span>
        ) : null}
        <LeaderboardAvatar
          avatarUrl={user?.avatarUrl ?? null}
          initials={initials}
          className={diameter}
          ringGold={isBig}
        />
        <span
          className={`absolute -bottom-2 left-1/2 flex h-6 min-w-6 -translate-x-1/2 items-center justify-center rounded-full px-1.5 text-[11px] font-black ring-2 ring-white ${
            rank === 1 ? 'text-[#0A1638]' : rank === 2 ? 'text-white' : 'text-white'
          }`}
          style={{
            background:
              rank === 1
                ? 'linear-gradient(150deg, #F5D48F 0%, #D4AC5C 100%)'
                : rank === 2
                  ? 'linear-gradient(150deg, #B0B8C7 0%, #8892A6 100%)'
                  : 'linear-gradient(150deg, #D8A264 0%, #B0894A 100%)',
          }}
        >
          {rank}
        </span>
      </div>
      <p className="mt-3 max-w-[92px] truncate text-center text-[13px] font-black text-pmn-text">
        {name || ' '}
      </p>
      <p className="mt-0.5 text-[12px] font-bold text-pmn-gold-deep">
        <span aria-hidden>🔥</span> {points.toLocaleString('ru-RU').replace(/,/g, ' ')}
      </p>
    </div>
  );
}

function ReytingSection({
  data,
  loading,
  onUserClick,
}: {
  data: LeaderboardResponse | null;
  loading: boolean;
  onUserClick: (userId: number) => void;
}) {
  const top = data?.top ?? [];
  const first = top[0] ?? null;
  const second = top[1] ?? null;
  const third = top[2] ?? null;
  // Show the top 10 always (podium + 4-10). Ranks 11+ live inside a bounded
  // scroll container below so the Statistika page stays a fixed length.
  const rest = top.slice(3, 10);
  const overflow = top.slice(10);
  const myRank = data?.myRank ?? null;
  const meInTop10 = myRank ? myRank.rank <= 10 : false;
  // If the user is ranked below top 10 but shows up somewhere in the overflow
  // slice, we hide the inline duplicate — their sticky row already represents
  // them at the bottom.
  const overflowFiltered = myRank
    ? overflow.filter((u) => u.id !== myRank.id)
    : overflow;

  return (
    <section className="rounded-[22px] bg-pmn-card p-5 shadow-[0_12px_28px_-16px_rgba(15,27,59,0.18)] ring-1 ring-pmn-border">
      <div className="flex items-center justify-between gap-3">
        <h2 className="profile-heading text-[22px] leading-tight text-pmn-text">Reyting</h2>
        <span
          className="rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em]"
          style={{
            background: 'linear-gradient(150deg, #F5D48F 0%, #D4AC5C 100%)',
            color: '#3B2A0A',
            boxShadow: '0 6px 14px -6px rgba(212,172,92,0.55)',
          }}
        >
          Umumiy
        </span>
      </div>

      {/* Podium */}
      <div className="mt-6 grid grid-cols-3 items-end gap-2 pb-2">
        <div className="flex justify-center pt-3">
          <PodiumSlot user={second} rank={2} size="md" onClick={onUserClick} />
        </div>
        <div className="flex justify-center">
          <PodiumSlot user={first} rank={1} size="lg" onClick={onUserClick} />
        </div>
        <div className="flex justify-center pt-3">
          <PodiumSlot user={third} rank={3} size="md" onClick={onUserClick} />
        </div>
      </div>

      {/* Rest of list — every remaining user with points */}
      {rest.length > 0 ? (
        <div className="mt-5 space-y-2">
          {rest.map((u, i) => (
            <button
              key={u.id}
              type="button"
              onClick={() => onUserClick(u.id)}
              className="flex w-full items-center gap-3 rounded-[14px] bg-pmn-inset px-3 py-2.5 text-left ring-1 ring-pmn-inset-border transition-transform active:scale-[0.99]"
            >
              <span className="w-6 shrink-0 text-center text-[13px] font-black text-pmn-text-soft">
                {u.rank ?? i + 4}
              </span>
              <LeaderboardAvatar
                avatarUrl={u.avatarUrl ?? null}
                initials={initialsFrom(u)}
                className="h-9 w-9 text-[12px]"
              />
              <p className="min-w-0 flex-1 truncate text-[13.5px] font-bold text-pmn-text">
                {displayNameFrom(u)}
              </p>
              <p className="shrink-0 text-[13px] font-black text-pmn-gold-deep">
                <span aria-hidden>🔥</span> {u.points.toLocaleString('ru-RU').replace(/,/g, ' ')}
              </p>
            </button>
          ))}
        </div>
      ) : null}

      {/* Overflow (ranks 11+) scrolls inside a bounded container.
          The current user's row is sticky-pinned to the bottom so it stays
          visible while the user scrolls through everyone else. */}
      {overflowFiltered.length > 0 || (myRank && !meInTop10) ? (
        <div
          className="mt-3 max-h-[320px] space-y-2 overflow-y-auto rounded-[14px] border border-[#EEF1F6] bg-[#FBFCFE] p-2"
          style={{ scrollbarWidth: 'thin' }}
        >
          {overflowFiltered.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => onUserClick(u.id)}
              className="flex w-full items-center gap-3 rounded-[12px] bg-pmn-card px-3 py-2.5 text-left ring-1 ring-pmn-inset-border transition-transform active:scale-[0.99]"
            >
              <span className="w-8 shrink-0 text-center text-[13px] font-black text-pmn-text-soft">
                {u.rank}
              </span>
              <LeaderboardAvatar
                avatarUrl={u.avatarUrl ?? null}
                initials={initialsFrom(u)}
                className="h-9 w-9 text-[12px]"
              />
              <p className="min-w-0 flex-1 truncate text-[13.5px] font-bold text-pmn-text">
                {displayNameFrom(u)}
              </p>
              <p className="shrink-0 text-[13px] font-black text-pmn-gold-deep">
                <span aria-hidden>🔥</span> {u.points.toLocaleString('ru-RU').replace(/,/g, ' ')}
              </p>
            </button>
          ))}

          {myRank && !meInTop10 ? (
            <div
              className="sticky bottom-0 flex items-center gap-3 rounded-[12px] px-3 py-2.5 ring-1 ring-[#D4AC5C]/50"
              style={{
                background: 'linear-gradient(90deg, #F5D48F, #E9C078)',
                boxShadow: '0 -8px 18px -10px rgba(212,172,92,0.55)',
              }}
            >
              <span className="w-8 shrink-0 text-center text-[13px] font-black text-[#3B2A0A]">
                {myRank.rank}
              </span>
              <LeaderboardAvatar
                avatarUrl={myRank.avatarUrl ?? null}
                initials={initialsFrom(myRank)}
                className="h-9 w-9 text-[12px]"
                goldFallback
              />
              <p className="min-w-0 flex-1 truncate text-[13.5px] font-black text-[#3B2A0A]">
                Siz · {displayNameFrom(myRank)}
              </p>
              <p className="shrink-0 text-[13px] font-black text-[#3B2A0A]">
                <span aria-hidden>🔥</span> {myRank.points.toLocaleString('ru-RU').replace(/,/g, ' ')}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {loading && top.length === 0 ? (
        <p className="mt-4 text-center text-[12.5px] font-semibold text-pmn-text-soft">Yuklanmoqda…</p>
      ) : null}
      {!loading && top.length === 0 ? (
        <p className="mt-4 text-center text-[12.5px] font-semibold text-pmn-text-soft">
          Reyting bo'sh
        </p>
      ) : null}
    </section>
  );
}

export default function StatistikaPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { t } = useLocale();
  const { rows } = useKunlikProgress();

  // --- Streak ---
  const [streak, setStreak] = useState<StreakResponse>(() => getCachedStreak() ?? EMPTY_STREAK);
  const [streakLoaded, setStreakLoaded] = useState<boolean>(() => getCachedStreak() != null);
  useEffect(() => {
    if (!token) { setStreak(EMPTY_STREAK); setStreakLoaded(true); return; }
    const cached = getCachedStreak();
    if (cached) { setStreak(cached); setStreakLoaded(true); }
    else setStreakLoaded(false);
    fetchStreak(token).then((data) => {
      if (data) setStreak(data);
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

  // --- Points / level (all-time leaderboard) ---
  const [points, setPoints] = useState(0);
  const [pointsLoaded, setPointsLoaded] = useState(false);
  useEffect(() => {
    if (!token) { setPointsLoaded(true); return; }
    fetchLeaderboard(token, 'all')
      .then((res) => {
        setPoints(res.myRank?.points ?? 0);
      })
      .finally(() => setPointsLoaded(true));
  }, [token]);

  // --- Weekly activity (real per-day points) ---
  const [weeklyActivity, setWeeklyActivity] = useState<WeeklyActivityDay[] | null>(null);
  useEffect(() => {
    if (!token) { setWeeklyActivity(null); return; }
    fetchWeeklyActivity(token).then((res) => {
      if (res?.days?.length === 7) setWeeklyActivity(res.days);
      else setWeeklyActivity(null);
    });
  }, [token]);

  // --- Reyting (Umumiy leaderboard) ---
  const [reyting, setReyting] = useState<LeaderboardResponse | null>(null);
  const [reytingLoading, setReytingLoading] = useState(false);
  useEffect(() => {
    if (!token) { setReyting({ top: [], myRank: null }); return; }
    setReytingLoading(true);
    fetchLeaderboard(token, 'all')
      .then((res) => setReyting(res))
      .finally(() => setReytingLoading(false));
  }, [token]);

  // --- Derived metric tiles ---
  const kunlikMetrics = useMemo(() => {
    let wordsLearned = 0;
    let wordsCorrect = 0;
    let readingDoneDays = 0;
    rows.forEach((row) => {
      wordsLearned += row.words_learned ?? 0;
      wordsCorrect += row.words_correct ?? 0;
      if (row.oqish_done) readingDoneDays += 1;
    });
    // words_correct is a running tally across re-tests, so it can exceed
    // words_learned. Clamp to 100 % so accuracy stays semantically valid.
    const rawAccuracy = wordsLearned > 0 ? Math.round((wordsCorrect / wordsLearned) * 100) : 0;
    const accuracy = Math.min(100, rawAccuracy);
    // Reading time estimate: ~5 min per completed reading. Format compact: "6s 20d" for hours+minutes.
    const readingMinutes = readingDoneDays * 5;
    return { wordsLearned, accuracy, readingMinutes };
  }, [rows]);

  // Total time on the platform since registration (users.total_time_seconds).
  // Falls back to an estimate derived from oqish_done days if the migrated
  // backend hasn't returned real seconds yet.
  const readingTimeLabel = useMemo(() => {
    const seconds = streak.total_seconds ?? 0;
    const useReal = seconds > 0;
    const m = useReal ? Math.floor(seconds / 60) : kunlikMetrics.readingMinutes;
    if (m <= 0) return '0 min';
    const days = Math.floor(m / (60 * 24));
    const remAfterDays = m - days * 60 * 24;
    const h = Math.floor(remAfterDays / 60);
    const rem = remAfterDays % 60;
    if (days > 0) return `${days}k ${h}s`;
    if (h > 0) return `${h}s ${rem}m`;
    return `${rem} min`;
  }, [streak.total_seconds, kunlikMetrics.readingMinutes]);

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
    <div className="profile-premium min-h-screen" style={{ paddingBottom: `calc(${appMainBottomOffsetCss()} + 24px)` }}>
      <main className="mx-auto max-w-4xl px-4 py-4 md:px-5 md:py-5">
        <h1 className="profile-heading mb-4 text-[28px] leading-none text-pmn-text md:text-[32px]">
          {t('stats.title')}
        </h1>

        <div className="space-y-4">
          <>
              {/* Streak card — navy passport style with gold guilloche + gold flame chips */}
              <div className="profile-guilloche relative overflow-hidden rounded-[24px] px-5 py-5 text-white shadow-[0_22px_44px_-18px_rgba(15,27,59,0.55)]">
                <div className="relative z-[2] flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.24em] text-[#D4AC5C]">
                      Bu hafta <span aria-hidden>🔥</span>
                    </p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="profile-heading text-[42px] leading-none text-white sm:text-[46px]">
                        {streakLoaded ? streak.last_7_days.filter(Boolean).length : '—'}
                      </span>
                      <span className="text-[13px] font-bold text-white/70">/ 7 kun kirdingiz</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#D4AC5C]">
                      Eng yaxshi
                    </p>
                    <p className="profile-heading mt-1 text-[22px] leading-none text-white">
                      {Math.max(streak.streak_days ?? 0, streak.best_streak_days ?? 0)} kun
                    </p>
                  </div>
                </div>

                <div className="relative z-[2] mt-4 grid grid-cols-7 gap-1.5">
                  {last7Rotated.map(({ label: d, active }, i) => (
                    <div key={`${d}-${i}`} className="flex min-w-0 flex-col items-center gap-1.5">
                      <div
                        className={`flex h-12 w-full items-center justify-center rounded-[13px] transition-all ${
                          active
                            ? 'text-[#0A1638] shadow-[0_10px_20px_-8px_rgba(212,172,92,0.5)]'
                            : 'bg-pmn-card/10 text-white/40 ring-1 ring-white/15'
                        }`}
                        style={
                          active
                            ? { background: 'linear-gradient(150deg, #F5D48F 0%, #D4AC5C 100%)' }
                            : undefined
                        }
                      >
                        {active ? (
                          <span aria-hidden className="text-[18px]">🔥</span>
                        ) : (
                          <Flame className="h-5 w-5 text-white/30" strokeWidth={2} aria-hidden />
                        )}
                      </div>
                      <div className={`truncate text-[11px] font-black uppercase tracking-[0.06em] ${active ? 'text-[#D4AC5C]' : 'text-white/50'}`}>
                        {d}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Level + XP */}
              <LevelXpCard points={points} loaded={pointsLoaded} />

              {/* Metric tiles */}
              <div className="grid grid-cols-2 gap-[11px]">
                <MetricTile emoji="📚" label="So'zlar" value={kunlikMetrics.wordsLearned.toString()} />
                <MetricTile
                  emoji="⏱️"
                  label="O'qish vaqti"
                  value={readingTimeLabel}
                />
              </div>

              {/* Weekly activity chart */}
              <WeeklyActivityChart last7={last7Rotated} serverDays={weeklyActivity} />

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

              {/* Yutuqlar — streak + words medals */}
              <AchievementsSection token={token} />

              {/* Reyting — Umumiy */}
              <ReytingSection
                data={reyting}
                loading={reytingLoading}
                onUserClick={(id) => navigate(`/u/${id}`)}
              />

          </>
        </div>
      </main>
    </div>
  );
}
