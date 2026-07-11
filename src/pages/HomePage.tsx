import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { isValidDailyCourseDay, FREE_KUNLIK_DAY_LIMIT } from '../../shared/dailyCourseDay';
import { isKunlikDayRowFullyComplete } from '../../shared/kunlikDayCompletion';
import { Check, ChevronLeft, ChevronRight, Crown, Edit3, FileText, RefreshCw } from 'lucide-react';
import { fetchStreak, getCachedStreak, type StreakResponse } from '../api/activity';
import { useAuth } from '../context/AuthContext';
import { useAccess } from '../context/AccessContext';
import { useLocale } from '../context/LocaleContext';
import { useKunlikProgress, type KunlikDayProgress } from '../hooks/useKunlikProgress';
import { prefetchRoutePath } from '../routeModules';
import { TOTAL_DAYS } from '../data/dailyPlan';
import { takeKunlikRestoreDay } from '../utils/kunlikLastDay';
import UserAvatar from '../components/UserAvatar';
import type { UserGender } from '../components/UserAvatar';
import KunlikFreeLimitCta from '../components/KunlikFreeLimitCta';
import KunlikFreeLimitModal from '../components/KunlikFreeLimitModal';
import { canEnterKunlikDayContent } from '../../shared/dailyCourseDay';

const DEFAULT_ROW: Omit<KunlikDayProgress, 'day_number'> = {
  grammar_1: false,
  grammar_2: false,
  grammar_3: false,
  words_learned: 0,
  words_correct: 0,
  words_match: false,
  oqish_done: false,
  speaking_level: 0,
};

const QUESTS = [
  {
    id: 'grammar',
    titleKey: 'home.questGrammar',
    subtitleKey: 'home.questGrammarSub',
    route: (day: number) => `/kunlik-reja/kun/${day}/grammatika`,
    images: {
      done: '/app-mobile/images/home/block_icons/grammar_done.png',
      active: '/app-mobile/images/home/block_icons/grammar_current.png',
      locked: '/app-mobile/images/home/block_icons/grammar_locked.png',
    },
  },
  {
    id: 'vocabulary',
    titleKey: 'home.questVocab',
    subtitleKey: 'home.questVocabSub',
    route: (day: number) => `/kunlik-reja/kun/${day}/lugat`,
    images: {
      done: '/app-mobile/images/home/block_icons/vocabulary_done.png',
      active: '/app-mobile/images/home/block_icons/vocabulary_current.png',
      locked: '/app-mobile/images/home/block_icons/vocabulary_locked.png',
    },
  },
  {
    id: 'reading',
    titleKey: 'home.questReading',
    subtitleKey: 'home.questReadingSub',
    route: (day: number) => `/kunlik-reja/kun/${day}/oqish`,
    images: {
      done: '/app-mobile/images/home/block_icons/reading_done.png',
      active: '/app-mobile/images/home/block_icons/reading_current.png',
      locked: '/app-mobile/images/home/block_icons/reading_locked.png',
    },
  },
  {
    id: 'speaking',
    titleKey: 'home.questSpeaking',
    subtitleKey: 'home.questSpeakingSub',
    route: (day: number) => `/kunlik-reja/kun/${day}/gapirish`,
    images: {
      done: '/app-mobile/images/home/block_icons/speaking_done.png',
      active: '/app-mobile/images/home/block_icons/speaking_current.png',
      locked: '/app-mobile/images/home/block_icons/speaking_locked.png',
    },
  },
] as const;

type QuestState = 'done' | 'active' | 'locked';

type QuestSlot = (typeof QUESTS)[number] & {
  state: QuestState;
  canOpen: boolean;
};

type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

function getRow(rows: Map<number, KunlikDayProgress>, day: number): KunlikDayProgress {
  return rows.get(day) ?? { day_number: day, ...DEFAULT_ROW };
}

function isGrammarDone(row: KunlikDayProgress): boolean {
  return row.grammar_1 && row.grammar_2 && row.grammar_3;
}

function isVocabularyDone(row: KunlikDayProgress): boolean {
  return row.words_match;
}

function isSpeakingDone(row: KunlikDayProgress, promptCount: number): boolean {
  return promptCount <= 0 || row.speaking_level >= promptCount;
}

