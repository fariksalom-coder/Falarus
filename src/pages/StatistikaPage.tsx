import { useEffect, useMemo, useState, type UIEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { resolveAssetUrl } from '../api';
import {
  fetchActivityCalendar,
  fetchWeeklyActivity,
  type ActivityCalendar,
  type WeeklyActivityDay,
} from '../api/stats';
import { fetchStreak, getCachedStreak, type StreakResponse } from '../api/activity';
import { fetchLeaderboard, getCachedLeaderboard, type LeaderboardResponse, type LeaderboardUser } from '../api/leaderboard';
import { useKunlikProgress } from '../hooks/useKunlikProgress';
import { KunlikTodayStatsCard } from '../components/stats/KunlikTodayStatsCard';
import ActivityCalendarCard from '../components/stats/ActivityCalendarCard';
import AchievementsSection from '../components/achievements/AchievementsSection';
import { Check, BookOpen, Clock3 } from 'lucide-react';
import { FitTabPanel, FitTabs, useFitScreenPanel, type FitTab } from '../components/ui/FitScreen';

type StatsTab = 'umumiy' | 'bugun' | 'taqvim' | 'yutuqlar' | 'reyting';

const STATS_TABS: FitTab<StatsTab>[] = [
  { key: 'umumiy', label: 'Umumiy' },
  { key: 'bugun', label: 'Bugun' },
  { key: 'taqvim', label: 'Taqvim' },
  { key: 'yutuqlar', label: 'Yutuqlar' },
  { key: 'reyting', label: 'Reyting' },
];
const STATS_TAB_KEY = 'falarus:stats-tab';

function readStatsTab(): StatsTab {
  try {
    const v = sessionStorage.getItem(STATS_TAB_KEY);
    if (v && STATS_TABS.some((tab) => tab.key === v)) return v as StatsTab;
  } catch {
    /* storage yo'q */
  }
  return 'umumiy';
}

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
    <div className="shrink-0 rounded-[20px] bg-pmn-card px-4 py-3 shadow-[0_12px_24px_-16px_rgba(15,27,59,0.18)] ring-1 ring-pmn-border">
      <div className="flex items-center gap-3">
        <div
          className="profile-heading flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[14px] text-[20px] text-[#0A1638] shadow-[0_10px_20px_-8px_rgba(212,172,92,0.5)]"
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
            Ball
          </p>
        </div>
      </div>
      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-app-bg-subtle">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${loaded ? pctInLevel : 0}%`,
            background: 'var(--app-primary)',
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
  emoji: React.ReactNode;
  label: string;
  value: string;
  valueSuffix?: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-[18px] bg-pmn-card px-[14px] py-3 shadow-[0_10px_20px_-14px_rgba(15,27,59,0.15)] ring-1 ring-pmn-border">
      <div className="flex items-center gap-2">
        <span className="text-[16px] leading-none">{emoji}</span>
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-pmn-text-muted">{label}</span>
      </div>
      <p
        className="profile-heading mt-1.5 text-[24px] leading-none text-pmn-text"
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
    <div className="fit-grow rounded-[20px] bg-pmn-card px-4 pb-3 pt-3.5 shadow-[0_10px_24px_-14px_rgba(15,27,59,0.18)] ring-1 ring-pmn-border">
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <p className="profile-heading text-[15px] leading-none text-pmn-text">Haftalik faollik</p>
      </div>
      <div className="flex min-h-[88px] flex-1 items-end justify-between gap-2 pt-2">
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
          const minuteColor = isToday && active ? 'var(--app-text)' : active ? '#B0894A' : 'transparent';
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
  const diameter = isBig ? 'h-[70px] w-[70px] text-[20px]' : 'h-[54px] w-[54px] text-[16px]';
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
            № 1
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
      <p className="mt-2.5 max-w-[96px] truncate text-center text-[13px] font-black text-pmn-text">
        {name || ' '}
      </p>
      <p className="mt-0.5 text-[12px] font-bold text-pmn-gold-deep">
        <span aria-hidden>·</span> {points.toLocaleString('ru-RU').replace(/,/g, ' ')}
      </p>
    </div>
  );
}

