import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown, Lock, Play } from 'lucide-react';
import { DAILY_PLAN, TOTAL_DAYS, type DayBlock, type DayPlan } from '../../data/dailyPlan';
import {
  DAILY_PLAN_PROGRESS_MODE,
  DAILY_PLAN_REVIEW_STORAGE_KEY,
} from '../../config/dailyPlanProgress';
import { useSequentialLesson } from '../../context/SequentialLessonContext';
import { useAccess } from '../../context/AccessContext';
import { takeKunlikRestoreDay } from '../../utils/kunlikLastDay';
import {
  computeDayPlanQuestProgress,
  getKunlikQuestProgressSlice,
  isBlockDoneLocallyForPlan,
  readPlanReviewVisits,
  buildPlanServerDoneChecker,
} from '../../utils/kunlikPlanDayProgress';
import { useKunlikProgress, type KunlikDayProgress } from '../../hooks/useKunlikProgress';
import { BLOCK_CONFIG, QuestBlocks, buildKunlikQuestSteps } from './KunlikQuestBlocks';
import { FREE_KUNLIK_SPEAKING_DAY_LIMIT } from '../../../shared/dailyCourseDay';

type DayUiState = 'completed' | 'current' | 'locked';

/** 1-kun doimo to‘liq `DayPlanRow` ko‘rinishida (eskicha); «Yakunlangan kunlar» lentasiga chiqmaydi. */
const ALWAYS_EXPANDED_LAYOUT_DAY_NUM = 1;

const FREE_DAILY_PLAN_DAY_LIMIT = FREE_KUNLIK_SPEAKING_DAY_LIMIT;

export type KunlikPlanFullSectionProps = {
  /**
   * `route` — `/kunlik-reja` (URL ?kun= va restore kaliti).
   * `embedded` — bosh sahifa (faqat joriy kunga fokus, URL ishlatilmaydi).
   */
  mode: 'route' | 'embedded';
};

