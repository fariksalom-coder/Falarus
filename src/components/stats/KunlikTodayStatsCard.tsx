import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Brain, CheckCircle2, ChevronRight, FileText, Mic } from 'lucide-react';
import { getDailyCourseDay } from '../../api/dailyCourse';
import { DAILY_PLAN, TOTAL_DAYS } from '../../data/dailyPlan';
import { useLocale } from '../../context/LocaleContext';
import { useSequentialLesson } from '../../context/SequentialLessonContext';
import { useKunlikProgress } from '../../hooks/useKunlikProgress';
import { loadDailyVocabProgress } from '../../utils/dailyVocabProgress';
import {
  allPlanDaysComplete,
  buildPlanServerDoneChecker,
  findFirstIncompletePlanDay,
  getKunlikQuestProgressSlice,
  readPlanReviewVisits,
} from '../../utils/kunlikPlanDayProgress';
import { kunlikRejaPath } from '../../utils/kunlikNavigation';

type RowStatProps = {
  icon: typeof Brain;
  label: string;
  value: string;
  doneVisual: boolean | 'partial';
};

function RowStat({ icon: Icon, label, value, doneVisual }: RowStatProps) {
  const valueColor =
    doneVisual === true
      ? 'text-emerald-700 dark:text-emerald-300'
      : doneVisual === 'partial'
        ? 'text-blue-700 dark:text-blue-300'
        : 'text-slate-600 dark:text-slate-300';
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-app-border bg-app-surface-elevated px-3 py-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-app-icon-bg text-app-primary">
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-app-text">{label}</p>
        <p className={`mt-0.5 text-[13px] font-medium leading-snug ${valueColor}`}>{value}</p>
      </div>
    </div>
  );
}

export type KunlikTodayStatsCardProps = {
  token: string | null;
};