function buildQuestSlots(row: KunlikDayProgress, promptCount: number): QuestSlot[] {
  const raw = [
    { done: isGrammarDone(row), hasContent: true },
    { done: isVocabularyDone(row), hasContent: true },
    { done: row.oqish_done, hasContent: true },
    { done: isSpeakingDone(row, promptCount), hasContent: promptCount > 0 },
  ];

  let activeAssigned = false;
  let previousIncomplete = false;

  return QUESTS.map((quest, index) => {
    const item = raw[index];
    let state: QuestState;

    if (previousIncomplete) {
      state = 'locked';
    } else if (item.done) {
      state = 'done';
    } else if (!item.hasContent) {
      state = 'locked';
      previousIncomplete = true;
    } else if (!activeAssigned) {
      state = 'active';
      activeAssigned = true;
      previousIncomplete = true;
    } else {
      state = 'locked';
    }

    return { ...quest, state, canOpen: state !== 'locked' };
  });
}

function isDayComplete(row: KunlikDayProgress, promptCount: number): boolean {
  const counts = new Map<number, number>([[row.day_number, promptCount]]);
  return isKunlikDayRowFullyComplete(row, counts);
}

function findCurrentDay(rows: Map<number, KunlikDayProgress>, promptCounts: Map<number, number>): number {
  for (let day = 1; day <= TOTAL_DAYS; day += 1) {
    if (!isDayComplete(getRow(rows, day), promptCounts.get(day) ?? 0)) return day;
  }
  return TOTAL_DAYS;
}

function HomeHeader({
  streak,
  premium,
  avatarUrl,
  gender,
  userName,
  t,
}: {
  streak: StreakResponse;
  points: number;
  premium: boolean;
  avatarUrl?: string | null;
  gender?: UserGender;
  userName?: string;
  t: TranslateFn;
}) {
  const navigate = useNavigate();

  return (
    <header className="flex items-center gap-2 px-4 pt-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <img src="/app-mobile/logo/logo_mark.svg" alt="" className="h-[34px] w-[34px] shrink-0" decoding="async" />
        <h1 className="min-w-0 truncate text-[26px] font-extrabold leading-none text-app-brand">
          FalaRus
        </h1>
      </div>

      <div className="flex h-11 w-[88px] items-center rounded-full bg-app-surface-elevated py-1 pl-1 pr-2 shadow-app-soft">
        <UserAvatar avatarUrl={avatarUrl} gender={gender ?? null} name={userName} className="h-9 w-9" />
        <span className="ml-2 min-w-0 flex-1 text-center text-[20px] font-extrabold leading-none text-app-text">
          {streak.streak_days}
        </span>
      </div>

      {!premium ? (
        <button
          type="button"
          onClick={() => navigate('/tariflar')}
          onMouseEnter={() => prefetchRoutePath('/tariflar')}
          onTouchStart={() => prefetchRoutePath('/tariflar')}
          onFocus={() => prefetchRoutePath('/tariflar')}
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-app-brand px-3 text-[13px] font-black text-white shadow-app-soft active:scale-[0.98]"
        >
          <Crown className="h-[18px] w-[18px]" aria-hidden />
          {t('home.premium')}
        </button>
      ) : null}
    </header>
  );
}

