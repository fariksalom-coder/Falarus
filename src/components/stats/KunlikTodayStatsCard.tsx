import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Brain, CheckCircle2, ChevronRight, FileText, Mic } from 'lucide-react';
import { getDailyCourseDay } from '../../api/dailyCourse';
import { DAILY_PLAN, TOTAL_DAYS } from '../../data/dailyPlan';
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

const STATS_LANG_KEY = 'falarus:kunlikStatsCardLang';

type Lang = 'uz' | 'ru';

type Copy = {
  titleToday: string;
  dayLabel: (n: number) => string;
  prevDaysChip: (from: number, to: number) => string;
  grammar: string;
  vocab: string;
  reading: string;
  speaking: string;
  none: string;
  grammarFmt: (done: number, total: number) => string;
  vocabFmt: (done: number, total: number) => string;
  readingDone: string;
  readingTodo: string;
  speakingFmt: (done: number, total: number | null) => string;
  speakingNoTasks: string;
  /** Kunlik kursidan API tekshiruvi: matn/leksemalar yo‘q */
  readingNoContent: string;
  blocksSummary: (done: number, total: number) => string;
  completedTitle: string;
  completedSubtitle: string;
  allDoneTitle: string;
  allDoneSubtitle: string;
  start: string;
  continue: string;
  nextDay: string;
  openPlan: string;
  langUz: string;
  langRu: string;
  loading: string;
  /** Ikkinchi qator — bosh sarlavha ostidagi qisqa nom */
  planSubtitlePrefix: string;
};

const COPY: Record<Lang, Copy> = {
  uz: {
    titleToday: 'Bugun',
    dayLabel: (n) => `${n}-kun`,
    prevDaysChip: (from, to) =>
      from === to ? `${from}-kun yakunlandi` : `${from}–${to}-kunlar yakunlandi`,
    grammar: 'Grammatika (ПЗЗ)',
    vocab: "Lug‘at",
    reading: 'O‘qish',
    speaking: 'Gapirish',
    none: 'Hali boshlanmagan',
    grammarFmt: (d, t) => `${d}/${t} mashq`,
    vocabFmt: (d, t) => `${d}/${t} bosqich`,
    readingDone: 'Bajarildi',
    readingTodo: 'Qilinmagan',
    speakingFmt: (d, t) => (t != null && t > 0 ? `${d}/${t} topshiruv` : `${d} topshiruv`),
    speakingNoTasks: 'Bu kun uchun topshiruv yo‘q',
    readingNoContent: 'Bu kun uchun o‘qish materiallari yo‘q',
    blocksSummary: (done, total) => `Bloklar: ${done}/${total}`,
    completedTitle: 'Kun yakunlandi',
    completedSubtitle: 'Reja bloklari va gapirish bo‘yicha bu kun tugallandi',
    allDoneTitle: 'Tabriklaymiz!',
    allDoneSubtitle: '182 kunlik reja bo‘yicha barcha bloklar yakunlandi.',
    start: 'Boshlash',
    continue: 'Davom etish',
    nextDay: 'Keyingi kunga o‘tish',
    openPlan: 'Kunlik rejaga o‘tish',
    langUz: 'O‘zb',
    langRu: 'Rus',
    loading: 'Yuklanmoqda…',
    planSubtitlePrefix: 'Kunlik Reja',
  },
  ru: {
    titleToday: 'Сегодня',
    dayLabel: (n) => `День ${n}`,
    prevDaysChip: (from, to) =>
      from === to ? `День ${from} завершён` : `Дни ${from}–${to} завершены`,
    grammar: 'Грамматика (ПЗЗ)',
    vocab: 'Словарь',
    reading: 'Чтение',
    speaking: 'Говорение',
    none: 'Ещё не начато',
    grammarFmt: (d, t) => `${d}/${t} заданий`,
    vocabFmt: (d, t) => `${d}/${t} этапов`,
    readingDone: 'Выполнено',
    readingTodo: 'Не выполнено',
    speakingFmt: (d, t) => (t != null && t > 0 ? `${d}/${t} упражнений` : `${d} упражнений`),
    speakingNoTasks: 'Нет упражнений на этот день',
    readingNoContent: 'На этот день нет материалов для чтения',
    blocksSummary: (done, total) => `Блоки: ${done}/${total}`,
    completedTitle: 'Завершено',
    completedSubtitle: 'На этот день выполнены блоки плана и говорение',
    allDoneTitle: 'Поздравляем!',
    allDoneSubtitle: 'Вы завершили все блоки 182-дневного плана.',
    start: 'Начать',
    continue: 'Продолжить',
    nextDay: 'Перейти к следующему дню',
    openPlan: 'Открыть курс',
    langUz: 'Узб',
    langRu: 'Рус',
    loading: 'Загрузка…',
    planSubtitlePrefix: 'Дневной план',
  },
};

