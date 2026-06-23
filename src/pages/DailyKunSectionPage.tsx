import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, Link2, ListChecks, Lock, Puzzle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getDailyCourseDay } from '../api/dailyCourse';
import type { DailyCourseDayBundle } from '../../shared/dailyCourseDay';
import { isValidDailyCourseDay, FREE_KUNLIK_DAY_LIMIT } from '../../shared/dailyCourseDay';
import { LessonTheoryCollapsible } from '../components/lesson/LessonTheoryCollapsible';
import { VocabularyTaskList } from '../components/vocabulary/VocabularyTaskList';
import { InteractiveDailyReading } from '../components/daily/InteractiveDailyReading';
import SpeakingExercise from '../components/speaking/SpeakingExercise';
import type { SpeakingTask } from '../api/speaking';
import type { KunlikDayPatch } from '../api/kunlikProgress';
import { loadDailyVocabProgress } from '../utils/dailyVocabProgress';
import { kunlikRejaPath } from '../utils/kunlikNavigation';
import { useRememberKunlikDay } from '../hooks/useRememberKunlikDay';
import { useLocale } from '../context/LocaleContext';
import {
  KunlikSequentialGateSpinner,
  useKunlikSequentialGate,
} from '../hooks/useKunlikSequentialGate';
import { useKunlikProgress } from '../hooks/useKunlikProgress';
import { useAccess } from '../context/AccessContext';
import KunlikFreeLimitModal from '../components/KunlikFreeLimitModal';

const SECTIONS = ['grammatika', 'lugat', 'oqish', 'gapirish'] as const;
export type KunlikSection = (typeof SECTIONS)[number];

