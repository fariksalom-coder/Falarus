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
      dark: true,
      Icon: Edit3,
    },
    {
      href: '/kurslar/vnzh',
      title: t('home.vnzhTitle'),
      subtitle: t('home.vnzhSubtitle'),
      dark: false,
      Icon: FileText,
    },
  ] as const;

  return (
    <section className="grid grid-cols-2 gap-2.5 px-4 pt-3.5 min-[408px]:gap-3.5">
      {cards.map(({ href, title, subtitle, dark, Icon }) => (
        <button
          key={href}
          type="button"
          onClick={() => navigate(href)}
          onMouseEnter={() => prefetchRoutePath(href)}
          onTouchStart={() => prefetchRoutePath(href)}
          onFocus={() => prefetchRoutePath(href)}
          className={`flex h-[58px] min-w-0 items-center rounded-[18px] px-2.5 py-2 text-left shadow-[0_12px_28px_rgba(15,23,42,0.14)] active:scale-[0.99] ${
            dark
              ? 'bg-gradient-to-br from-[#1439A7] to-[#071B5E] text-white'
              : 'bg-gradient-to-br from-[#FFD43B] to-[#FFA000] text-[#0F172A]'
          }`}
        >
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${dark ? 'border-white/25 bg-white/10' : 'border-white/30 bg-white/25'}`}>
            <Icon className={`h-6 w-6 ${dark ? 'text-white' : 'text-[#0A3B9A]'}`} aria-hidden />
          </span>
          <span className="ml-2.5 min-w-0 flex-1">
            <span className="block truncate text-[15px] font-extrabold leading-none">{title}</span>
            <span
              className={`mt-1.5 block truncate text-[11px] font-semibold leading-snug ${
                dark ? 'text-white/90' : 'text-[#1E293B]/85'
              }`}
            >
              {subtitle}
            </span>
          </span>
          <ChevronRight className="h-6 w-6 shrink-0 text-white" aria-hidden />
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
  t: TranslateFn;
}) {
  const currentStep = done >= total ? total : done + 1;

  return (
    <section className="px-4 pt-3">
      <div className="h-[114px] rounded-2xl bg-app-surface px-[22px] py-3 shadow-app-soft">
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
          <div className="text-[24px] font-extrabold leading-none text-app-text">
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

        <p className="mt-[9px] text-center text-[13px] font-semibold leading-snug text-app-icon-fg">
          {t('home.stepLabel', { current: currentStep, total })}
          <span className="mx-1.5 text-app-text-muted">•</span>
          {t('home.minutesLabel', { minutes: 25 })}
        </p>

        <div className="mt-[9px] flex h-6 items-center">
          {Array.from({ length: total }).map((_, idx) => {
            const step = idx + 1;
            const completed = step <= done;
            const active = step === currentStep && done < total;
            return (
              <div key={step} className="contents">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold leading-none ${
                    completed
                      ? 'border-[#7C3AED] bg-[#7C3AED] text-white'
                      : active
                        ? 'border-[#7C3AED] bg-app-surface text-[#7C3AED]'
                        : 'border-app-border bg-app-surface text-app-text-muted'
                  }`}
                >
                  {completed ? <Check className="h-[15px] w-[15px]" aria-hidden /> : step}
                </div>
                {step < total ? (
                  <div className={`mx-1 h-0.5 flex-1 ${step <= done ? 'bg-[#7C3AED]' : 'bg-app-border'}`} />
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
  const accent = done ? '#0EAD4F' : active ? '#0D55F5' : '#6B7898';
  const image = slot.images[done ? 'done' : active ? 'active' : 'locked'];
  const requiresPurchase = !canEnterKunlikDayContent(day, premium);

  const cardSurface = done
    ? 'border-[#ACEBC8] bg-[#F0FFF5] dark:border-emerald-500/35 dark:bg-emerald-500/12'
    : active
      ? 'border-[#B7CEFF] bg-[#F4F8FF] dark:border-app-primary/40 dark:bg-app-primary/12'
      : 'border-app-border bg-[#F9FBFF] dark:bg-app-surface-elevated';

  const subtitleClass = done
    ? 'text-emerald-700 dark:text-emerald-300'
    : active
      ? 'text-[#1D4ED8] dark:text-blue-300'
      : 'text-[#475569] dark:text-slate-300';

  const actionLabel = done ? t('home.questRepeat') : t('home.questStart');
  const questPath =
    done && slot.id === 'speaking' ? `${slot.route(day)}?retry=1` : slot.route(day);

  const handleQuestClick = () => {
    if (requiresPurchase) {
      onPurchaseRequired();
      return;
    }
    navigate(questPath);
  };

  return (
    <button
      type="button"
      disabled={!slot.canOpen}
      onClick={handleQuestClick}
      onMouseEnter={() => {
        if (!requiresPurchase) prefetchRoutePath(questPath);
      }}
      onTouchStart={() => {
        if (!requiresPurchase) prefetchRoutePath(questPath);
      }}
      onFocus={() => {
        if (!requiresPurchase) prefetchRoutePath(questPath);
      }}
      className={`relative flex min-h-[198px] min-w-0 flex-col rounded-[18px] border p-2.5 text-center shadow-app-soft transition-transform active:scale-[0.99] disabled:cursor-default ${cardSurface}`}
    >
      <span
        className="absolute left-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full text-[15px] font-black leading-none text-white"
        style={{ backgroundColor: accent }}
      >
        {index}
      </span>
      <span
        className={`absolute right-2.5 top-2.5 flex h-[30px] w-[30px] items-center justify-center rounded-full ${
          done ? 'bg-white/80 dark:bg-white/15' : 'bg-white/90 dark:bg-white/10'
        }`}
      >
        <Check className="h-5 w-5" color={done ? accent : locked ? '#94A3B8' : '#C7D1E6'} aria-hidden />
      </span>

      <div className="flex flex-1 flex-col items-center justify-center px-1 pt-7 pb-2">
        <img src={image} alt="" className="h-[72px] w-[96px] object-contain" decoding="async" />
        <span className="mt-2 block w-full truncate text-[17px] font-black leading-tight text-app-text">
          {t(slot.titleKey)}
        </span>
        <span className={`mt-1.5 block w-full truncate px-0.5 text-[12px] font-semibold leading-snug ${subtitleClass}`}>
          {t(slot.subtitleKey)}
        </span>
      </div>

      <span
        className={`mt-auto flex min-h-[38px] w-full items-center rounded-full py-2 pl-[18px] pr-2 text-[16px] font-black leading-none ${
          locked
            ? 'border border-slate-300/80 bg-slate-100 text-slate-600 shadow-none dark:border-white/14 dark:bg-white/10 dark:text-slate-200'
            : 'text-white shadow-[0_12px_28px_rgba(15,23,42,0.14)]'
        }`}
        style={{ backgroundColor: locked ? undefined : accent }}
      >
        <span className="min-w-0 flex-1 truncate text-left">{actionLabel}</span>
        <span
          className={`ml-2 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full ${
            locked ? 'bg-white dark:bg-white/15' : 'bg-white'
          }`}
        >
          {done ? (
            <RefreshCw className="h-5 w-5" color={locked ? '#64748B' : accent} aria-hidden />
          ) : (
            <ChevronRight className="h-6 w-6" color={locked ? '#64748B' : accent} aria-hidden />
          )}
        </span>
      </span>
    </button>
  );
}

export default function HomePage() {
  const { token, user } = useAuth();
  const { access } = useAccess();
  const { t } = useLocale();
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

  useEffect(() => {
    if (currentDay == null) return;

    if (!initialDayResolvedRef.current) {
      initialDayResolvedRef.current = true;
      const kunRaw = searchParams.get('kun');
      const kunFromUrl = kunRaw != null ? Number(kunRaw) : null;
      const restored = takeKunlikRestoreDay();
      let day = currentDay;
      if (restored != null && isValidDailyCourseDay(restored)) {
        day = Math.min(restored, currentDay);
      } else if (kunFromUrl != null && isValidDailyCourseDay(kunFromUrl)) {
        day = Math.min(kunFromUrl, currentDay);
      }
      setSelectedDay(day);
      if (kunRaw != null) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.delete('kun');
            return next;
          },
          { replace: true },
        );
      }
      return;
    }

    setSelectedDay((day) => {
      if (day == null) return currentDay;
      return Math.min(Math.max(day, 1), currentDay);
    });
  }, [currentDay, searchParams, setSearchParams]);

  const progressReady = loaded && currentDay != null && selectedDay != null;
  const displayDay = selectedDay ?? currentDay ?? 1;
  const row = progressReady ? getRow(rows, displayDay) : null;
  const promptCount = progressReady ? practicePromptCountByDay.get(displayDay) ?? 0 : 0;
  const slots = row ? buildQuestSlots(row, promptCount) : [];
  const done = slots.filter((slot) => slot.state === 'done').length;
  const showFreeLimitCta =
    !premium && displayDay > FREE_KUNLIK_DAY_LIMIT;

  return (
    <div className="min-h-screen bg-app-bg-muted pb-[84px]">
      <main className="mx-auto w-full max-w-[820px]">
        <HomeHeader
          streak={streak}
          premium={premium}
          avatarUrl={user?.avatarUrl}
          gender={user?.gender ?? null}
          userName={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || undefined}
          t={t}
        />
        <ExamShortcuts t={t} />
        {progressReady ? (
          <>
            <DayNavigator
              selectedDay={displayDay}
              currentDay={currentDay}
              done={done}
              total={slots.length}
              onPrevious={() => setSelectedDay((day) => Math.max(1, (day ?? displayDay) - 1))}
              onNext={() => setSelectedDay((day) => Math.min(currentDay, (day ?? displayDay) + 1))}
              t={t}
            />

            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              className="grid grid-cols-2 gap-2.5 px-4 pt-3.5"
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
