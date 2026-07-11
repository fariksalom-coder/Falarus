import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, Link2, ListChecks, Puzzle } from 'lucide-react';
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

  const isGrammar = sec === 'grammatika';
  const isLugat = sec === 'lugat';
  const isOqish = sec === 'oqish';
  const usePurpleTheme = isGrammar || isLugat;
  const themeClass = usePurpleTheme ? 'grammar-theme' : isOqish ? 'reading-theme' : 'bg-[#F5F7FA]';
  return (
    <div className={`min-h-screen pb-28 ${themeClass}`}>
      <main className="mx-auto max-w-md space-y-4 px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top))]">
        {isOqish ? null : (
          <button
            type="button"
            onClick={() => navigate(kunlikRejaPath(dayNumber))}
            className={`flex min-h-[44px] items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition-colors ${
              usePurpleTheme
                ? 'border border-[#DDD7F5] bg-[color:var(--rd-white)] text-[#2D1B69] shadow-[0_4px_10px_rgba(91,76,224,0.08)]'
                : 'border border-gray-200 bg-[color:var(--rd-white)] text-gray-700 shadow-sm hover:bg-gray-50'
            }`}
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            {t('common.back')}
          </button>
        )}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#0B2A6B] border-t-transparent" />
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
        <div className="rounded-[24px] border border-slate-200/90 bg-[color:var(--rd-white)] p-5 shadow-[0_14px_34px_rgba(148,163,184,0.12)]">
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
        {g.topic.title ? <p className="text-base font-bold text-[#2D1B69]">{g.topic.title}</p> : null}
        <div className="max-h-[min(52vh,28rem)] overflow-y-auto whitespace-pre-wrap text-[15px] leading-relaxed text-[#463578]">
          {g.topic.theoryText}
        </div>
      </div>
    ) : null;

  const dayCaption = g.topic?.title ? `KUN ${dayNumber} · GRAMMATIKA` : '';

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
        <div className="rounded-[24px] border border-slate-200/90 bg-[color:var(--rd-white)] p-5 shadow-[0_14px_34px_rgba(148,163,184,0.12)]">
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
    <div className="space-y-5">
      {/* Day topic header — purple caption + big rounded title */}
      {g.topic?.title ? (
        <div className="mb-1">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8B7FAB]">
            {dayCaption}
          </p>
          <h1 className="grammar-heading mt-1.5 text-[26px] leading-[1.1] text-[#2D1B69]">
            {g.topic.title}
          </h1>
        </div>
      ) : null}

      {theoryBody ? (
        <GrammarTheoryCard title={g.topic?.title ?? ''}>
          {theoryBody}
        </GrammarTheoryCard>
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

function GrammarTheoryCard({ title, children }: { title: string; children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-[#DDD7F5] bg-[color:var(--rd-white)] p-4 shadow-[0_10px_28px_-14px_rgba(45,27,105,0.14)] sm:p-5">
      {/* Peach circle decor */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full"
        style={{ background: 'rgba(255,206,176,0.35)' }}
      />

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="relative z-[2] flex w-full items-center gap-3 text-left"
        aria-expanded={expanded}
      >
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] text-[22px]"
          style={{ background: '#5B4CE0' }}
          aria-hidden
        >
          📘
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10.5px] font-black uppercase tracking-[0.18em] text-[#8B7FAB]">
            Nazariya
          </span>
          <span className="grammar-heading mt-0.5 block truncate text-[17px] leading-none text-[#2D1B69]">
            {title || "Qoidani o'qing"}
          </span>
        </span>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F0EDFB] text-[#5B4CE0] transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
          aria-hidden
        >
          ⌄
        </span>
      </button>

      {expanded ? (
        <div className="relative z-[2] mt-4 space-y-4 text-[15px] leading-relaxed text-[#463578]">
          {children}
        </div>
      ) : null}
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

  const emojiFor = (n: number) => (n === 1 ? '✅' : n === 2 ? '🔗' : '🧩');
  const shortTitleFor = (n: number) =>
    n === 1 ? "To'g'ri variant" : n === 2 ? 'Juftini toping' : 'Gap tuzish';
  const captionFor = (n: number, isActive: boolean, isDone: boolean) => {
    const num = `VAZIFA ${n}`;
    if (isDone) return `${num} · BAJARILDI`;
    if (isActive) return `${num} · HOZIR`;
    return num;
  };

  const doneCount = [grammar1Done, grammar2Done, grammar3Done].filter(Boolean).length;
  const pct = Math.round((doneCount / 3) * 100);

  return (
    <div className="mt-2">
      {/* Header row: "3 ta vazifa" + progress */}
      <div className="mb-3 flex items-center gap-3">
        <p className="grammar-heading text-[18px] leading-none text-[#2D1B69]">
          3 ta vazifa
        </p>
        <div className="flex flex-1 items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#DDD7F5]">
            <div
              className="h-full rounded-full bg-[#22C55E] transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[12px] font-black text-[#8B7FAB]">
            {doneCount}/3
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {rows.map(({ vazifaNum, hint, count, onPress, emptyHint, sequentialLocked, seqHint }) => {
          const empty = count === 0;
          const actionable = count > 0 && !!onPress && !sequentialLocked;
          const comingSoon = count > 0 && !onPress && !sequentialLocked;

          const slotDone =
            vazifaNum === 1 ? grammar1Done : vazifaNum === 2 ? grammar2Done : grammar3Done;
          const done = count > 0 && slotDone && !sequentialLocked;
          const active = actionable && !slotDone;
          const locked = sequentialLocked || comingSoon || (!actionable && !done && !empty);
          const disabled = empty || sequentialLocked || comingSoon;

          const emoji = emojiFor(vazifaNum);
          const shortTitle = shortTitleFor(vazifaNum);
          const caption = captionFor(vazifaNum, active, done);

          const subtitleMuted = sequentialLocked && seqHint
            ? seqHint
            : empty
              ? emptyHint
              : locked
                ? "Avval oldingi vazifani tugating"
                : hint;

          // Card style based on state
          const cardStyle: React.CSSProperties = done
            ? {
                background: '#DCFCE7',
                border: '1.5px solid #82E5B8',
                boxShadow: '0 8px 18px -8px rgba(34,197,94,0.24)',
              }
            : active
              ? {
                  background: '#5B4CE0',
                  border: 'none',
                  boxShadow: '0 14px 30px -12px rgba(91,76,224,0.55)',
                }
              : {
                  background: '#FFFFFF',
                  border: '1.5px solid #DDD7F5',
                  boxShadow: '0 6px 14px -8px rgba(45,27,105,0.06)',
                };

          const iconBg = done ? '#22C55E' : active ? 'rgba(255,255,255,0.16)' : '#F0EDFB';
          const iconTextColor = done ? '#FFFFFF' : active ? '#FFFFFF' : '#8B7FAB';
          const captionColor = done ? '#0F7C3A' : active ? 'rgba(255,255,255,0.7)' : '#8B7FAB';
          const titleColor = done ? '#0F7C3A' : active ? '#FFFFFF' : locked ? '#8B7FAB' : '#2D1B69';

          return (
            <button
              key={vazifaNum}
              type="button"
              disabled={disabled}
              aria-disabled={disabled}
              onClick={() => {
                if (actionable) onPress?.();
              }}
              className="w-full rounded-[20px] p-4 text-left transition-transform active:scale-[0.99] disabled:cursor-default"
              style={cardStyle}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] text-[22px] leading-none ${locked ? 'grayscale' : ''}`}
                  style={{ background: iconBg, color: iconTextColor }}
                >
                  {done ? '✓' : locked ? '🔒' : emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[10px] font-black uppercase tracking-[0.16em]"
                    style={{ color: captionColor }}
                  >
                    {caption}
                  </p>
                  <p
                    className="grammar-heading mt-0.5 truncate text-[18px] leading-tight"
                    style={{ color: titleColor }}
                  >
                    {shortTitle}
                  </p>
                  {!done && !active && (
                    <p
                      className="mt-0.5 truncate text-[12px] font-semibold"
                      style={{ color: locked ? '#8B7FAB' : '#8B7FAB' }}
                    >
                      {count > 0 ? `${count} ta topshiriq` : subtitleMuted}
                    </p>
                  )}
                  {done && (
                    <p className="mt-0.5 text-[12px] font-black text-[#0F7C3A]">
                      ✓ TUGADI · {count} ta
                    </p>
                  )}
                </div>

                {done ? null : active ? null : (
                  <span className="grammar-heading shrink-0 text-[14px] text-[#8B7FAB]">
                    {locked ? '' : ''}
                  </span>
                )}
              </div>

              {active && (
                <div className="mt-3">
                  <span className="flex items-center justify-center rounded-[14px] bg-[color:var(--rd-white)] px-4 py-3 text-[14px] font-black text-[#5B4CE0] shadow-[0_4px_10px_rgba(45,27,105,0.12)]">
                    Davom etish →
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
      {sentenceMcqsCount > 0 ? (
        <p className="mt-3 text-center text-xs text-[#8B7FAB]">
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
      <p className="rounded-2xl border border-gray-200 bg-[color:var(--rd-white)] px-4 py-6 text-center text-sm text-gray-600 shadow-sm">
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
      wordPreviews={w?.words?.map((row) => row.wordRu).filter(Boolean) ?? []}
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
      <p className="rounded-2xl border border-[#DCEBE7] bg-[color:var(--rd-white)] px-4 py-6 text-center text-sm text-[color:var(--rd-text-muted)] shadow-sm">
        {t('kunlik.noReadingContent')}
      </p>
    );
  }

  const finishReading = () => {
    patchDay(dayNumber, { oqish_done: true });
    navigate(kunlikRejaPath(dayNumber));
  };

  const title = r.title?.trim() || 'Matn';

  return (
    <div className="space-y-4">
      {/* Premium header: back tile + pill + serif title + streak badge */}
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => navigate(kunlikRejaPath(dayNumber))}
          aria-label={t('common.back')}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[color:var(--rd-white)] text-[color:var(--rd-text)] shadow-[0_6px_16px_-6px_rgba(15,165,152,0.28)] ring-1 ring-[#DCEBE7] transition active:scale-[0.97]"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-[color:var(--rd-text-muted)]">
            Kun {dayNumber} · O'qish
          </p>
          <h1 className="reading-heading mt-1 text-[22px] leading-tight text-[color:var(--rd-text)]">
            {title}
          </h1>
        </div>
        <span className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-[#FFF0D2] px-3 text-[13px] font-bold text-[#E08600] ring-1 ring-[#FBD48A]">
          <span aria-hidden>🔥</span>
          <span>{dayNumber}</span>
        </span>
      </div>

      <InteractiveDailyReading title={null} bodyRu={r.bodyRu || ''} lexemes={r.lexemes} />

      {oqishDone ? (
        <div className="rounded-[22px] bg-[#E1F5F1] px-4 py-3.5 text-center text-sm font-bold text-[#0B7167] ring-1 ring-[#BFF0E8]">
          {t('kunlik.readingDoneAlready')}
        </div>
      ) : finishReady ? (
        <button
          type="button"
          onClick={finishReading}
          className="reading-cta flex min-h-[54px] w-full items-center justify-center gap-2 rounded-[18px] px-4 py-3.5 text-[15px] font-bold transition hover:brightness-[1.03] active:scale-[0.99]"
        >
          <span>{t('common.finish')}</span>
          <span aria-hidden className="text-[16px]">✓</span>
        </button>
      ) : (
        <div className="rounded-[22px] bg-white/70 px-4 py-3.5 text-center text-[13px] leading-relaxed text-[color:var(--rd-text-muted)] ring-1 ring-[#DCEBE7] backdrop-blur">
          {t('kunlik.readingFinishDelay', { seconds: 10 })}
        </div>
      )}
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
      <p className="rounded-2xl border border-gray-200 bg-[color:var(--rd-white)] px-4 py-6 text-center text-sm text-gray-600 shadow-sm">
        {t('kunlik.noSpeakingTasks')}
      </p>
    );
  }

  if (!kunlikLoaded) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#0B2A6B] border-t-transparent" />
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
          className="mt-4 min-h-[44px] w-full rounded-2xl border border-emerald-300 bg-[color:var(--rd-white)] px-4 py-3 text-sm font-bold text-emerald-800 shadow-sm hover:bg-emerald-50"
        >
          {t('kunlik.backToPlan')}
        </button>
        <button
          type="button"
          onClick={startSpeakingRetry}
          className="mt-3 min-h-[44px] w-full rounded-2xl bg-[#12A150] px-4 py-3 text-sm font-bold text-white shadow-md hover:bg-[#0F8A44]"
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