function defaultLang(): Lang {
  try {
    const v = localStorage.getItem(STATS_LANG_KEY);
    return v === 'ru' ? 'ru' : 'uz';
  } catch {
    return 'uz';
  }
}

function persistLang(lang: Lang) {
  try {
    localStorage.setItem(STATS_LANG_KEY, lang);
  } catch {
    /* ignore */
  }
}

type RowStatProps = {
  icon: typeof Brain;
  label: string;
  value: string;
  doneVisual: boolean | 'partial';
};

function RowStat({ icon: Icon, label, value, doneVisual }: RowStatProps) {
  const valueColor =
    doneVisual === true ? 'text-emerald-700' : doneVisual === 'partial' ? 'text-blue-700' : 'text-slate-500';
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-100">
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-slate-800">{label}</p>
        <p className={`mt-0.5 text-[13px] font-medium ${valueColor}`}>{value}</p>
      </div>
    </div>
  );
}

export type KunlikTodayStatsCardProps = {
  token: string | null;
};

export function KunlikTodayStatsCard({ token }: KunlikTodayStatsCardProps) {
  const navigate = useNavigate();
  const { results, isReady } = useSequentialLesson();
  const { rows: kunlikRows, loaded: kunlikLoaded, practicePromptCountByDay } = useKunlikProgress();
  const [lang, setLang] = useState<Lang>(defaultLang);
  const [reviewVisits, setReviewVisits] = useState<Record<number, true>>(readPlanReviewVisits);
  const [vocabTick, setVocabTick] = useState(0);
  /** Kunlik kun paketi: gapirish soni + o‘qish bor-yo‘qligi (statik rejadan emas) */
  const [bundleMeta, setBundleMeta] = useState<{
    practiceLen: number;
    hasReading: boolean;
  } | null>(null);

  const t = COPY[lang];

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
    gDone === 0 ? t.none : gDone >= 3 ? t.grammarFmt(3, 3) : t.grammarFmt(gDone, 3);
  const grammarVisual: RowStatProps['doneVisual'] =
    gDone >= 3 ? true : gDone > 0 ? 'partial' : false;

  const vocabLabel =
    vSteps === 0 ? t.none : vSteps >= 3 ? t.vocabFmt(3, 3) : t.vocabFmt(vSteps, 3);
  const vocabVisual: RowStatProps['doneVisual'] =
    vSteps >= 3 ? true : vSteps > 0 ? 'partial' : false;

  const readingLabel =
    readingDone
      ? t.readingDone
      : token && bundleMeta !== null && !bundleMeta.hasReading
        ? t.readingNoContent
        : t.readingTodo;
  const readingVisual: RowStatProps['doneVisual'] = readingDone ? true : false;

  let speakingLabel: string;
  if (pt === 0) speakingLabel = t.speakingNoTasks;
  else {
    speakingLabel =
      speak <= 0 ? t.none : speak >= pt ? t.speakingFmt(pt, pt) : t.speakingFmt(speak, pt);
  }
  const speakingVisual: RowStatProps['doneVisual'] =
    pt === 0 ? false : speak >= pt ? true : speak > 0 ? 'partial' : false;

  const showPrevChip = focusDay > 1 && !allDone;

  const goPlan = (day?: number) => navigate(kunlikRejaPath(day));

  let primaryAction: { label: string; onClick: () => void };
  if (allDone) {
    primaryAction = { label: t.openPlan, onClick: () => goPlan() };
  } else if (fullDayDone && focusDay < TOTAL_DAYS) {
    primaryAction = { label: t.nextDay, onClick: () => goPlan(focusDay + 1) };
  } else if (!started) {
    primaryAction = { label: t.start, onClick: () => goPlan(focusDay) };
  } else {
    primaryAction = { label: t.continue, onClick: () => goPlan(focusDay) };
  }

  const loadingCard = !isReady || !kunlikLoaded;

  return (
    <div
      className="overflow-hidden rounded-[22px] border bg-white shadow-[0_12px_26px_rgba(15,23,42,0.06)] md:rounded-[24px]"
      style={{ borderColor: '#E2E8F0' }}
    >
      <div
        className="flex items-start justify-between gap-3 px-4 py-3.5"
        style={{
          background: 'linear-gradient(135deg, #2563EB 0%, #4F46E5 52%, #6366F1 100%)',
        }}
      >
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-white">
            {t.titleToday}
            {!loadingCard && planDay ? (
              <>
                {' '}
                <span className="text-white/90">·</span> {t.dayLabel(focusDay)}
              </>
            ) : null}
          </p>
          <p className="mt-0.5 text-[11px] text-indigo-100">
            {t.planSubtitlePrefix}
            {loadingCard ? ' · …' : <> · {t.blocksSummary(questProg.done, questProg.total)}</>}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-xl bg-white/15 p-0.5">
          <button
            type="button"
            onClick={() => {
              setLang('uz');
              persistLang('uz');
            }}
            className={`rounded-[10px] px-2 py-1 text-[11px] font-semibold transition-colors ${
              lang === 'uz' ? 'bg-white text-indigo-700' : 'text-white/85 hover:bg-white/10'
            }`}
          >
            {t.langUz}
          </button>
          <button
            type="button"
            onClick={() => {
              setLang('ru');
              persistLang('ru');
            }}
            className={`rounded-[10px] px-2 py-1 text-[11px] font-semibold transition-colors ${
              lang === 'ru' ? 'bg-white text-indigo-700' : 'text-white/85 hover:bg-white/10'
            }`}
          >
            {t.langRu}
          </button>
        </div>
      </div>

      <div className="space-y-3 px-4 py-4">
        {loadingCard ? (
          <p className="py-6 text-center text-sm text-slate-500">{t.loading}</p>
        ) : (
          <>
            {showPrevChip ? (
              <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2 text-[12px] font-medium text-emerald-800 ring-1 ring-emerald-100">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                {t.prevDaysChip(1, focusDay - 1)}
              </div>
            ) : null}

            {allDone ? (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-4 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" aria-hidden />
                <p className="mt-2 text-lg font-bold text-emerald-800">{t.allDoneTitle}</p>
                <p className="mt-1 text-[13px] text-emerald-900/80">{t.allDoneSubtitle}</p>
              </div>
            ) : fullDayDone ? (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-4 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" aria-hidden />
                <p className="mt-2 text-lg font-bold text-emerald-800">{t.completedTitle}</p>
                <p className="mt-1 text-[13px] text-emerald-900/80">{t.completedSubtitle}</p>
              </div>
            ) : null}

            {!allDone && !fullDayDone ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <RowStat icon={Brain} label={t.grammar} value={grammarLabel} doneVisual={grammarVisual} />
                <RowStat icon={BookOpen} label={t.vocab} value={vocabLabel} doneVisual={vocabVisual} />
                <RowStat icon={FileText} label={t.reading} value={readingLabel} doneVisual={readingVisual} />
                <RowStat icon={Mic} label={t.speaking} value={speakingLabel} doneVisual={speakingVisual} />
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