function LeaderRow({
  user,
  rank,
  onClick,
}: {
  user: LeaderboardUser;
  rank: number;
  onClick: (userId: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(user.id)}
      className="flex w-full shrink-0 items-center gap-3 rounded-[14px] bg-pmn-inset px-3 py-2 text-left ring-1 ring-pmn-inset-border transition-transform active:scale-[0.99]"
    >
      <span className="w-7 shrink-0 text-center text-[13px] font-black text-pmn-text-soft">{rank}</span>
      <LeaderboardAvatar
        avatarUrl={user.avatarUrl ?? null}
        initials={initialsFrom(user)}
        className="h-9 w-9 text-[12px]"
      />
      <p className="min-w-0 flex-1 truncate text-[13.5px] font-bold text-pmn-text">{displayNameFrom(user)}</p>
      <p className="shrink-0 text-[13px] font-black text-pmn-gold-deep">
        <span aria-hidden>·</span> {user.points.toLocaleString('ru-RU').replace(/,/g, ' ')}
      </p>
    </button>
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
  const myRank = data?.myRank ?? null;
  // Top-3 — podiumda; qolganlari ro'yxat ichida (faqat ro'yxat skroll qiladi).
  // Foydalanuvchi top-10 dan pastda bo'lsa, uning qatori pastga mahkamlanadi.
  const meInTop10 = myRank ? myRank.rank <= 10 : false;
  const pinMe = Boolean(myRank && !meInTop10);
  const listRows = top
    .slice(3)
    .filter((u) => !(pinMe && myRank && u.id === myRank.id));
  // Server 2000 tagacha qaytaradi — hammasini birdan chizish tabni 3-4 soniya qotiradi.
  // Avval 40 ta, pastga surilgan sari 60 tadan qo'shiladi.
  const [visibleRows, setVisibleRows] = useState(40);
  const onListScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (visibleRows < listRows.length && el.scrollTop + el.clientHeight > el.scrollHeight - 400) {
      setVisibleRows((n) => Math.min(n + 60, listRows.length));
    }
  };

  return (
    <section className="fit-grow rounded-[22px] bg-pmn-card px-4 pb-3 pt-3.5 shadow-[0_12px_28px_-16px_rgba(15,27,59,0.18)] ring-1 ring-pmn-border">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <h2 className="profile-heading text-[20px] leading-tight text-pmn-text">Reyting</h2>
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
      <div className="mt-4 grid shrink-0 grid-cols-3 items-end gap-2 pb-1">
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

      {listRows.length > 0 ? (
        <div
          className="mt-3 flex min-h-[60px] flex-1 flex-col gap-2 overflow-y-auto overscroll-contain rounded-[14px]"
          style={{ scrollbarWidth: 'thin' }}
          onScroll={onListScroll}
        >
          {listRows.slice(0, visibleRows).map((u, i) => (
            <LeaderRow key={u.id} user={u} rank={u.rank ?? i + 4} onClick={onUserClick} />
          ))}
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {pinMe && myRank ? (
        <div
          className="mt-2 flex shrink-0 items-center gap-3 rounded-[12px] px-3 py-2 ring-1 ring-[#D4AC5C]/50"
          style={{
            background: 'linear-gradient(90deg, #F5D48F, #E9C078)',
            boxShadow: '0 -8px 18px -10px rgba(212,172,92,0.55)',
          }}
        >
          <span className="w-7 shrink-0 text-center text-[13px] font-black text-[#3B2A0A]">{myRank.rank}</span>
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
            <span aria-hidden>·</span> {myRank.points.toLocaleString('ru-RU').replace(/,/g, ' ')}
          </p>
        </div>
      ) : null}

      {loading && top.length === 0 ? (
        <p className="mt-3 text-center text-[12.5px] font-semibold text-pmn-text-soft">Yuklanmoqda…</p>
      ) : null}
      {!loading && top.length === 0 ? (
        <p className="mt-3 text-center text-[12.5px] font-semibold text-pmn-text-soft">
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

  // --- Weekly activity (real per-day points) ---
  const [weeklyActivity, setWeeklyActivity] = useState<WeeklyActivityDay[] | null>(null);
  useEffect(() => {
    if (!token) { setWeeklyActivity(null); return; }
    fetchWeeklyActivity(token).then((res) => {
      if (res?.days?.length === 7) setWeeklyActivity(res.days);
      else setWeeklyActivity(null);
    });
  }, [token]);

  // --- Reyting (Umumiy leaderboard) — ball/daraja ham shu javobdan olinadi ---
  // Keshdagi oxirgi reyting darhol ko'rsatiladi, yangisi fonda yuklanadi.
  const [reyting, setReyting] = useState<LeaderboardResponse | null>(() => getCachedLeaderboard(token, 'all'));
  const [reytingLoading, setReytingLoading] = useState(false);
  useEffect(() => {
    if (!token) { setReyting({ top: [], myRank: null }); return; }
    let cancelled = false;
    const cached = getCachedLeaderboard(token, 'all');
    if (cached) setReyting(cached);
    setReytingLoading(!cached);
    fetchLeaderboard(token, 'all')
      .then((res) => { if (!cancelled && (!res.error || !cached)) setReyting(res); })
      .finally(() => { if (!cancelled) setReytingLoading(false); });
    return () => { cancelled = true; };
  }, [token]);
  const points = reyting?.myRank?.points ?? 0;
  const pointsLoaded = reyting !== null;

  // --- Bir ekranli tuzilma ---
  const fitRef = useFitScreenPanel<HTMLDivElement>();
  const [tab, setTab] = useState<StatsTab>(readStatsTab);
  // Bir marta ochilgan tab yashirin holda saqlanadi — qayta o'tishda qayta qurilmaydi va qayta yuklanmaydi.
  const [visited, setVisited] = useState<Set<StatsTab>>(() => new Set([tab]));
  // Birinchi ekran chizilgach, qolgan tablar fonda (yashirin) tayyorlanadi — bosilganda darhol ochiladi.
  useEffect(() => {
    const timer = window.setTimeout(() => setVisited(new Set(STATS_TABS.map((item) => item.key))), 300);
    return () => window.clearTimeout(timer);
  }, []);
  const changeTab = (next: StatsTab) => {
    setTab(next);
    setVisited((prev) => (prev.has(next) ? prev : new Set(prev).add(next)));
    try {
      sessionStorage.setItem(STATS_TAB_KEY, next);
    } catch {
      /* storage yo'q */
    }
  };

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
    <div ref={fitRef} className="profile-premium fit-screen">
      <div className="fit-screen-title">
        <h1>{t('stats.title')}</h1>
      </div>

      <FitTabs tabs={STATS_TABS} active={tab} onChange={changeTab} idPrefix="stats" label={t('stats.title')} />

      {visited.has('umumiy') ? (
        <FitTabPanel idPrefix="stats" tabKey="umumiy" hidden={tab !== 'umumiy'}>
          {/* Bu hafta — 7 kunlik faollik */}
          <div className="shrink-0 rounded-[20px] border border-app-border bg-app-surface px-4 py-3 text-app-text">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10.5px] font-bold uppercase tracking-wide text-app-text-muted">Bu hafta</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="profile-heading text-[26px] leading-none text-app-text">
                    {streakLoaded ? streak.last_7_days.filter(Boolean).length : '—'}
                  </span>
                  <span className="text-[13px] font-bold text-app-text-muted">/ 7 kun kirdingiz</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wide text-app-text-muted">Eng yaxshi</p>
                <p className="profile-heading mt-1 text-[20px] leading-none text-app-text">
                  {Math.max(streak.streak_days ?? 0, streak.best_streak_days ?? 0)} kun
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-1.5">
              {last7Rotated.map(({ label: d, active }, i) => (
                <div key={`${d}-${i}`} className="flex min-w-0 flex-col items-center gap-1">
                  <div
                    className={`flex h-8 w-full items-center justify-center rounded-[10px] transition-all ${
                      active
                        ? 'text-app-brand'
                        : 'bg-app-bg-muted text-app-text-muted ring-1 ring-app-border'
                    }`}
                    style={active ? { background: 'var(--app-icon-bg)' } : undefined}
                  >
                    {active ? (
                      <Check size={16} aria-hidden />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-app-border-strong" aria-hidden />
                    )}
                  </div>
                  <div className="truncate text-[10.5px] font-black uppercase tracking-[0.06em] text-app-text-muted">
                    {d}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <LevelXpCard points={points} loaded={pointsLoaded} />

          <div className="grid shrink-0 grid-cols-2 gap-[10px]">
            <MetricTile emoji={<BookOpen size={18} />} label="So'zlar" value={kunlikMetrics.wordsLearned.toString()} />
            <MetricTile emoji={<Clock3 size={18} />} label="O'qish vaqti" value={readingTimeLabel} />
          </div>

          <WeeklyActivityChart last7={last7Rotated} serverDays={weeklyActivity} />
        </FitTabPanel>
      ) : null}

      {visited.has('bugun') ? (
        <FitTabPanel idPrefix="stats" tabKey="bugun" hidden={tab !== 'bugun'}>
          <KunlikTodayStatsCard token={token} compact />
        </FitTabPanel>
      ) : null}

      {visited.has('taqvim') ? (
        <FitTabPanel idPrefix="stats" tabKey="taqvim" hidden={tab !== 'taqvim'}>
          <ActivityCalendarCard
            compact
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
        </FitTabPanel>
      ) : null}

      {visited.has('yutuqlar') ? (
        <FitTabPanel idPrefix="stats" tabKey="yutuqlar" hidden={tab !== 'yutuqlar'}>
          <AchievementsSection token={token} />
        </FitTabPanel>
      ) : null}

      {visited.has('reyting') ? (
        <FitTabPanel idPrefix="stats" tabKey="reyting" hidden={tab !== 'reyting'}>
          <ReytingSection
            data={reyting}
            loading={reytingLoading}
            onUserClick={(id) => navigate(`/u/${id}`)}
          />
        </FitTabPanel>
      ) : null}
    </div>
  );
}