function ExamShortcuts({ t }: { t: TranslateFn }) {
  const navigate = useNavigate();
  const cards = [
    {
      href: '/kurslar/patent',
      title: t('home.patentTitle'),
      subtitle: t('home.patentSubtitle'),
      solid: true,
      Icon: Edit3,
    },
    {
      href: '/kurslar/vnzh',
      title: t('home.vnzhTitle'),
      subtitle: t('home.vnzhSubtitle'),
      solid: false,
      Icon: FileText,
    },
  ] as const;

  return (
    <section className="grid grid-cols-2 gap-2.5 px-4 pt-2 min-[408px]:gap-3.5">
      {cards.map(({ href, title, subtitle, solid, Icon }) => (
        <button
          key={href}
          type="button"
          onClick={() => navigate(href)}
          onMouseEnter={() => prefetchRoutePath(href)}
          onTouchStart={() => prefetchRoutePath(href)}
          onFocus={() => prefetchRoutePath(href)}
          className={`flex min-h-[92px] min-w-0 flex-col items-start rounded-[22px] p-[14px] text-left shadow-[0_12px_28px_-10px_rgba(15,23,42,0.16)] active:scale-[0.99] ${
            solid
              ? 'bg-[#0B2A6B] text-white'
              : 'bg-[#C89935] text-white'
          }`}
        >
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] ${
              solid ? 'bg-white/12 ring-1 ring-white/20' : 'bg-white/22 ring-1 ring-white/30'
            }`}
          >
            <Icon className="h-5 w-5 text-white" aria-hidden />
          </span>
          <span className="mt-3 block truncate text-[19px] font-extrabold leading-none">{title}</span>
          <span
            className={`mt-1.5 block truncate text-[12px] font-semibold leading-snug ${
              solid ? 'text-white/85' : 'text-white/90'
            }`}
          >
            {subtitle}
          </span>
        </button>
      ))}
    </section>
  );
}

function DayNavigator({
  selectedDay,
  currentDay,
  done,
  total,
  onPrevious,
  onNext,
  t,
}: {
  selectedDay: number;
  currentDay: number;
  done: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
  slots: QuestSlot[];
  day: number;
  premium: boolean;
  onPurchaseRequired: () => void;
  t: TranslateFn;
}) {
  const currentStep = done >= total ? total : done + 1;

  return (
    <section className="px-4 pt-2">
      <div className="rounded-[22px] bg-app-surface px-[22px] py-3 shadow-[0_10px_28px_-16px_rgba(15,23,42,0.18)] ring-1 ring-app-border/70">
        <div className="flex items-center justify-center gap-[18px]">
          <button
            type="button"
            onClick={onPrevious}
            disabled={selectedDay <= 1}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-app-border bg-app-surface text-app-text disabled:opacity-45"
            aria-label={t('home.prevDay')}
          >
            <ChevronLeft className="h-[21px] w-[21px]" aria-hidden />
          </button>
          <div className="text-[26px] font-extrabold leading-none text-app-text">
            {t('home.dayLabel', { day: selectedDay })}
          </div>
          <button
            type="button"
            onClick={onNext}
            disabled={selectedDay >= currentDay}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-app-border bg-app-surface text-app-text disabled:opacity-45"
            aria-label={t('home.nextDay')}
          >
            <ChevronRight className="h-[21px] w-[21px]" aria-hidden />
          </button>
        </div>

        <p className="mt-2 text-center text-[13px] font-semibold leading-snug text-app-text-muted">
          {t('home.stepLabel', { current: currentStep, total })}
          <span className="mx-1.5 text-app-text-secondary">•</span>
          {t('home.minutesLabel', { minutes: 25 })}
        </p>

        <div className="mt-3 flex h-6 items-center">
          {Array.from({ length: total }).map((_, idx) => {
            const step = idx + 1;
            const completed = step <= done;
            const active = step === currentStep && done < total;
            return (
              <div key={step} className="contents">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-extrabold leading-none ${
                    completed
                      ? 'border-[#0B2A6B] bg-[#0B2A6B] text-white'
                      : active
                        ? 'border-[#C08A2D] bg-app-surface text-[#C08A2D]'
                        : 'border-app-border bg-app-surface text-app-text-muted'
                  }`}
                >
                  {completed ? <Check className="h-[15px] w-[15px]" aria-hidden /> : step}
                </div>
                {step < total ? (
                  <div className={`mx-1 h-[3px] flex-1 rounded-full ${step <= done ? 'bg-[#0B2A6B]' : 'bg-app-border'}`} />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function QuestCard({
  slot,
  index,
  day,
  premium,
  onPurchaseRequired,
  t,
}: {
  slot: QuestSlot;
  index: number;
  day: number;
  premium: boolean;
  onPurchaseRequired: () => void;
  t: TranslateFn;
}) {
  const navigate = useNavigate();
  const done = slot.state === 'done';
  const active = slot.state === 'active';
  const locked = slot.state === 'locked';
  const requiresPurchase = !canEnterKunlikDayContent(day, premium);

  const emoji = slot.id === 'grammar'
    ? '📖'
    : slot.id === 'vocabulary'
      ? '🗂️'
      : slot.id === 'reading'
        ? '📕'
        : '🎤';

  const numberBg = done ? '#12A150' : active ? '#0B2A6B' : '#94A3B8';
  // Surfaces use app-* tokens so light/dark themes are handled automatically;
  // the done/active accents are ring-only so the card body remains readable.
  const cardSurface = done
    ? 'bg-app-success-bg ring-1 ring-[#B7E8C7] dark:ring-[color:var(--app-success)]/40'
    : active
      ? 'bg-app-icon-bg ring-1 ring-[#B7CCEF] dark:ring-[color:var(--app-primary)]/40'
      : 'bg-app-surface ring-1 ring-app-border';

  const subtitleClass = done
    ? 'text-app-success-text dark:text-[color:var(--app-success)]'
    : active
      ? 'text-app-primary dark:text-[color:var(--app-brand)]'
      : 'text-app-text-muted';

  const actionLabel = done
    ? t('home.questRepeat') || 'Takrorlash'
    : active
      ? t('home.questStart') || 'Boshlash'
      : 'Yopiq';

  const questPath =
    done && slot.id === 'speaking' ? `${slot.route(day)}?retry=1` : slot.route(day);

  const handleQuestClick = () => {
    if (locked) return;
    if (requiresPurchase) {
      onPurchaseRequired();
      return;
    }
    navigate(questPath);
  };

  return (
    <button
      type="button"
      disabled={locked}
      onClick={handleQuestClick}
      onMouseEnter={() => {
        if (!requiresPurchase && !locked) prefetchRoutePath(questPath);
      }}
      onTouchStart={() => {
        if (!requiresPurchase && !locked) prefetchRoutePath(questPath);
      }}
      onFocus={() => {
        if (!requiresPurchase && !locked) prefetchRoutePath(questPath);
      }}
      className={`relative flex min-h-[188px] min-w-0 flex-col items-center rounded-[22px] p-4 text-center transition-transform active:scale-[0.99] disabled:cursor-default ${cardSurface} ${
        locked ? 'opacity-70' : ''
      }`}
    >
      <span
        className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-black leading-none text-white"
        style={{ background: numberBg }}
      >
        {index}
      </span>
      <span className="absolute right-3 top-3">
        <Check
          className="h-5 w-5"
          color={done ? '#12A150' : active ? '#0B2A6B' : '#CBD5E1'}
          aria-hidden
        />
      </span>

      <div className="flex flex-1 flex-col items-center justify-center gap-1 pb-3 pt-2">
        <span className={`flex h-[52px] w-full items-center justify-center text-[42px] leading-none ${locked ? 'grayscale' : ''}`}>
          {emoji}
        </span>
        <span className={`block truncate text-[19px] font-extrabold leading-tight ${locked ? 'text-app-text-muted' : 'text-app-text'}`}>
          {t(slot.titleKey)}
        </span>
        <span className={`block truncate text-[12px] font-semibold leading-snug ${subtitleClass}`}>
          {t(slot.subtitleKey)}
        </span>
      </div>

      <span
        className={`flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-full text-[14px] font-black leading-none ${
          done
            ? 'bg-[#12A150] text-white shadow-[0_8px_18px_-8px_rgba(18,161,80,0.45)]'
            : active
              ? 'quest-cta-active bg-[#0B2A6B] text-white'
              : 'bg-[#EEF1F6] text-app-text-muted'
        }`}
      >
        {locked ? '🔒' : null}
        <span className="truncate">{actionLabel}</span>
        {done ? (
          <RefreshCw className="h-4 w-4" aria-hidden />
        ) : active ? (
          <ChevronRight className="h-4 w-4" aria-hidden />
        ) : null}
      </span>
    </button>
  );
}

export default function HomePage() {
  const { token, user } = useAuth();
  const { access } = useAccess();
  const { t } = useLocale();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { rows, loaded, practicePromptCountByDay } = useKunlikProgress();
  const premium = Boolean(access?.subscription_active);
  const [streak, setStreak] = useState<StreakResponse>(() => getCachedStreak() ?? { streak_days: 0, last_7_days: Array(7).fill(false) });
  const currentDay = useMemo(() => {
    if (!loaded) return null;
    return findCurrentDay(rows, practicePromptCountByDay);
  }, [loaded, rows, practicePromptCountByDay]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [freeLimitModalOpen, setFreeLimitModalOpen] = useState(false);
  const initialDayResolvedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetchStreak(token).then((data) => {
      if (!cancelled && data) setStreak(data);
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Effect 1: `?kun=N` deep link (from course map or elsewhere) — ALWAYS wins.
  // Reads `kun` synchronously from window.location so React Router state can't lie about it.
  const kunParam = searchParams.get('kun');
  useEffect(() => {
    if (currentDay == null) return;
    if (kunParam == null) return;
    const kun = Number(kunParam);
    if (!isValidDailyCourseDay(kun)) return;
    initialDayResolvedRef.current = true;
    takeKunlikRestoreDay();
    setSelectedDay(Math.min(kun, currentDay));
    // Clear ?kun= from URL so subsequent day-navigator swipes are clean.
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('kun');
        return next;
      },
      { replace: true },
    );
  }, [currentDay, kunParam, setSearchParams]);

  // Effect 2: initial resolution when no URL param — restore from sessionStorage,
  // otherwise land on currentDay. Runs exactly once per HomePage instance.
  useEffect(() => {
    if (currentDay == null) return;
    if (initialDayResolvedRef.current) return;
    // If a URL kun is present, Effect 1 handles it — don't race here.
    if (kunParam != null) return;
    initialDayResolvedRef.current = true;
    const restored = takeKunlikRestoreDay();
    if (restored != null && isValidDailyCourseDay(restored)) {
      setSelectedDay(Math.min(restored, currentDay));
    } else {
      setSelectedDay(currentDay);
    }
  }, [currentDay, kunParam]);

  // Effect 3: clamp selectedDay if currentDay shrinks (defensive).
  useEffect(() => {
    if (currentDay == null) return;
    setSelectedDay((day) => (day == null ? day : Math.min(Math.max(day, 1), currentDay)));
  }, [currentDay]);

  const progressReady = loaded && currentDay != null && selectedDay != null;
  const displayDay = selectedDay ?? currentDay ?? 1;
  const row = progressReady ? getRow(rows, displayDay) : null;
  const promptCount = progressReady ? practicePromptCountByDay.get(displayDay) ?? 0 : 0;
  const slots = row ? buildQuestSlots(row, promptCount) : [];
  const done = slots.filter((slot) => slot.state === 'done').length;
  const showFreeLimitCta =
    !premium && displayDay > FREE_KUNLIK_DAY_LIMIT;

  const userPoints = user?.totalPoints ?? 0;

  return (
    <div className="bg-app-bg">
      <main className="mx-auto w-full max-w-[820px]">
        <HomeHeader
          streak={streak}
          points={userPoints}
          premium={premium}
          avatarUrl={user?.avatarUrl}
          gender={user?.gender ?? null}
          userName={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || undefined}
          t={t}
        />
        <ExamShortcuts t={t} />

        <div className="px-4 pt-2">
          <button
            type="button"
            onClick={() => navigate('/kunlik-reja/xarita')}
            className="flex w-full items-center justify-between rounded-[22px] bg-app-surface px-[18px] py-[13px] shadow-[0_10px_28px_-16px_rgba(15,23,42,0.18)] ring-1 ring-app-border/70 transition-transform active:scale-[0.99]"
          >
            <span className="flex items-center gap-2.5">
              <span aria-hidden className="text-[19px] leading-none">🗺</span>
              <span className="text-[14px] font-black text-app-text">Butun xarita · {TOTAL_DAYS} kun</span>
            </span>
            <ChevronRight className="h-4 w-4 text-app-text-muted" />
          </button>
        </div>

        {progressReady ? (
          <>
            <DayNavigator
              selectedDay={displayDay}
              currentDay={currentDay}
              done={done}
              total={slots.length}
              onPrevious={() => setSelectedDay((day) => Math.max(1, (day ?? displayDay) - 1))}
              onNext={() => setSelectedDay((day) => Math.min(currentDay, (day ?? displayDay) + 1))}
              slots={slots}
              day={displayDay}
              premium={premium}
              onPurchaseRequired={() => setFreeLimitModalOpen(true)}
              t={t}
            />

            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              className="grid grid-cols-2 gap-3 px-4 pt-2"
            >
              {slots.map((slot, index) => (
                <QuestCard
                  key={slot.id}
                  slot={slot}
                  index={index + 1}
                  day={displayDay}
                  premium={premium}
                  onPurchaseRequired={() => setFreeLimitModalOpen(true)}
                  t={t}
                />
              ))}
            </motion.section>
            {showFreeLimitCta ? <KunlikFreeLimitCta /> : null}
            {freeLimitModalOpen ? (
              <KunlikFreeLimitModal onClose={() => setFreeLimitModalOpen(false)} />
            ) : null}
          </>
        ) : (
          <div className="px-4 pt-6">
            <div className="flex h-[114px] items-center justify-center rounded-2xl bg-app-surface text-sm font-bold text-app-text-muted shadow-app-soft">
              {t('home.loadingPlan')}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