export default function KunlikPlanFullSection({ mode }: KunlikPlanFullSectionProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { results, isReady } = useSequentialLesson();
  const { access, accessLoaded } = useAccess();
  const { rows: kunlikRows, loaded: kunlikLoaded, practicePromptCountByDay } = useKunlikProgress();
  const [reviewVisits, setReviewVisits] = useState<Record<number, true>>(readPlanReviewVisits);
  const [vocabProgressTick, setVocabProgressTick] = useState(0);

  useEffect(() => {
    if (DAILY_PLAN_PROGRESS_MODE !== 'placeholder') return;
    try {
      localStorage.removeItem(DAILY_PLAN_REVIEW_STORAGE_KEY);
      localStorage.removeItem('daily-plan-text-visits');
    } catch {
      /* ignore */
    }
    setReviewVisits({});
  }, []);

  const persistReview = useCallback((dayNum: number) => {
    if (DAILY_PLAN_PROGRESS_MODE !== 'live') return;
    const next = { ...readPlanReviewVisits(), [dayNum]: true as const };
    localStorage.setItem(DAILY_PLAN_REVIEW_STORAGE_KEY, JSON.stringify(next));
    setReviewVisits(next);
    window.dispatchEvent(new Event('lesson-task-saved'));
  }, []);

  useEffect(() => {
    const onStorage = () => setReviewVisits(readPlanReviewVisits());
    window.addEventListener('storage', onStorage);
    window.addEventListener('lesson-task-saved', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('lesson-task-saved', onStorage);
    };
  }, []);

  useEffect(() => {
    const onVocab = () => setVocabProgressTick((n) => n + 1);
    window.addEventListener('daily-vocab-progress', onVocab as EventListener);
    return () => window.removeEventListener('daily-vocab-progress', onVocab as EventListener);
  }, []);

  void vocabProgressTick;

  const isServerDone = useMemo(() => buildPlanServerDoneChecker(kunlikRows), [kunlikRows]);

  const { dayProgress, currentDay } = useMemo(() => {
    const map = new Map<number, { done: number; total: number }>();
    let firstIncomplete = TOTAL_DAYS;
    for (const day of DAILY_PLAN) {
      const p = computeDayPlanQuestProgress(
        day,
        results,
        reviewVisits,
        kunlikRows,
        practicePromptCountByDay.get(day.day) ?? 0,
      );
      map.set(day.day, p);
      if (!(p.done >= p.total) && firstIncomplete === TOTAL_DAYS) firstIncomplete = day.day;
    }
    return { dayProgress: map, currentDay: firstIncomplete };
  }, [results, reviewVisits, kunlikRows, vocabProgressTick, practicePromptCountByDay]);

  const weeks = useMemo(() => {
    const map = new Map<number, DayPlan[]>();
    for (const d of DAILY_PLAN) {
      const arr = map.get(d.week) ?? [];
      arr.push(d);
      map.set(d.week, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, []);

  const dayToWeek = useMemo(() => {
    const m = new Map<number, number>();
    for (const d of DAILY_PLAN) m.set(d.day, d.week);
    return m;
  }, []);

  const [expandedWeekNum, setExpandedWeekNum] = useState<number | null>(1);
  /** Haqiqiy `?kun=` chuqur havola: avto-`currentDay` sinxroniga aralashmasin. */
  const fromKunParamRef = useRef(false);
  /** `null` — hali boshlang‘ich fokus qo‘llanmagan; keyin oxirgi sinxronlangan `currentDay`. */
  const planFocusPassRef = useRef<number | null>(null);
  /** Faqat «hali tugamagan → tugagan» o‘tishi uchun avto-yopish (ochilgan yakunlangan kunni darhol yopmaydi). */
  const expandedCompletionSnapRef = useRef<{ day: number; complete: boolean } | null>(null);
  const weekSectionRefs = useRef(new Map<number, HTMLDivElement>());

  const toggleWeek = useCallback((weekNum: number) => {
    const isCurrentWeek = dayToWeek.get(currentDay) === weekNum;
    setExpandedWeekNum((prev) => {
      if (prev === weekNum) return null;
      return weekNum;
    });
    setExpandedDayNum((prev) => {
      if (expandedWeekNum === weekNum) return null;
      if (isCurrentWeek) return currentDay;
      return prev != null && dayToWeek.get(prev) === weekNum ? prev : null;
    });
    setRibbonOpenedDayNum(null);
  }, [currentDay, dayToWeek, expandedWeekNum]);

  const [expandedDayNum, setExpandedDayNum] = useState<number | null>(null);
  /** Lentadan tanlangan yakunlangan kun — to‘liq kartochka ochiladi. */
  const [ribbonOpenedDayNum, setRibbonOpenedDayNum] = useState<number | null>(null);

  const toggleRibbonCompletedDay = useCallback((dayNum: number) => {
    setRibbonOpenedDayNum((prev) => {
      const next = prev === dayNum ? null : dayNum;
      setExpandedDayNum(next);
      return next;
    });
  }, []);

  useEffect(() => {
    setRibbonOpenedDayNum(null);
  }, [expandedWeekNum]);

  const isPlanDayComplete = useCallback(
    (dayNum: number) => {
      const plan = DAILY_PLAN.find((d) => d.day === dayNum);
      if (!plan) return false;
      const p = computeDayPlanQuestProgress(
        plan,
        results,
        reviewVisits,
        kunlikRows,
        practicePromptCountByDay.get(dayNum) ?? 0,
      );
      return p.total > 0 && p.done >= p.total;
    },
    [results, reviewVisits, kunlikRows, practicePromptCountByDay],
  );

  useEffect(() => {
    if (!isReady || !kunlikLoaded) return;

    if (mode === 'route') {
      const raw = searchParams.get('kun');
      if (raw != null && raw !== '') {
        const n = Number(raw);
        if (Number.isFinite(n) && n >= 1 && n <= TOTAL_DAYS) {
          const w = dayToWeek.get(n);
          if (w != null) {
            fromKunParamRef.current = true;
            setExpandedWeekNum(w);
            setExpandedDayNum(n);
            planFocusPassRef.current = currentDay;
            setSearchParams(
              (prev) => {
                const next = new URLSearchParams(prev);
                next.delete('kun');
                return next;
              },
              { replace: true },
            );
            return;
          }
        }
      }
    }

    const pass = (): void => {
      let day = currentDay;
      const restored = takeKunlikRestoreDay();
      if (restored != null && !isPlanDayComplete(restored)) day = restored;
      const w = dayToWeek.get(day);
      if (w != null) setExpandedWeekNum(w);
      setExpandedDayNum(day);
      planFocusPassRef.current = currentDay;
    };

    if (planFocusPassRef.current === null) {
      pass();
      return;
    }

    if (!fromKunParamRef.current && currentDay !== planFocusPassRef.current) {
      planFocusPassRef.current = currentDay;
      const w = dayToWeek.get(currentDay);
      if (w != null) setExpandedWeekNum(w);
      setExpandedDayNum(currentDay);
    }
  }, [
    mode,
    isReady,
    kunlikLoaded,
    currentDay,
    searchParams,
    dayToWeek,
    setSearchParams,
    isPlanDayComplete,
  ]);

  useEffect(() => {
    if (expandedDayNum == null || expandedWeekNum == null) return;
    const w = dayToWeek.get(expandedDayNum);
    if (w !== expandedWeekNum) setExpandedDayNum(null);
  }, [expandedWeekNum, expandedDayNum, dayToWeek]);

  useEffect(() => {
    if (expandedDayNum == null) {
      expandedCompletionSnapRef.current = null;
      return;
    }
    const complete = isPlanDayComplete(expandedDayNum);
    const snap = expandedCompletionSnapRef.current;

    if (snap === null || snap.day !== expandedDayNum) {
      expandedCompletionSnapRef.current = { day: expandedDayNum, complete };
      return;
    }

    if (!snap.complete && complete) {
      setExpandedDayNum(null);
    }

    expandedCompletionSnapRef.current = { day: expandedDayNum, complete };
  }, [expandedDayNum, isPlanDayComplete]);

  const dayRowRefs = useRef(new Map<number, HTMLDivElement>());
  /** Faqat joriy hafta ichidagi kunlar ro‘yxati (tepadagi blok chapdan scroll qiladi). */
  const weekDaysScrollRefs = useRef(new Map<number, HTMLDivElement>());
  const prevExpandedWeekNumRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const prev = prevExpandedWeekNumRef.current;
    prevExpandedWeekNumRef.current = expandedWeekNum;
    if (expandedWeekNum != null && expandedWeekNum !== prev) {
      requestAnimationFrame(() => {
        weekDaysScrollRefs.current.get(expandedWeekNum)?.scrollTo({ top: 0, behavior: 'auto' });
      });
    }
  }, [expandedWeekNum]);

  useLayoutEffect(() => {
    let innerRaf = 0;
    const outerRaf = requestAnimationFrame(() => {
      innerRaf = requestAnimationFrame(() => {
        if (expandedDayNum != null) {
          dayRowRefs.current.get(expandedDayNum)?.scrollIntoView({
            behavior: 'auto',
            block: 'nearest',
            inline: 'nearest',
          });
          return;
        }
        if (expandedWeekNum != null) {
          weekSectionRefs.current.get(expandedWeekNum)?.scrollIntoView({
            behavior: 'auto',
            block: 'nearest',
            inline: 'nearest',
          });
        }
      });
    });
    return () => {
      cancelAnimationFrame(outerRaf);
      cancelAnimationFrame(innerRaf);
    };
  }, [expandedWeekNum, expandedDayNum]);

  const dayUiState = (day: DayPlan): DayUiState => {
    const hasSubscription = Boolean(access?.subscription_active);
    if (!hasSubscription && day.day > FREE_DAILY_PLAN_DAY_LIMIT) return 'locked';
    const p = dayProgress.get(day.day);
    if (p && p.done >= p.total && p.total > 0) return 'completed';
    if (day.day === currentDay) return 'current';
    return 'locked';
  };

  const navigateToBlock = useCallback(
    (day: DayPlan, block: DayBlock) => {
      const kd = day.kunlikDay ?? day.day;
      if (kd != null) {
        if (block.kind === 'grammar') {
          navigate(`/kunlik-reja/kun/${kd}/grammatika`);
          return;
        }
        if (block.kind === 'vocabulary') {
          navigate(`/kunlik-reja/kun/${kd}/lugat`);
          return;
        }
        if (block.kind === 'text') {
          navigate(`/kunlik-reja/kun/${kd}/oqish`);
          return;
        }
      }
      if (block.kind === 'grammar') navigate(block.lessonPath);
      else if (block.kind === 'vocabulary') navigate(`/vocabulary/${block.topicId}/${block.subtopicId}`);
      else if (block.kind === 'text') navigate(`/vocabulary/matnlar/${block.textId}`);
    },
    [navigate],
  );

  const planBootstrapDone = isReady && kunlikLoaded;
  if (!planBootstrapDone) {
    const loadingInner = (
      <>
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
        <p className="text-center text-sm font-medium text-slate-500">Reja yuklanmoqda…</p>
      </>
    );
    if (mode === 'embedded') {
      return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-[20px] border border-slate-200/90 bg-slate-50/80 px-4 py-14">
          {loadingInner}
        </div>
      );
    }
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 py-16">
        {loadingInner}
      </div>
    );
  }

  const mainCls =
    mode === 'embedded'
      ? 'relative z-10 mx-auto w-full max-w-2xl space-y-3 px-0 pb-4 pt-2 sm:max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl'
      : 'relative z-10 mx-auto max-w-lg space-y-3 px-4 pb-6 pt-0';

  /**
   * Hafta ochilganda ichki kunlar paneli balandligi (pastki nav va tepa bloklar uchun joy qoldiramiz).
   * Oldingi max-height + 30rem limit ramkani juda past qilib qo‘ygan edi.
   */
  const weekDaysScrollLayout =
    mode === 'embedded'
      ? 'h-[calc(100dvh-12rem)] sm:h-[calc(100dvh-10.5rem)]'
      : 'h-[calc(100dvh-15rem)] sm:h-[calc(100dvh-13.5rem)]';

  return (
    <div className={mainCls}>
      {weeks.map(([weekNum, days]) => {
        const weekDone = days.filter((d) => {
          const p = dayProgress.get(d.day);
          return p && p.total > 0 && p.done >= p.total;
        }).length;
        const progressPercent = Math.round((weekDone / days.length) * 100);
        const weekOpen = expandedWeekNum === weekNum;

        const weekAllDone = weekDone === days.length;
        const hasCurrentDay = days.some((d) => d.day === currentDay);

        const hasSubscription = Boolean(access?.subscription_active);
        const completedDaysInWeek = days.filter((d) => dayUiState(d) === 'completed');
        const completedDaysForRibbon = completedDaysInWeek.filter(
          (d) => d.day !== ALWAYS_EXPANDED_LAYOUT_DAY_NUM,
        );
        const activeDaysInWeek = days.filter(
          (d) => d.day === ALWAYS_EXPANDED_LAYOUT_DAY_NUM || dayUiState(d) !== 'completed',
        );
        const premiumEntryDay = FREE_DAILY_PLAN_DAY_LIMIT + 1;
        const showPremiumBetweenDaysCta =
          accessLoaded &&
          !hasSubscription &&
          activeDaysInWeek.some((d) => d.day === premiumEntryDay);

        const weekAccent = weekAllDone
          ? {
              header: 'bg-gradient-to-r from-emerald-500 to-green-500',
              bodyBg: 'bg-gradient-to-b from-emerald-100 to-green-50',
              dayAccent: 'border-l-[3px] border-l-emerald-300',
              text: 'text-white',
              sub: 'text-emerald-100',
              chevron: 'text-white/70',
              badge: 'bg-white/25 text-white',
            }
          : hasCurrentDay
            ? {
                header: 'bg-gradient-to-r from-blue-600 to-indigo-600',
                bodyBg: 'bg-gradient-to-b from-blue-100 to-indigo-50',
                dayAccent: 'border-l-[3px] border-l-blue-300',
                text: 'text-white',
                sub: 'text-blue-200',
                chevron: 'text-white/70',
                badge: 'bg-white/25 text-white',
              }
            : {
                header: 'bg-gradient-to-r from-slate-50 to-slate-100',
                bodyBg: 'bg-slate-50 border-t border-slate-200/90',
                dayAccent: 'border-l-[3px] border-l-slate-300',
                text: 'text-slate-800',
                sub: 'text-slate-600',
                chevron: 'text-slate-500',
                badge: 'bg-slate-200 text-slate-700',
              };

        return (
          <div
            key={weekNum}
            ref={(el) => {
              if (el) weekSectionRefs.current.set(weekNum, el);
              else weekSectionRefs.current.delete(weekNum);
            }}
            className={`scroll-mt-4 overflow-hidden rounded-[24px] shadow-[0_14px_34px_rgba(148,163,184,0.1)] ${
              weekAllDone
                ? 'ring-1 ring-emerald-200/70'
                : hasCurrentDay
                  ? 'ring-2 ring-[#2563EB]/25 shadow-[0_18px_44px_rgba(37,99,235,0.12)]'
                  : 'border border-slate-300 shadow-[0_10px_28px_rgba(100,116,139,0.14)]'
            }`}
          >
            <button
              type="button"
              onClick={() => toggleWeek(weekNum)}
              className={`flex w-full items-center justify-between gap-3 px-5 py-4 text-left ${weekAccent.header}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <div
                    className={`flex items-baseline gap-2.5 text-[28px] font-semibold leading-snug tracking-normal sm:text-[31px] ${weekAccent.text}`}
                  >
                    <span className="tabular-nums">{weekNum}</span>
                    <span>Hafta</span>
                  </div>
                  {weekAllDone && (
                    <span className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${weekAccent.badge}`}>
                      <Check className="h-2.5 w-2.5" strokeWidth={3} /> Tugadi
                    </span>
                  )}
                  {hasCurrentDay && !weekAllDone && (
                    <span className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${weekAccent.badge}`}>
                      <Play className="h-2.5 w-2.5 fill-current" /> Aktiv
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className={`h-1 flex-1 overflow-hidden rounded-full ${hasCurrentDay || weekAllDone ? 'bg-white/20' : 'bg-slate-300/90'}`}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
                      className={`h-full rounded-full ${hasCurrentDay || weekAllDone ? 'bg-white/70' : 'bg-slate-500'}`}
                    />
                  </div>
                  <span className={`shrink-0 text-[11px] font-semibold tabular-nums ${weekAccent.sub}`}>
                    {weekDone}/{days.length}
                  </span>
                </div>
              </div>
              <motion.div
                animate={{ rotate: weekOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className={`mt-1 shrink-0 self-start ${weekAccent.chevron}`}
              >
                <ChevronDown className="h-5 w-5" strokeWidth={2} />
              </motion.div>
            </button>

            <AnimatePresence initial={false}>
              {weekOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                  className={`flex flex-col overflow-hidden ${weekAccent.bodyBg}`}
                >
                  <CompletedDaysRibbon
                    days={completedDaysForRibbon}
                    tone={weekAllDone ? 'success' : hasCurrentDay ? 'brand' : 'muted'}
                    selectedDayNum={ribbonOpenedDayNum}
                    onToggleDay={toggleRibbonCompletedDay}
                  />
                  <div
                    ref={(el) => {
                      if (el) weekDaysScrollRefs.current.set(weekNum, el);
                      else weekDaysScrollRefs.current.delete(weekNum);
                    }}
                    className={`min-h-0 space-y-2 overflow-y-auto overscroll-y-auto px-3 pt-2 ${mode === 'embedded' ? 'pb-24' : 'pb-6'} ${weekDaysScrollLayout}`}
                  >
                    {ribbonOpenedDayNum != null &&
                      (() => {
                        const d = days.find((x) => x.day === ribbonOpenedDayNum);
                        if (!d || dayUiState(d) !== 'completed') return null;
                        return (
                          <DayPlanRow
                            key={`ribbon-detail-${d.day}`}
                            day={d}
                            ui="completed"
                            kunlikRows={kunlikRows}
                            practicePromptCount={practicePromptCountByDay.get(d.day) ?? 0}
                            expanded={expandedDayNum === d.day}
                            dayAccent={weekAccent.dayAccent}
                            rootRef={(el) => {
                              if (el) dayRowRefs.current.set(d.day, el);
                              else dayRowRefs.current.delete(d.day);
                            }}
                            onToggleExpand={() => {
                              setExpandedDayNum((prev) => (prev === d.day ? null : d.day));
                            }}
                            onNavigateBlock={(block) => navigateToBlock(d, block)}
                            onMarkReview={() => persistReview(d.day)}
                            reviewDone={Boolean(reviewVisits[d.day]) || isServerDone(d.day, 'review')}
                            results={results}
                            reviewVisits={reviewVisits}
                            isServerDone={isServerDone}
                            hasSubscription={Boolean(access?.subscription_active)}
                          />
                        );
                      })()}
                    {activeDaysInWeek.length === 0 && ribbonOpenedDayNum == null ? (
                      <p className="py-6 text-center text-[13px] font-semibold text-emerald-800/90">
                        Bu haftaning barcha kunlari yakunlandi.
                      </p>
                    ) : (
                      <>
                        {activeDaysInWeek.flatMap((day) => {
                          const rowNode = (
                            <DayPlanRow
                              key={day.day}
                              day={day}
                              ui={dayUiState(day)}
                              kunlikRows={kunlikRows}
                              practicePromptCount={practicePromptCountByDay.get(day.day) ?? 0}
                              expanded={expandedDayNum === day.day && dayUiState(day) !== 'locked'}
                              dayAccent={weekAccent.dayAccent}
                              rootRef={(el) => {
                                if (el) dayRowRefs.current.set(day.day, el);
                                else dayRowRefs.current.delete(day.day);
                              }}
                              onToggleExpand={() =>
                                setExpandedDayNum((prev) => (prev === day.day ? null : day.day))
                              }
                              onNavigateBlock={(block) => navigateToBlock(day, block)}
                              onMarkReview={() => persistReview(day.day)}
                              reviewDone={Boolean(reviewVisits[day.day]) || isServerDone(day.day, 'review')}
                              results={results}
                              reviewVisits={reviewVisits}
                              isServerDone={isServerDone}
                              hasSubscription={hasSubscription}
                            />
                          );

                          if (showPremiumBetweenDaysCta && day.day === premiumEntryDay) {
                            return [
                              <motion.button
                                key={`premium-between-day-${weekNum}-${premiumEntryDay}`}
                                type="button"
                                onClick={() => navigate('/tariflar')}
                                whileTap={{ scale: 0.985 }}
                                whileHover={{ y: -1 }}
                                className="group relative flex min-h-[50px] w-full items-center justify-center gap-2 overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 px-4 py-3 text-sm font-extrabold text-amber-950 shadow-[0_12px_26px_rgba(245,158,11,0.25)] ring-1 ring-amber-200/60"
                              >
                                <motion.span
                                  aria-hidden
                                  className="pointer-events-none absolute inset-y-0 -left-10 w-8 rotate-12 bg-white/45 blur-[1px]"
                                  animate={{ x: [-12, 520] }}
                                  transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 0.9, ease: 'easeOut' }}
                                />
                                <Play className="h-4 w-4 fill-current" />
                                Premium sotib olish
                              </motion.button>,
                              rowNode,
                            ];
                          }

                          return [rowNode];
                        })}
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

function CompletedDaysRibbon({
  days,
  tone,
  selectedDayNum,
  onToggleDay,
}: {
  days: DayPlan[];
  tone: 'brand' | 'success' | 'muted';
  selectedDayNum: number | null;
  onToggleDay: (dayNum: number) => void;
}) {
  if (!days.length) return null;

  const shell =
    tone === 'muted'
      ? 'border-slate-200/95 bg-white/85'
      : 'border-white/30 bg-black/[0.07]';

  const labelCls = tone === 'muted' ? 'text-slate-500' : 'text-white/80';

  const chipCls =
    tone === 'muted'
      ? 'bg-emerald-50 text-emerald-900 ring-emerald-100'
      : 'bg-white/95 text-emerald-900 ring-white/35';

  const selectedRing =
    tone === 'muted'
      ? 'ring-blue-600 ring-offset-2 ring-offset-white'
      : 'ring-blue-600 ring-offset-2 ring-offset-transparent';

  return (
    <div className={`shrink-0 border-b px-3 py-2 ${shell}`}>
      <p className={`mb-2 text-[10px] font-bold uppercase tracking-wide ${labelCls}`}>Yakunlangan kunlar</p>
      <div className="flex flex-wrap gap-2">
        {days.map((day) => {
          const selected = selectedDayNum === day.day;
          return (
            <button
              key={day.day}
              type="button"
              onClick={() => onToggleDay(day.day)}
              aria-pressed={selected}
              aria-label={
                selected ? `${day.day}-kun kartasini yopish` : `${day.day}-kun kartasini ochish`
              }
              className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-semibold shadow-sm ring-1 transition-transform active:scale-[0.97] ${chipCls} ${selected ? `ring-2 ${selectedRing}` : ''}`}
            >
              <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} aria-hidden />
              <span className="tabular-nums">{day.day}-kun</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DayPlanRow({
  day,
  ui,
  kunlikRows,
  practicePromptCount,
  expanded,
  dayAccent,
  rootRef,
  onToggleExpand,
  onNavigateBlock,
  onMarkReview,
  reviewDone,
  results,
  reviewVisits,
  isServerDone,
  hasSubscription,
}: {
  day: DayPlan;
  ui: DayUiState;
  kunlikRows: Map<number, KunlikDayProgress>;
  practicePromptCount: number;
  expanded: boolean;
  dayAccent: string;
  rootRef: (el: HTMLDivElement | null) => void;
  onToggleExpand: () => void;
  onNavigateBlock: (block: DayBlock) => void;
  onMarkReview: () => void;
  reviewDone: boolean;
  results: ReturnType<typeof useSequentialLesson>['results'];
  reviewVisits: Record<number, true>;
  isServerDone: (dayNum: number, kind: string) => boolean;
  hasSubscription: boolean;
}) {
  const navigate = useNavigate();

  const kunlikRow = kunlikRows.get(day.day);
  const quest = getKunlikQuestProgressSlice(
    day,
    results,
    reviewVisits,
    isServerDone,
    kunlikRow,
    practicePromptCount,
  );
  const { blocksForGrid, readingDone, speakingDone } = quest;
  const pct =
    quest.total === 0 ? 0 : Math.min(100, Math.round((quest.done / quest.total) * 100));

  const allBlockKinds: Array<keyof typeof BLOCK_CONFIG> = [
    ...blocksForGrid.map((b) => b.kind as keyof typeof BLOCK_CONFIG),
    'text',
    'speaking',
  ];

  const isLocked = ui === 'locked';
  const isPremiumLocked = isLocked && !hasSubscription && day.day > FREE_DAILY_PLAN_DAY_LIMIT;

  const styles =
    ui === 'completed'
      ? {
          wrap: `bg-white border border-green-100 ${dayAccent}`,
          indicator: 'bg-gradient-to-br from-green-400 to-emerald-500 text-white',
          titleColor: 'text-gray-500',
        }
      : ui === 'current'
        ? {
            wrap: 'bg-white border-2 border-blue-300 shadow-sm shadow-blue-100/50',
            indicator: 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white ring-4 ring-blue-100',
            titleColor: 'text-gray-900',
          }
        : {
            wrap: 'border border-slate-200 bg-white shadow-[inset_0_1px_0_rgba(241,245,249,0.9)]',
            indicator: 'border border-slate-300 bg-slate-100 text-slate-600',
            titleColor: 'text-slate-700',
          };

  const expandedWrap = expanded && !isLocked
    ? '!border-blue-200 shadow-md shadow-blue-100/30'
    : '';

  return (
    <div ref={rootRef} className="scroll-mt-4">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl transition-all duration-200 ${styles.wrap} ${expandedWrap}`}
      >
        <button
          type="button"
          onClick={() => {
            if (!isLocked) onToggleExpand();
          }}
          className={`flex w-full items-center gap-3 p-3.5 text-left ${isLocked ? 'cursor-default' : ''}`}
          disabled={isLocked}
        >
          {ui === 'current' ? (
            <motion.div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full will-change-transform ${styles.indicator}`}
              animate={{ scale: [1, 1.08, 1], y: [0, -2, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
            >
              <Play className="ml-0.5 h-4 w-4 fill-current" />
            </motion.div>
          ) : (
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${styles.indicator}`}>
              {ui === 'completed' ? (
                <Check className="h-5 w-5" strokeWidth={3} />
              ) : isLocked ? (
                <Lock className="h-4 w-4" strokeWidth={2.25} />
              ) : (
                <span className="text-[13px] font-bold tabular-nums">{day.day}</span>
              )}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h4 className={`text-sm font-bold leading-tight ${styles.titleColor}`}>{day.day}-kun</h4>
              {ui === 'current' && !expanded && (
                <span className="shrink-0 text-[11px] font-semibold text-blue-600">Davom eting →</span>
              )}
              {ui === 'completed' && (
                <span className="shrink-0 text-[11px] font-semibold text-emerald-600">{pct}%</span>
              )}
              {isLocked && (
                <span className="shrink-0 text-[11px] font-semibold text-slate-500">Qulflangan</span>
              )}
            </div>
            {!expanded && !isLocked && (
              <div className="mt-1.5 flex items-center gap-1">
                {allBlockKinds.map((kind, i) => {
                  const cfg = BLOCK_CONFIG[kind];
                  const blockDone =
                    kind === 'text'
                      ? readingDone
                      : kind === 'speaking'
                        ? speakingDone
                        : (() => {
                            const b = blocksForGrid[i] ?? blocksForGrid[0];
                            return b
                              ? isBlockDoneLocallyForPlan(b, results, reviewVisits, day.day) ||
                                  isServerDone(day.day, b.kind)
                              : false;
                          })();
                  return (
                    <span
                      key={i}
                      className={`h-1.5 w-4 rounded-full transition-colors ${blockDone ? cfg.dot : 'bg-gray-200'}`}
                    />
                  );
                })}
              </div>
            )}
            {isLocked && (
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-[12px] font-medium leading-snug text-slate-500">
                  {isPremiumLocked
                    ? '1–2 kun bepul. 3-kundan Premium kerak'
                    : 'Avvalgi kunni tugatish kerak'}
                </p>
                {isPremiumLocked && (
                  <motion.button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/tariflar');
                    }}
                    whileTap={{ scale: 0.96 }}
                    animate={{
                      scale: [1, 1.04, 1],
                      boxShadow: [
                        '0 6px 16px rgba(245,158,11,0.18)',
                        '0 10px 22px rgba(245,158,11,0.3)',
                        '0 6px 16px rgba(245,158,11,0.18)',
                      ],
                    }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    className="relative min-h-[34px] overflow-hidden rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-300 px-3 py-1 text-[11px] font-extrabold tracking-wide text-amber-950 ring-1 ring-amber-200/70"
                  >
                    <motion.span
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 -left-8 w-6 rotate-12 bg-white/45 blur-[1px]"
                      animate={{ x: [-12, 64] }}
                      transition={{ duration: 1.3, repeat: Infinity, repeatDelay: 0.7, ease: 'easeOut' }}
                    />
                    <span className="relative">Premium</span>
                  </motion.button>
                )}
              </div>
            )}
          </div>

          {!isLocked && (
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0 self-center text-gray-400"
            >
              <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
            </motion.div>
          )}
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="space-y-3 border-t border-gray-100 px-3.5 pb-4 pt-3">
                <div>
                  <p className="line-clamp-2 text-[12px] font-medium leading-relaxed text-gray-500">{day.title}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                      />
                    </div>
                    <span className="text-[11px] font-bold tabular-nums text-gray-500">{pct}%</span>
                  </div>
                </div>

                <QuestBlocks
                  steps={buildKunlikQuestSteps({
                    day,
                    quest,
                    results,
                    reviewVisits,
                    isServerDone,
                    reviewDone,
                    navigate,
                    onNavigateBlock,
                    onMarkReview,
                  })}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