export function KunlikTodayStatsCard({ token }: KunlikTodayStatsCardProps) {
  const navigate = useNavigate();
  const { t } = useLocale();
  const { results, isReady } = useSequentialLesson();
  const { rows: kunlikRows, loaded: kunlikLoaded, practicePromptCountByDay } = useKunlikProgress();
  const [reviewVisits, setReviewVisits] = useState<Record<number, true>>(readPlanReviewVisits);
  const [vocabTick, setVocabTick] = useState(0);
  /** Kunlik kun paketi: gapirish soni + o‘qish bor-yo‘qligi (statik rejadan emas) */
  const [bundleMeta, setBundleMeta] = useState<{
    practiceLen: number;
    hasReading: boolean;
  } | null>(null);

  useEffect(() => {
    const onVisits = () => setReviewVisits(readPlanReviewVisits());
    window.addEventListener('storage', onVisits);
    window.addEventListener('lesson-task-saved', onVisits);
    return () => {
      window.removeEventListener('storage', onVisits);
      window.removeEventListener('lesson-task-saved', onVisits);
    };
  }, []);

  useEffect(() => {
    const onVocab = () => setVocabTick((x) => x + 1);
    window.addEventListener('daily-vocab-progress', onVocab as EventListener);
    return () => window.removeEventListener('daily-vocab-progress', onVocab as EventListener);
  }, []);

  void vocabTick;

  const focusDay = useMemo(
    () => findFirstIncompletePlanDay(results, reviewVisits, kunlikRows, practicePromptCountByDay),
    [results, reviewVisits, kunlikRows, practicePromptCountByDay],
  );

  const serverDone = useMemo(() => buildPlanServerDoneChecker(kunlikRows), [kunlikRows]);

  const planDay = useMemo(() => DAILY_PLAN.find((d) => d.day === focusDay), [focusDay]);

  const allDone = useMemo(
    () => allPlanDaysComplete(results, reviewVisits, kunlikRows, practicePromptCountByDay),
    [results, reviewVisits, kunlikRows, practicePromptCountByDay],
  );

  const row = kunlikRows.get(focusDay);
  const gDone = row
    ? ([row.grammar_1, row.grammar_2, row.grammar_3].filter(Boolean).length as number)
    : 0;
  const vocabProg = loadDailyVocabProgress(focusDay);
  let vSteps = 0;
  if (vocabProg.step1Completed) vSteps += 1;
  if (vocabProg.step2Passed) vSteps += 1;
  if (vocabProg.step3Completed) vSteps += 1;

  const speak = row?.speaking_level ?? 0;

  useEffect(() => {
    if (!token || focusDay < 1 || focusDay > TOTAL_DAYS) {
      setBundleMeta(null);
      return;
    }
    let cancelled = false;
    getDailyCourseDay(token, focusDay)
      .then((b) => {
        if (cancelled) return;
        const r = b.reading;
        const hasReading =
          Boolean(String(r?.bodyRu ?? '').trim()) || (r?.lexemes?.length ?? 0) > 0;
        setBundleMeta({
          practiceLen: b.practice?.length ?? 0,
          hasReading,
        });
      })
      .catch(() => {
        if (!cancelled) setBundleMeta(null);
      });
    return () => {
      cancelled = true;
    };
  }, [token, focusDay]);

  const bundlePracticeLen = bundleMeta?.practiceLen ?? null;
  const pt =
    bundlePracticeLen ??
    (focusDay >= 1 ? practicePromptCountByDay.get(focusDay) ?? 0 : 0);

  const questSlice = useMemo(() => {
    if (!planDay) return null;
    const countForSlice =
      bundlePracticeLen ?? practicePromptCountByDay.get(planDay.day) ?? 0;
    return getKunlikQuestProgressSlice(planDay, results, reviewVisits, serverDone, row, countForSlice);
  }, [planDay, results, reviewVisits, serverDone, row, bundlePracticeLen, practicePromptCountByDay]);

  const questProg = { done: questSlice?.done ?? 0, total: questSlice?.total ?? 0 };
  const readingDone = questSlice?.readingDone ?? false;

  const started =
    gDone > 0 || vSteps > 0 || readingDone || speak > 0 || questProg.done > 0;

  const fullDayDone = questProg.total > 0 && questProg.done >= questProg.total;

  const grammarLabel =
    gDone === 0
      ? t('stats.kunlikNone')
      : t('stats.kunlikGrammarFmt', { done: Math.min(gDone, 3), total: 3 });
  const grammarVisual: RowStatProps['doneVisual'] =
    gDone >= 3 ? true : gDone > 0 ? 'partial' : false;

  const vocabLabel =
    vSteps === 0
      ? t('stats.kunlikNone')
      : t('stats.kunlikVocabFmt', { done: Math.min(vSteps, 3), total: 3 });
  const vocabVisual: RowStatProps['doneVisual'] =
    vSteps >= 3 ? true : vSteps > 0 ? 'partial' : false;

  const readingLabel =
    readingDone
      ? t('stats.kunlikReadingDone')
      : token && bundleMeta !== null && !bundleMeta.hasReading
        ? t('stats.kunlikReadingNoContent')
        : t('stats.kunlikReadingTodo');
  const readingVisual: RowStatProps['doneVisual'] = readingDone ? true : false;

  let speakingLabel: string;
  if (pt === 0) speakingLabel = t('stats.kunlikSpeakingNoTasks');
  else {
    speakingLabel = speak <= 0 ? t('stats.kunlikNone') : t('stats.kunlikSpeakingFmt', { done: Math.min(speak, pt), total: pt });
  }
  const speakingVisual: RowStatProps['doneVisual'] =
    pt === 0 ? false : speak >= pt ? true : speak > 0 ? 'partial' : false;

  const showPrevChip = focusDay > 1 && !allDone;

  const goPlan = (day?: number) => navigate(kunlikRejaPath(day));

  let primaryAction: { label: string; onClick: () => void };
  if (allDone) {
    primaryAction = { label: t('stats.kunlikOpenPlan'), onClick: () => goPlan() };
  } else if (fullDayDone && focusDay < TOTAL_DAYS) {
    primaryAction = { label: t('home.nextDay'), onClick: () => goPlan(focusDay + 1) };
  } else if (!started) {
    primaryAction = { label: t('stats.kunlikStart'), onClick: () => goPlan(focusDay) };
  } else {
    primaryAction = { label: t('stats.kunlikContinue'), onClick: () => goPlan(focusDay) };
  }

  const loadingCard = !isReady || !kunlikLoaded;

  return (
    <div
      className="overflow-hidden rounded-[22px] border border-app-border bg-app-surface shadow-app-soft md:rounded-[24px]"
    >
      <div
        className="flex items-start justify-between gap-3 px-4 py-3.5"
        style={{
          background: 'linear-gradient(135deg, #2563EB 0%, #4F46E5 52%, #6366F1 100%)',
        }}
      >
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-white">
            {t('stats.kunlikToday')}
            {!loadingCard && planDay ? (
              <>
                {' '}<span className="text-white/90">·</span> {t('stats.kunlikDay', { day: focusDay })}
              </>
            ) : null}
          </p>
          <p className="mt-0.5 text-[11px] text-indigo-100">
            {t('stats.kunlikPlanSubtitlePrefix')}
            {loadingCard ? ' · …' : <> · {t('stats.kunlikBlocksSummary', { done: questProg.done, total: questProg.total })}</>}
          </p>
        </div>
      </div>

      <div className="space-y-3 px-4 py-4">
        {loadingCard ? (
          <p className="py-6 text-center text-sm text-app-text-muted">{t('common.loading')}</p>
        ) : (
          <>
            {showPrevChip ? (
              <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2 text-[12px] font-medium text-emerald-800 ring-1 ring-emerald-100 dark:bg-emerald-500/12 dark:text-emerald-300 dark:ring-emerald-500/20">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                {focusDay - 1 === 1
                  ? t('stats.kunlikPrevDaysSingle', { day: 1 })
                  : t('stats.kunlikPrevDaysRange', { from: 1, to: focusDay - 1 })}
              </div>
            ) : null}

            {allDone ? (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-4 text-center dark:border-emerald-500/25 dark:bg-emerald-500/10">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600 dark:text-emerald-400" aria-hidden />
                <p className="mt-2 text-lg font-bold text-emerald-800 dark:text-emerald-300">{t('stats.kunlikAllDone')}</p>
                <p className="mt-1 text-[13px] text-emerald-900/80 dark:text-emerald-200/80">{t('stats.kunlikAllDoneSub')}</p>
              </div>
            ) : fullDayDone ? (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-4 text-center dark:border-emerald-500/25 dark:bg-emerald-500/10">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600 dark:text-emerald-400" aria-hidden />
                <p className="mt-2 text-lg font-bold text-emerald-800 dark:text-emerald-300">{t('stats.kunlikCompleted')}</p>
                <p className="mt-1 text-[13px] text-emerald-900/80 dark:text-emerald-200/80">{t('stats.kunlikCompletedSub')}</p>
              </div>
            ) : null}

            {!allDone && !fullDayDone ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <RowStat icon={Brain} label={t('stats.kunlikGrammar')} value={grammarLabel} doneVisual={grammarVisual} />
                <RowStat icon={BookOpen} label={t('stats.kunlikVocab')} value={vocabLabel} doneVisual={vocabVisual} />
                <RowStat icon={FileText} label={t('stats.kunlikReading')} value={readingLabel} doneVisual={readingVisual} />
                <RowStat icon={Mic} label={t('stats.kunlikSpeaking')} value={speakingLabel} doneVisual={speakingVisual} />
              </div>
            ) : null}

            <button
              type="button"
              onClick={primaryAction.onClick}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 py-3.5 text-[14px] font-semibold text-white shadow-[0_14px_28px_rgba(79,70,229,0.28)] transition hover:brightness-[1.03] active:scale-[0.99]"
            >
              {primaryAction.label}
              <ChevronRight className="h-4 w-4 opacity-90" aria-hidden />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
