import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, CheckCircle2, ChevronRight } from 'lucide-react';
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

  const blocks = [
    { key: 'grammar', label: t('stats.kunlikGrammar'), value: grammarLabel, done: grammarVisual, emoji: '🧠' },
    { key: 'lugat', label: t('stats.kunlikVocab'), value: vocabLabel, done: vocabVisual, emoji: '📖' },
    { key: 'oqish', label: t('stats.kunlikReading'), value: readingLabel, done: readingVisual, emoji: '📄' },
    { key: 'gapirish', label: t('stats.kunlikSpeaking'), value: speakingLabel, done: speakingVisual, emoji: '🎤' },
  ];
  const doneCount = blocks.filter((b) => b.done === true).length;
  const totalBlocks = blocks.length;
  const currentIdx = blocks.findIndex((b) => b.done !== true);
  const pct = Math.round((doneCount / totalBlocks) * 100);
  const remainingMin = Math.max(0, (totalBlocks - doneCount) * 6);
  const gaugeRadius = 30;
  const gaugeC = 2 * Math.PI * gaugeRadius;

  return (
    <div className="overflow-hidden rounded-[26px] bg-pmn-card shadow-[0_18px_36px_-18px_rgba(15,27,59,0.28)] ring-1 ring-pmn-border">
      {/* Navy hero with gold guilloche + circular progress */}
      <div className="profile-guilloche relative overflow-hidden px-5 pt-5 pb-5 text-white">
        <div className="relative z-[2] flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="profile-gold-pill inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10.5px] font-black uppercase tracking-[0.18em]">
              Bugun · {focusDay}-kun
            </span>
            <h3 className="profile-heading mt-3 text-[26px] leading-none text-white">Kunlik reja</h3>
            <p className="mt-2 text-[12.5px] font-bold text-[#D4AC5C]">
              {doneCount} / {totalBlocks} blok bajarildi{remainingMin > 0 ? ` · ~${remainingMin} daqiqa qoldi` : ''}
            </p>
          </div>
          {/* Circular progress */}
          <div className="relative flex h-[76px] w-[76px] shrink-0 items-center justify-center">
            <svg viewBox="0 0 72 72" className="absolute inset-0 h-full w-full -rotate-90">
              <circle cx="36" cy="36" r={gaugeRadius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="6" />
              <circle
                cx="36"
                cy="36"
                r={gaugeRadius}
                fill="none"
                stroke="#D4AC5C"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={gaugeC}
                strokeDashoffset={gaugeC * (1 - pct / 100)}
              />
            </svg>
            <div className="relative text-center leading-none">
              <p className="profile-heading text-[18px] text-white">
                {pct}<span className="text-[11px] font-bold text-white/70">%</span>
              </p>
              <p className="mt-1 text-[8.5px] font-bold uppercase tracking-[0.2em] text-[#D4AC5C]">Bugun</p>
            </div>
          </div>
        </div>
      </div>

      {loadingCard ? (
        <p className="py-8 text-center text-sm text-app-text-muted">{t('common.loading')}</p>
      ) : (
        <div className="px-4 pt-4 pb-4">
          {/* Prev days chip — cream */}
          {showPrevChip ? (
            <div
              className="mb-3 flex items-center justify-between rounded-[16px] px-4 py-3 ring-1 ring-[#F1E5C0]"
              style={{ background: 'linear-gradient(90deg, rgba(245,212,143,0.16), rgba(212,172,92,0.10))' }}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[#0A1638]"
                  style={{ background: 'linear-gradient(150deg, #F5D48F 0%, #D4AC5C 100%)' }}
                >
                  <CheckCircle2 className="h-4 w-4" strokeWidth={2.6} aria-hidden />
                </span>
                <p className="text-[13px] font-black text-pmn-text">
                  {focusDay - 1 === 1
                    ? t('stats.kunlikPrevDaysSingle', { day: 1 })
                    : t('stats.kunlikPrevDaysRange', { from: 1, to: focusDay - 1 })}
                </p>
              </div>
              <span className="text-[11px] font-black text-pmn-gold-deep">{focusDay - 1}/{focusDay - 1}</span>
            </div>
          ) : null}

          {/* Vertical timeline */}
          <div className="relative">
            <div
              aria-hidden
              className="absolute left-[15px] top-4 bottom-4 w-px"
              style={{
                background: 'linear-gradient(to bottom, transparent, #E5E7EB 12px, #E5E7EB calc(100% - 12px), transparent)',
              }}
            />
            <div className="space-y-2.5">
              {blocks.map((b, i) => {
                const isDone = b.done === true;
                const isCurrent = i === currentIdx;
                const isLocked = !isDone && !isCurrent;
                return (
                  <div key={b.key} className="relative flex items-center gap-3">
                    {/* Timeline node */}
                    <div className="relative z-[2] flex h-8 w-8 shrink-0 items-center justify-center">
                      {isDone ? (
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-full text-[#0A1638] shadow-[0_6px_14px_-6px_rgba(212,172,92,0.55)]"
                          style={{ background: 'linear-gradient(150deg, #F5D48F 0%, #D4AC5C 100%)' }}
                        >
                          <CheckCircle2 className="h-4 w-4" strokeWidth={2.8} aria-hidden />
                        </div>
                      ) : isCurrent ? (
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-full text-white text-[12px] font-black shadow-[0_6px_14px_-6px_rgba(15,27,59,0.55)]"
                          style={{ background: '#0F1B3B' }}
                        >
                          {i + 1}
                        </div>
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-[#D8D6CE] text-[12px] font-black text-pmn-text-soft">
                          {i + 1}
                        </div>
                      )}
                    </div>

                    {/* Block card */}
                    <div
                      className={`flex flex-1 items-center gap-3 rounded-[16px] px-3 py-3 ring-1 ${
                        isCurrent
                          ? 'bg-pmn-pill ring-[#0F1B3B]/25'
                          : isDone
                            ? 'bg-pmn-card ring-pmn-border'
                            : 'bg-[#FAF9F5] ring-dashed ring-pmn-border'
                      }`}
                    >
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-[18px]"
                        style={{
                          background: isDone
                            ? 'linear-gradient(150deg, #F5D48F 0%, #F1E5C0 100%)'
                            : isCurrent
                              ? '#EEF3FF'
                              : '#F0EEE6',
                        }}
                      >
                        {b.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`flex items-center gap-2 text-[14px] font-black ${isLocked ? 'text-pmn-text-soft' : 'text-pmn-text'}`}>
                          <span>{b.label}</span>
                          {isCurrent ? (
                            <span
                              className="rounded-full px-2 py-0.5 text-[9.5px] font-black uppercase tracking-[0.14em] text-[#0A1638]"
                              style={{ background: 'linear-gradient(150deg, #F5D48F 0%, #D4AC5C 100%)' }}
                            >
                              Hozir
                            </span>
                          ) : null}
                        </p>
                        <p className={`mt-0.5 truncate text-[11.5px] font-semibold ${
                          isLocked ? 'text-[#B5AE97]' : isDone ? 'text-pmn-gold-deep' : 'text-[#5C5646]'
                        }`}>
                          {b.value}
                        </p>
                      </div>
                      {isDone ? (
                        <span className="shrink-0 rounded-full bg-[#F1E5C0]/60 px-3 py-1 text-[11px] font-black text-pmn-gold-deep ring-1 ring-[#E4DBBE]">
                          Bajarildi
                        </span>
                      ) : isCurrent ? (
                        <span
                          className="shrink-0 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#0A1638] ring-1 ring-[#E4C88A]"
                          style={{ background: 'linear-gradient(150deg, #F5D48F 0%, #E4C88A 100%)' }}
                        >
                          Sizning navbat
                        </span>
                      ) : (
                        <span aria-hidden className="text-[15px] text-[#B5AE97]">🔒</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom CTA */}
          <button
            type="button"
            onClick={primaryAction.onClick}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[14.5px] font-black text-white shadow-[0_14px_28px_-12px_rgba(15,27,59,0.45)] transition hover:brightness-[1.03] active:scale-[0.99]"
            style={{ background: 'linear-gradient(155deg, #16244A 0%, #0F1B3B 55%, #0A1638 100%)' }}
          >
            {primaryAction.label}
            <ChevronRight className="h-4 w-4 opacity-90" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