export default function DailyKunSectionPage() {
  const { dayNum, section } = useParams<{ dayNum: string; section: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { t } = useLocale();
  const dayNumber = Number(dayNum ?? '');
  const sec = section as KunlikSection;
  useRememberKunlikDay(dayNumber);

  const [bundle, setBundle] = useState<DailyCourseDayBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const validSection = SECTIONS.includes(sec as KunlikSection);
  const gateEnabled = isValidDailyCourseDay(dayNumber) && validSection;
  const { gatePending } = useKunlikSequentialGate(dayNumber, gateEnabled);

  useEffect(() => {
    if (!token || !isValidDailyCourseDay(dayNumber) || !validSection) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErr(null);
    getDailyCourseDay(token, dayNumber)
      .then((b) => {
        if (!cancelled) setBundle(b);
      })
      .catch((e: unknown) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : t('common.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, dayNumber, validSection, t]);

  if (!isValidDailyCourseDay(dayNumber) || !validSection) {
    return (
      <div className="flex min-h-screen flex-col bg-[#F5F7FA] px-4 py-6">
        <button
          type="button"
          onClick={() => navigate(kunlikRejaPath(dayNumber))}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-gray-600"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </button>
        <p className="text-center text-gray-600">{t('common.pageNotFound')}</p>
      </div>
    );
  }

  if (gatePending) {
    return <KunlikSequentialGateSpinner />;
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] pb-28">
      <main className="mx-auto max-w-md space-y-4 px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => navigate(kunlikRejaPath(dayNumber))}
          className="flex min-h-[44px] items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          {t('common.back')}
        </button>
        {loading && (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        )}
        {!loading && err && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</div>
        )}
        {!loading && !err && bundle && sec === 'grammatika' && (
          <GrammarFromBundle dayNumber={dayNumber} bundle={bundle} />
        )}
        {!loading && !err && bundle && sec === 'lugat' && (
          <DailyVocabHub dayNumber={dayNumber} bundle={bundle} />
        )}
        {!loading && !err && bundle && sec === 'oqish' && (
          <ReadingFromBundle bundle={bundle} dayNumber={dayNumber} />
        )}
        {!loading && !err && bundle && sec === 'gapirish' && (
          <PracticeFromBundle bundle={bundle} dayNumber={dayNumber} />
        )}
      </main>
    </div>
  );
}

function GrammarFromBundle({ dayNumber, bundle }: { dayNumber: number; bundle: DailyCourseDayBundle }) {
  const navigate = useNavigate();
  const { getDay, loaded: kunlikLoaded, patchDay } = useKunlikProgress();
  const grammarGapPatchSent = useRef(false);
  const g = bundle.grammar;
  const kp = kunlikLoaded ? getDay(dayNumber) : null;

  useEffect(() => {
    grammarGapPatchSent.current = false;
  }, [dayNumber]);

  useEffect(() => {
    if (!kunlikLoaded || !g || grammarGapPatchSent.current) return;
    const patch: KunlikDayPatch = {};
    const usableSentence = g.sentenceArrange.filter(
      (t) => t.wordBank.length > 0 && String(t.answerRu ?? '').trim() !== '',
    );
    const hasAnyGrammarContent =
      g.ruleMcqs.length > 0 ||
      g.sentenceMcqs.length > 0 ||
      g.matchSets.some((s) => s.pairs.length > 0) ||
      usableSentence.length > 0 ||
      Boolean(g.topic && (g.topic.title || g.topic.theoryText));

    // Only auto-complete grammar_1 for truly empty grammar days.
    if (!hasAnyGrammarContent) patch.grammar_1 = true;
    if (!g.matchSets.some((s) => s.pairs.length > 0)) patch.grammar_2 = true;
    if (usableSentence.length === 0) patch.grammar_3 = true;
    if (Object.keys(patch).length === 0) return;
    grammarGapPatchSent.current = true;
    patchDay(dayNumber, patch);
  }, [kunlikLoaded, g, dayNumber, patchDay]);
  if (!g) {
    return (
      <div className="space-y-6">
        <div className="rounded-[24px] border border-slate-200/90 bg-white p-5 shadow-[0_14px_34px_rgba(148,163,184,0.12)]">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-200/90 animate-pulse" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3.5 w-36 rounded-md bg-slate-200 animate-pulse" />
              <div className="h-3 w-full max-w-[14rem] rounded bg-slate-100 animate-pulse" />
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="h-3 w-full rounded bg-slate-100 animate-pulse" />
            <div className="h-3 w-[94%] rounded bg-slate-100 animate-pulse" />
            <div className="h-3 w-[82%] rounded bg-slate-100 animate-pulse" />
            <div className="h-3 w-[70%] rounded bg-slate-100 animate-pulse" />
          </div>
        </div>
        <DailyGrammarMashqlarGrid
          kunlikLoaded={kunlikLoaded}
          grammar1Done={kp.grammar_1}
          grammar2Done={kp.grammar_2}
          grammar3Done={kp.grammar_3}
          ruleMcqsCount={0}
          matchSetsCount={0}
          sentenceArrangeCount={0}
          sentenceMcqsCount={0}
        />
      </div>
    );
  }

  const theoryBody =
    g.topic && (g.topic.title || g.topic.theoryText) ? (
      <div className="space-y-3">
        {g.topic.title ? <p className="text-base font-bold text-slate-900">{g.topic.title}</p> : null}
        <div className="max-h-[min(52vh,28rem)] overflow-y-auto whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800">
          {g.topic.theoryText}
        </div>
      </div>
    ) : null;

  if (!kunlikLoaded) {
    return (
      <div className="space-y-6">
        {theoryBody ? (
          <LessonTheoryCollapsible
            surface="white"
            defaultExpanded={false}
            showToggleText={false}
            bodyClassName="mt-4 space-y-4 text-sm leading-relaxed text-slate-800"
          >
            {theoryBody}
          </LessonTheoryCollapsible>
        ) : null}
        <div className="rounded-[24px] border border-slate-200/90 bg-white p-5 shadow-[0_14px_34px_rgba(148,163,184,0.12)]">
          <p className="mb-3 text-sm font-semibold text-slate-600">Mashqlar</p>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="mx-auto h-9 w-9 animate-pulse rounded-xl bg-slate-200" />
                <div className="mt-3 h-3 w-full animate-pulse rounded bg-slate-200" />
                <div className="mt-2 h-2.5 w-2/3 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {theoryBody ? (
        <LessonTheoryCollapsible
          surface="white"
          defaultExpanded={false}
          showToggleText={false}
          bodyClassName="mt-4 space-y-4 text-sm leading-relaxed text-slate-800"
        >
          {theoryBody}
        </LessonTheoryCollapsible>
      ) : null}

      <DailyGrammarMashqlarGrid
        kunlikLoaded={kunlikLoaded}
        grammar1Done={kp?.grammar_1 ?? false}
        grammar2Done={kp?.grammar_2 ?? false}
        grammar3Done={kp?.grammar_3 ?? false}
        ruleMcqsCount={g.ruleMcqs.length}
        matchSetsCount={g.matchSets.filter((s) => s.pairs.length > 0).length}
        sentenceArrangeCount={g.sentenceArrange.length}
        sentenceMcqsCount={g.sentenceMcqs.length}
        onOpenTest={
          g.ruleMcqs.length > 0
            ? () => navigate(`/kunlik-reja/kun/${dayNumber}/grammatika/test-variantlar`)
            : undefined
        }
        onOpenMatch={
          g.matchSets.some((s) => s.pairs.length > 0)
            ? () => navigate(`/kunlik-reja/kun/${dayNumber}/grammatika/juftlik`)
            : undefined
        }
        onOpenSentence={
          g.sentenceArrange.some((s) => s.wordBank.length > 0 && String(s.answerRu ?? '').trim() !== '')
            ? () => navigate(`/kunlik-reja/kun/${dayNumber}/grammatika/gap-tuzish`)
            : undefined
        }
      />
    </div>
  );
}

function DailyGrammarMashqlarGrid({
  kunlikLoaded,
  grammar1Done,
  grammar2Done,
  grammar3Done,
  ruleMcqsCount,
  matchSetsCount,
  sentenceArrangeCount,
  sentenceMcqsCount,
  onOpenTest,
  onOpenMatch,
  onOpenSentence,
}: {
  kunlikLoaded: boolean;
  grammar1Done: boolean;
  grammar2Done: boolean;
  grammar3Done: boolean;
  ruleMcqsCount: number;
  matchSetsCount: number;
  sentenceArrangeCount: number;
  sentenceMcqsCount: number;
  onOpenTest?: () => void;
  onOpenMatch?: () => void;
  onOpenSentence?: () => void;
}) {
  const { t } = useLocale();
  type Row = {
    vazifaNum: number;
    hint: string;
    Icon: LucideIcon;
    count: number;
    onPress?: () => void;
    emptyHint: string;
    sequentialLocked: boolean;
    seqHint: string | null;
  };

  const unlock2 =
    kunlikLoaded &&
    (ruleMcqsCount === 0 || grammar1Done || grammar2Done || grammar3Done);
  const unlock3 =
    kunlikLoaded &&
    (matchSetsCount === 0 || grammar2Done || grammar3Done) &&
    unlock2;

  const rows: Row[] = [
    {
      vazifaNum: 1,
      hint: t('kunlik.selectAnswer'),
      Icon: ListChecks,
      count: ruleMcqsCount,
      onPress: onOpenTest,
      emptyHint: t('kunlik.noQuestions'),
      sequentialLocked: false,
      seqHint: null,
    },
    {
      vazifaNum: 2,
      hint: t('kunlik.stepPairs'),
      Icon: Link2,
      count: matchSetsCount,
      onPress: onOpenMatch,
      emptyHint: t('kunlik.noMatchPairs'),
      sequentialLocked: matchSetsCount > 0 && !unlock2,
      seqHint: t('kunlik.seqHint2'),
    },
    {
      vazifaNum: 3,
      hint: t('kunlik.arrangeSentence'),
      Icon: Puzzle,
      count: sentenceArrangeCount,
      onPress: onOpenSentence,
      emptyHint: t('kunlik.noTasks'),
      sequentialLocked: sentenceArrangeCount > 0 && !unlock3,
      seqHint: t('kunlik.seqHint3'),
    },
  ];

  return (
    <div className="mt-2">
      <p className="mb-3 text-sm font-semibold text-slate-600">{t('kunlik.exercises')}</p>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {rows.map(({ vazifaNum, hint, Icon, count, onPress, emptyHint, sequentialLocked, seqHint }) => {
          const empty = count === 0;
          const actionable = count > 0 && !!onPress && !sequentialLocked;
          const comingSoon = count > 0 && !onPress && !sequentialLocked;

          const slotDone =
            vazifaNum === 1 ? grammar1Done : vazifaNum === 2 ? grammar2Done : grammar3Done;
          const showCompleted = count > 0 && slotDone && !sequentialLocked;
          const isCurrentTask = actionable && !slotDone;

          const cardInteractive = actionable
            ? isCurrentTask
              ? 'cursor-pointer hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-[0_14px_36px_rgba(37,99,235,0.22)] active:scale-[0.98]'
              : 'cursor-pointer hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_14px_36px_rgba(16,185,129,0.14)] active:scale-[0.98]'
            : sequentialLocked || comingSoon
              ? 'cursor-not-allowed opacity-[0.88]'
              : 'cursor-not-allowed opacity-[0.72] grayscale-[0.35]';

          const shell = empty
            ? 'border-slate-200/90 bg-gradient-to-b from-slate-100/90 to-white'
            : sequentialLocked
              ? 'border-slate-200/95 bg-gradient-to-b from-slate-100 to-slate-50/90 shadow-sm'
              : comingSoon
                ? 'border-slate-200/95 bg-gradient-to-b from-slate-50 to-white shadow-sm'
                : isCurrentTask
                  ? 'border-[#2563EB]/45 bg-gradient-to-b from-blue-50 via-blue-50/70 to-white shadow-[0_10px_30px_rgba(37,99,235,0.14)] ring-1 ring-[#2563EB]/20'
                  : showCompleted
                    ? 'border-emerald-200/95 bg-gradient-to-b from-emerald-50 via-emerald-50/50 to-white shadow-[0_10px_30px_rgba(16,185,129,0.1)]'
                    : 'border-emerald-200/95 bg-gradient-to-b from-emerald-50 via-emerald-50/50 to-white shadow-[0_10px_30px_rgba(16,185,129,0.12)]';

          const iconBg = empty
            ? 'bg-slate-200/90 text-slate-500 ring-slate-200/80'
            : sequentialLocked
              ? 'bg-slate-200/90 text-slate-500 ring-slate-300/80'
              : comingSoon
                ? 'bg-slate-100 text-slate-500 ring-slate-200'
                : isCurrentTask
                  ? 'bg-blue-100 text-[#2563EB] ring-blue-200/90'
                  : showCompleted
                    ? 'bg-emerald-100 text-emerald-700 ring-emerald-200/90'
                    : 'bg-emerald-100 text-emerald-700 ring-emerald-200/90';

          const badgeBg = empty
            ? 'bg-slate-200/80 text-slate-500 ring-slate-200'
            : sequentialLocked
              ? 'bg-slate-200/90 text-slate-600 ring-slate-300/60'
              : comingSoon
                ? 'bg-slate-100 text-slate-600 ring-slate-200'
                : isCurrentTask
                  ? 'bg-blue-100 text-blue-900 ring-blue-300/50'
                  : showCompleted
                    ? 'bg-emerald-100/95 text-emerald-900 ring-emerald-300/40'
                    : 'bg-emerald-100/95 text-emerald-900 ring-emerald-300/40';

          const titleCls = empty
            ? 'text-slate-500'
            : sequentialLocked || comingSoon
              ? 'text-slate-600'
              : isCurrentTask
                ? 'text-[#0F172A]'
                : 'text-slate-800';

          const hintCls = empty
            ? 'text-slate-400'
            : sequentialLocked || comingSoon
              ? 'text-slate-500'
              : isCurrentTask
                ? 'text-blue-950/90'
                : showCompleted
                  ? 'text-emerald-950/85'
                  : 'text-emerald-950/85';

          const inner = (
            <>
              <div className="flex h-9 w-full shrink-0 items-center justify-center sm:h-11">
                <span className={`flex h-9 w-9 items-center justify-center rounded-full shadow-inner ring-1 sm:h-10 sm:w-10 ${iconBg}`}>
                  {sequentialLocked ? (
                    <Lock className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2} aria-hidden />
                  ) : (
                    <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2} aria-hidden />
                  )}
                </span>
              </div>
              <div className="flex min-h-[2rem] items-center justify-center px-0.5">
                <span className={`text-center text-[10px] font-bold uppercase tracking-wide sm:text-[11px] ${titleCls}`}>
                  Vazifa {vazifaNum}
                </span>
              </div>
              <div className="flex h-5 items-center justify-center">
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold tabular-nums ring-1 sm:text-[10px] ${badgeBg}`}>
                  {count > 0 ? t('kunlik.countItems', { count }) : '—'}
                </span>
              </div>
              <div className="flex min-h-[2.25rem] flex-1 items-start justify-center overflow-hidden pt-0.5">
                <span className={`line-clamp-3 text-center text-[9px] font-medium leading-snug sm:text-[10px] ${hintCls}`}>
                  {sequentialLocked && seqHint ? seqHint : hint}
                </span>
              </div>
              {empty ? (
                <span className="mt-1 line-clamp-2 text-center text-[8px] font-medium text-slate-400 sm:text-[9px]">{emptyHint}</span>
              ) : comingSoon ? (
                <span className="mt-1 line-clamp-2 text-center text-[8px] font-medium text-emerald-700/80 sm:text-[9px]">
                  {t('kunlik.soon')}
                </span>
              ) : null}
              {isCurrentTask ? (
                <span className="pointer-events-none mt-2 flex w-full shrink-0 justify-center px-0.5">
                  <span className="w-full max-w-[7.5rem] rounded-xl bg-[#2563EB] py-2 text-center text-[10px] font-extrabold tracking-wide text-white shadow-[0_8px_20px_rgba(37,99,235,0.35)] sm:max-w-none sm:text-[11px]">
                    {t('common.start')}
                  </span>
                </span>
              ) : null}
            </>
          );

          return (
            <button
              key={vazifaNum}
              type="button"
              disabled={empty || sequentialLocked}
              aria-disabled={empty || sequentialLocked || comingSoon}
              onClick={() => {
                if (actionable) onPress?.();
              }}
              className={`relative box-border flex min-h-[9rem] w-full shrink-0 flex-col items-stretch rounded-[20px] border-2 p-2 text-center transition-all sm:min-h-[10.5rem] sm:rounded-[24px] sm:p-3 ${shell} ${cardInteractive}`}
            >
              {inner}
            </button>
          );
        })}
      </div>
      {sentenceMcqsCount > 0 ? (
        <p className="mt-3 text-center text-xs text-slate-500">
          {t('kunlik.sentenceTestSoon', { count: sentenceMcqsCount })}
        </p>
      ) : null}
    </div>
  );
}

function DailyVocabHub({ dayNumber, bundle }: { dayNumber: number; bundle: DailyCourseDayBundle }) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { getDay } = useKunlikProgress();
  const w = bundle.vocabulary;
  const totalWords = w?.words?.length ?? 0;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    window.addEventListener('daily-vocab-progress', fn as EventListener);
    return () => window.removeEventListener('daily-vocab-progress', fn as EventListener);
  }, []);

  void tick;

  if (!w?.words?.length) {
    return (
      <p className="rounded-2xl border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-600 shadow-sm">
        {t('kunlik.noVocabRows')}
      </p>
    );
  }

  const p = loadDailyVocabProgress(dayNumber);
  const kp = getDay(dayNumber);
  const vocabDoneOnServer = kp.words_match;
  const step1CompletedUi = p.step1Completed || kp.words_learned > 0 || vocabDoneOnServer;
  const step2PassedUi = p.step2Passed || vocabDoneOnServer;
  const step3CompletedUi = p.step3Completed || vocabDoneOnServer;
  const learnedWords = step2PassedUi
    ? totalWords
    : p.step2Completed
      ? p.step2Correct
      : step1CompletedUi
        ? Math.max(p.step1Known, kp.words_learned)
        : 0;

  const step2Pct =
    p.step2Completed && p.step2Correct + p.step2Incorrect > 0
      ? Math.round((p.step2Correct / (p.step2Correct + p.step2Incorrect)) * 100)
      : 0;

  const base = `/kunlik-reja/kun/${dayNumber}/lugat`;

  return (
    <VocabularyTaskList
      partTitle={t('kunlik.vocabWords')}
      learnedWords={learnedWords}
      totalWords={totalWords}
      hasServerSnapshot={totalWords > 0}
      step1Completed={step1CompletedUi}
      step1KnownDisplay={Math.max(p.step1Known, kp.words_learned)}
      step1UnknownDisplay={p.step1Unknown}
      step2Completed={p.step2Completed || vocabDoneOnServer}
      step2Passed={step2PassedUi}
      step2CorrectDisplay={Math.max(p.step2Correct, kp.words_correct)}
      step2IncorrectDisplay={p.step2Incorrect}
      step2PercentageDisplay={step2Pct}
      step3Unlocked={step2PassedUi}
      step3Completed={step3CompletedUi}
      onOpenStep1={() => navigate(`${base}/tanishish`)}
      onOpenStep2={() => navigate(`${base}/test`)}
      onOpenStep3={() => navigate(`${base}/juftlik`)}
    />
  );
}

function ReadingFromBundle({ bundle, dayNumber }: { bundle: DailyCourseDayBundle; dayNumber: number }) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { patchDay, getDay } = useKunlikProgress();
  const r = bundle.reading;
  const oqishDone = getDay(dayNumber).oqish_done;
  const [finishReady, setFinishReady] = useState(oqishDone);

  useEffect(() => {
    if (oqishDone) {
      setFinishReady(true);
      return;
    }
    setFinishReady(false);
    const id = window.setTimeout(() => setFinishReady(true), 10_000);
    return () => window.clearTimeout(id);
  }, [oqishDone, dayNumber]);

  if (!r?.bodyRu && !(r?.lexemes?.length)) {
    return (
      <p className="rounded-2xl border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-600 shadow-sm">
        {t('kunlik.noReadingContent')}
      </p>
    );
  }

  const finishReading = () => {
    patchDay(dayNumber, { oqish_done: true });
    navigate(kunlikRejaPath(dayNumber));
  };

  return (
    <div className="space-y-5">
      <InteractiveDailyReading title={null} bodyRu={r.bodyRu || ''} lexemes={r.lexemes} />

      <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
        {oqishDone ? (
          <p className="text-center text-sm font-semibold text-emerald-700">
            {t('kunlik.readingDoneAlready')}
          </p>
        ) : finishReady ? (
          <button
            type="button"
            onClick={finishReading}
            className="flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-4 py-3.5 text-[15px] font-bold text-white shadow-[0_14px_28px_rgba(79,70,229,0.28)] transition hover:brightness-[1.03] active:scale-[0.99]"
          >
            {t('common.finish')}
          </button>
        ) : (
          <p className="text-center text-[13px] leading-relaxed text-slate-500">
            {t('kunlik.readingFinishDelay', { seconds: 10 })}
          </p>
        )}
      </div>
    </div>
  );
}

function PracticeFromBundle({ bundle, dayNumber }: { bundle: DailyCourseDayBundle; dayNumber: number }) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { access } = useAccess();
  const premium = Boolean(access?.subscription_active);
  const { patchDay, getDay, loaded: kunlikLoaded } = useKunlikProgress();
  const [showFreeLimitModal, setShowFreeLimitModal] = useState(false);
  const [forceRetry, setForceRetry] = useState(() => searchParams.get('retry') === '1');
  const isRepeatSessionRef = useRef(searchParams.get('retry') === '1');
  const autoRetryStartedRef = useRef(false);
  const p = bundle.practice;

  const tasks: SpeakingTask[] = useMemo(
    () =>
      [...(p ?? [])]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((row) => ({
          id: row.id,
          uz_text: row.uzText,
          ru_correct: row.ruCorrect,
          topic: 'kunlik',
          level: 'daily',
          lesson_id: null,
          sort_order: row.sortOrder,
        })),
    [p],
  );

  const savedSpeaking = kunlikLoaded ? (getDay(dayNumber).speaking_level ?? 0) : 0;
  const allSpeakingDone =
    kunlikLoaded && tasks.length > 0 && savedSpeaking >= tasks.length && !forceRetry;

  useEffect(() => {
    if (!kunlikLoaded || isRepeatSessionRef.current) return;
    if (savedSpeaking >= tasks.length) {
      isRepeatSessionRef.current = true;
    }
  }, [kunlikLoaded, savedSpeaking, tasks.length]);

  useEffect(() => {
    if (!kunlikLoaded || autoRetryStartedRef.current) return;
    if (searchParams.get('retry') !== '1') return;
    if (savedSpeaking < tasks.length) return;

    autoRetryStartedRef.current = true;
    isRepeatSessionRef.current = true;
    setForceRetry(true);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('retry');
        return next;
      },
      { replace: true },
    );
  }, [kunlikLoaded, savedSpeaking, tasks.length, searchParams, setSearchParams]);

  const startSpeakingRetry = () => {
    isRepeatSessionRef.current = true;
    setForceRetry(true);
  };

  const finishSpeaking = () => {
    if (!forceRetry) {
      patchDay(dayNumber, { speaking_level: tasks.length });
    }
    if (!premium && dayNumber === FREE_KUNLIK_DAY_LIMIT && !isRepeatSessionRef.current) {
      setShowFreeLimitModal(true);
      return;
    }
    navigate(kunlikRejaPath(dayNumber));
  };

  if (!p?.length) {
    return (
      <p className="rounded-2xl border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-600 shadow-sm">
        {t('kunlik.noSpeakingTasks')}
      </p>
    );
  }

  if (!kunlikLoaded) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (allSpeakingDone) {
    return (
      <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-5 text-center shadow-sm">
        <p className="text-sm font-semibold text-emerald-800">{t('kunlik.speakingDoneAlready')}</p>
        <button
          type="button"
          onClick={() => navigate(kunlikRejaPath(dayNumber))}
          className="mt-4 min-h-[44px] w-full rounded-2xl border border-emerald-300 bg-white px-4 py-3 text-sm font-bold text-emerald-800 shadow-sm hover:bg-emerald-50"
        >
          {t('kunlik.backToPlan')}
        </button>
        <button
          type="button"
          onClick={startSpeakingRetry}
          className="mt-3 min-h-[44px] w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-700"
        >
          {t('home.questRepeat')}
        </button>
      </div>
    );
  }

  const resumeIdx = forceRetry ? 0 : Math.min(savedSpeaking, tasks.length - 1);
  const exerciseKey = `speaking-${dayNumber}-${forceRetry ? 'retry' : savedSpeaking}`;

  return (
    <>
      {showFreeLimitModal ? (
        <KunlikFreeLimitModal
          onClose={() => {
            setShowFreeLimitModal(false);
            navigate(kunlikRejaPath(dayNumber));
          }}
        />
      ) : null}
      <SpeakingExercise
        key={exerciseKey}
        tasks={tasks}
        topicLabel={t('kunlik.daySpeaking', { day: dayNumber })}
        useInlineCheck={true}
        kunlikDayNumber={dayNumber}
        embedded
        initialResumeIndex={resumeIdx}
        onCheckpoint={(completed) => {
          if (!forceRetry) patchDay(dayNumber, { speaking_level: completed });
        }}
        onFinish={finishSpeaking}
        onBack={() => navigate(kunlikRejaPath(dayNumber))}
      />
    </>
  );
}
