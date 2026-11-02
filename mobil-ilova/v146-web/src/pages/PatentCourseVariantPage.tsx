import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  X,
} from 'lucide-react';
import type {
  PatentExamBlock,
  PatentExamChoiceQuestion,
  PatentExamVariant,
  PatentExamWrittenBlock,
} from '../data/patentExamData';
import { evaluatePatentVariant, isImageAssetOption, type PatentExamAnswerMap } from '../utils/patentExam';
import { getPatentQuestionHint } from '../utils/patentQuestionHints';
import { courseAssetUrl } from '../utils/courseAssetUrl';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { savePatentVariantResult, type PatentVariantResult } from '../api/patentResults';
import { playCorrectSound, playWrongSound } from '../utils/sound';

const BG = '#F7F1E4';
const BORDER = '#D7E5F5';
const TEXT = '#16324F';

type PatentVariantStep = {
  block: PatentExamBlock;
  questionNumbers: number[];
};

function normalizeWrittenAnswer(value: string): string {
  return value.trim().toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').replace(/\s+/g, ' ');
}

function PassageBlock({ passage }: { passage: string }) {
  return (
    <div className="my-3 whitespace-pre-line rounded-2xl border border-slate-200 bg-slate-50 p-4 text-base leading-relaxed text-slate-800">
      {passage}
    </div>
  );
}

function QuestionHintButton({ hintKey }: { hintKey: string }) {
  const [open, setOpen] = useState(false);
  const hint = getPatentQuestionHint(hintKey);

  if (!hint) return null;

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full border-[1.5px] border-[#D9B45A] bg-[#FDF6E4] px-4 py-2 text-[13px] font-black text-[#B8892F] transition hover:bg-[#F6E9C7]"
      >
        <span aria-hidden className="text-[12px]">✦</span>
        {open ? "Ko'rsatmani yashirish" : "Ko'rsatma"}
      </button>
      {open ? (
        <p className="mt-2.5 whitespace-pre-line rounded-[16px] border border-[#D9B45A]/50 bg-[#FDF6E4]/80 px-4 py-3 text-[15px] leading-relaxed text-[#4A3F26]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function getStepQuestionNumbers(block: PatentExamBlock): number[] {
  if (block.kind === 'audio-double') {
    return block.subQuestions.map((question) => question.questionNumber);
  }
  return [block.questionNumber];
}

function isQuestionAnswered(block: PatentExamBlock, answers: PatentExamAnswerMap, questionNumber: number): boolean {
  if (block.kind === 'audio-double') {
    const question = block.subQuestions.find((item) => item.questionNumber === questionNumber);
    return question ? typeof answers[question.key] === 'number' : false;
  }
  if (block.kind === 'written') {
    const value = answers[block.blockId];
    return typeof value === 'string' && value.trim().length > 0;
  }
  return typeof answers[block.question.key] === 'number';
}

function isQuestionCorrect(block: PatentExamBlock, answers: PatentExamAnswerMap, questionNumber: number): boolean {
  if (block.kind === 'audio-double') {
    const question = block.subQuestions.find((item) => item.questionNumber === questionNumber);
    return question ? answers[question.key] === question.correctIndex : false;
  }
  if (block.kind === 'written') {
    const value = answers[block.blockId];
    return (
      typeof value === 'string' &&
      block.correctAnswers.some((candidate) => normalizeWrittenAnswer(candidate) === normalizeWrittenAnswer(value))
    );
  }
  return answers[block.question.key] === block.question.correctIndex;
}

function isBlockAnswered(step: PatentVariantStep, answers: PatentExamAnswerMap): boolean {
  return step.questionNumbers.every((number) => isQuestionAnswered(step.block, answers, number));
}

function ChoiceCard({
  question,
  answer,
  onSelect,
  showQuestionNumber = true,
}: {
  question: PatentExamChoiceQuestion;
  answer: string | number | undefined;
  onSelect: (value: number) => void;
  showQuestionNumber?: boolean;
}) {
  const answered = typeof answer === 'number';

  return (
    <div className="rounded-[24px] border border-[#E9E1CE] bg-pmn-card p-5 shadow-[0_14px_30px_-16px_rgba(10,30,72,0.14)]">
      {showQuestionNumber ? (
        <div className="mb-3 flex items-baseline gap-3">
          <span
            className="font-serif-display text-[36px] font-bold leading-none"
            style={{ color: '#D9B45A', letterSpacing: '-0.02em' }}
            aria-hidden
          >
            {question.questionNumber}
          </span>
          <h2 className="font-serif-display flex-1 text-[19px] font-bold leading-[1.3] text-[#0A1E48]">
            {question.text}
          </h2>
        </div>
      ) : (
        <h2 className="font-serif-display text-[19px] font-bold leading-[1.3] text-[#0A1E48]">
          {question.text}
        </h2>
      )}

      <QuestionHintButton hintKey={question.key} />

      <div className="mt-4 flex flex-col gap-[10px]">
        {question.options.map((option, optionIndex) => {
          const isCorrect = answered && optionIndex === question.correctIndex;
          const isWrong = answered && answer === optionIndex && optionIndex !== question.correctIndex;
          const isSelected = answer === optionIndex;
          const imageOption = isImageAssetOption(option);
          const optionSrc = courseAssetUrl(option);

          let borderColor = '#E9E1CE';
          let backgroundColor = '#FFFFFF';
          let borderWidth = '1.5px';
          let textColor = '#0A1E48';
          let icon: ReactNode = <Circle className="h-[22px] w-[22px] text-[#D9B45A]" strokeWidth={1.8} />;
          let rightBadge: ReactNode = null;

          if (isCorrect) {
            borderColor = '#0A1E48';
            backgroundColor = '#0A1E48';
            borderWidth = '1.5px';
            textColor = '#FFFFFF';
            icon = (
              <span
                className="flex h-[28px] w-[28px] items-center justify-center rounded-full"
                style={{
                  background: 'linear-gradient(135deg, #F6E2A8 0%, #D9B45A 45%, #B8892F 100%)',
                  color: '#0A1E48',
                }}
              >
                <Check className="h-[14px] w-[14px]" strokeWidth={3} />
              </span>
            );
            rightBadge = (
              <span className="ml-auto shrink-0 text-[10.5px] font-black uppercase tracking-[0.24em] text-[#D9B45A]">
                To'g'ri
              </span>
            );
          } else if (isWrong) {
            borderColor = '#C97070';
            backgroundColor = '#FDF3F3';
            textColor = '#8A2A2A';
            icon = (
              <span className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-[#C97070] text-white">
                <X className="h-[14px] w-[14px]" strokeWidth={3} />
              </span>
            );
          } else if (isSelected) {
            borderColor = '#0A1E48';
            backgroundColor = '#0A1E48';
            textColor = '#FFFFFF';
            icon = (
              <span className="flex h-[24px] w-[24px] items-center justify-center rounded-full border-[2px] border-[#D9B45A]">
                <span className="h-[10px] w-[10px] rounded-full bg-[#D9B45A]" />
              </span>
            );
          }

          return (
            <button
              key={`${question.key}-${optionIndex}`}
              type="button"
              onClick={() => {
                if (!answered) onSelect(optionIndex);
              }}
              disabled={answered}
              className={`w-full rounded-[16px] text-left transition ${
                imageOption ? 'overflow-hidden p-2' : 'px-4 py-[13px]'
              }`}
              style={{
                borderColor,
                backgroundColor,
                borderStyle: 'solid',
                borderWidth,
              }}
            >
              {imageOption ? (
                <div className="flex items-center gap-2.5">
                  <div className="shrink-0">{icon}</div>
                  <div className="min-w-0 flex-1 overflow-hidden rounded-[12px] bg-pmn-card">
                    <img
                      src={optionSrc}
                      alt={`Variant ${optionIndex + 1}`}
                      className="h-24 w-full object-contain bg-[#F5F7FB] sm:h-28"
                    />
                  </div>
                  {rightBadge}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="shrink-0">{icon}</div>
                  <div className="min-w-0 flex-1 text-[16px] font-extrabold" style={{ color: textColor }}>
                    {option}
                  </div>
                  {rightBadge}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WrittenCard({
  block,
  answer,
  onChange,
}: {
  block: PatentExamWrittenBlock;
  answer: string | number | undefined;
  onChange: (value: string) => void;
}) {
  const { t } = useLocale();
  const currentValue = typeof answer === 'string' ? answer : '';
  const hasValue = currentValue.trim().length > 0;
  const correct = hasValue
    ? block.correctAnswers.some((candidate) => normalizeWrittenAnswer(candidate) === normalizeWrittenAnswer(currentValue))
    : false;

  return (
    <div className="rounded-[24px] bg-pmn-card p-4 shadow-[0_14px_28px_rgba(96,132,184,0.12)] sm:p-5">
      <h2 className="text-[18px] font-bold leading-tight sm:text-[21px]" style={{ color: TEXT }}>
        {block.questionNumber}. {block.prompt ?? "To'g'ri javobni yozing"}
      </h2>

      <QuestionHintButton hintKey={block.blockId} />

      {block.passage ? <PassageBlock passage={block.passage} /> : null}

      {block.mediaUrl ? (
        <div className="mt-4 overflow-hidden rounded-[22px] border bg-slate-50" style={{ borderColor: BORDER }}>
          <img src={courseAssetUrl(block.mediaUrl)} alt={`Question ${block.questionNumber}`} className="w-full object-contain" />
        </div>
      ) : null}

      <input
        type="text"
        value={currentValue}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t('patent.writeAnswerPlaceholder')}
        className="mt-4 w-full rounded-[20px] border bg-pmn-card px-4 py-3 text-[16px] outline-none transition focus:ring-4 focus:ring-[#DBEAFF] sm:text-[17px]"
        style={{
          borderColor: !hasValue ? '#C4D6EC' : correct ? '#071B5E' : '#EF4444',
          color: TEXT,
          backgroundColor: !hasValue ? '#FFFFFF' : correct ? '#EEF4FF' : '#FDF2F2',
        }}
      />

      {hasValue ? (
        <div
          className="mt-3 inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold"
          style={{
            backgroundColor: correct ? '#E8F0FF' : '#FCE7E7',
            color: correct ? '#071B5E' : '#DC2626',
          }}
        >
          {correct ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          {correct ? "To'g'ri javob" : `To'g'ri javob: ${block.correctAnswers.join(' / ')}`}
        </div>
      ) : null}
    </div>
  );
}

function AudioPlayerCard({ mediaUrl, transcript }: { mediaUrl: string; transcript?: string | null }) {
  return (
    <div className="rounded-[24px] bg-pmn-card p-4 shadow-[0_14px_28px_rgba(96,132,184,0.12)] sm:p-5">
      <audio controls preload="none" className="w-full" src={courseAssetUrl(mediaUrl)} />
      {transcript ? (
        <div className="mt-4 whitespace-pre-line rounded-2xl border border-slate-200 bg-slate-50 p-4 text-base leading-relaxed text-slate-800">
          {transcript}
        </div>
      ) : null}
    </div>
  );
}

export default function PatentCourseVariantPage() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const { token } = useAuth();
  const params = useParams();
  const variantNumber = Number(params.variantNumber);
  const [variants, setVariants] = useState<PatentExamVariant[] | null>(null);
  const [variantsLoading, setVariantsLoading] = useState(true);
  const [variantsError, setVariantsError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setVariantsLoading(true);
    import('../data/patentExamData')
      .then((module) => {
        if (cancelled) return;
        setVariants(module.PATENT_EXAM_VARIANTS);
      })
      .catch(() => {
        if (cancelled) return;
        setVariantsError(t('common.loadError'));
      })
      .finally(() => {
        if (!cancelled) setVariantsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const variant = useMemo<PatentExamVariant | null>(
    () => variants?.find((item) => item.variantNumber === variantNumber) ?? null,
    [variantNumber, variants]
  );

  const [answers, setAnswers] = useState<PatentExamAnswerMap>({});
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [savedResult, setSavedResult] = useState<PatentVariantResult | null>(null);
  const saveOnceRef = useRef(false);

  const steps = useMemo<PatentVariantStep[]>(
    () =>
      variant
        ? variant.blocks.map((block) => ({
            block,
            questionNumbers: getStepQuestionNumbers(block),
          }))
        : [],
    [variant]
  );

  const questionToStepIndex = useMemo(() => {
    const map = new Map<number, number>();
    steps.forEach((step, stepIndex) => {
      step.questionNumbers.forEach((questionNumber) => {
        map.set(questionNumber, stepIndex);
      });
    });
    return map;
  }, [steps]);

  const currentStep = steps[currentStepIndex] ?? null;
  const currentChoiceBlock =
    currentStep &&
    currentStep.block.kind !== 'audio-double' &&
    currentStep.block.kind !== 'written'
      ? currentStep.block
      : null;
  const result = variant ? evaluatePatentVariant(variant, answers) : null;
  const allAnswered = Boolean(result && result.answeredCount === result.totalCount && result.totalCount > 0);
  const examLocked = Boolean(savedResult);

  const handleFinishExam = async () => {
    if (!variant || !result || !allAnswered || !token || examLocked || saveOnceRef.current) return;
    saveOnceRef.current = true;
    setSubmitting(true);
    setSubmitError('');
    try {
      const row = await savePatentVariantResult(token, {
        variantNumber: variant.variantNumber,
        correctCount: result.correctCount,
        totalCount: result.totalCount,
      });
      setSavedResult(row);
    } catch (e) {
      saveOnceRef.current = false;
      setSubmitError(e instanceof Error ? e.message : 'Natija saqlanmadi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setSavedResult(null);
    saveOnceRef.current = false;
    setSubmitError('');
    setCurrentStepIndex(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (variantsLoading) {
    return (
      <div className="min-h-screen px-4 py-8" style={{ backgroundColor: BG }}>
        <div className="mx-auto flex max-w-5xl items-center justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#0B2A6B] border-t-transparent" />
        </div>
      </div>
    );
  }

  if (variantsError) {
    return (
      <div className="min-h-screen px-4 py-8" style={{ backgroundColor: BG }}>
        <button
          type="button"
          onClick={() => navigate('/kurslar/patent')}
          className="inline-flex items-center gap-2 rounded-full bg-pmn-card px-4 py-2 text-sm font-semibold text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </button>
        <p className="mt-6 text-lg font-semibold text-red-600">{variantsError}</p>
      </div>
    );
  }

  if (!variant) {
    return (
      <div className="min-h-screen px-4 py-8" style={{ backgroundColor: BG }}>
        <button
          type="button"
          onClick={() => navigate('/kurslar/patent')}
          className="inline-flex items-center gap-2 rounded-full bg-pmn-card px-4 py-2 text-sm font-semibold text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </button>
        <p className="mt-6 text-lg font-semibold" style={{ color: TEXT }}>
          {t('patent.variantNotFound')}
        </p>
      </div>
    );
  }

  const goPrev = () => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  };

  const goNext = () => {
    setCurrentStepIndex((prev) => Math.min(steps.length - 1, prev + 1));
  };

  const setChoiceAnswer = (key: string, value: number, correctIndex?: number) => {
    if (examLocked) return;
    setAnswers((prev) => {
      if (typeof prev[key] === 'number') return prev;
      if (typeof correctIndex === 'number') {
        if (value === correctIndex) playCorrectSound();
        else playWrongSound();
      }
      return { ...prev, [key]: value };
    });
  };

  const setWrittenAnswer = (key: string, value: string) => {
    if (examLocked) return;
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const currentAnswered = currentStep ? isBlockAnswered(currentStep, answers) : false;

  return (
    <div className="relative min-h-screen overflow-hidden pb-16" style={{ backgroundColor: BG }}>
      <main className="relative mx-auto max-w-5xl px-4 pt-2 pb-4 sm:px-5">
        {/* Header: back tile + Variant N · Natija */}
        <div className="mb-3 flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/kurslar/patent')}
            className="inline-flex h-10 w-10 items-center justify-center rounded-[13px] bg-pmn-card text-[#0A1E48] shadow-[0_4px_10px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5"
            aria-label={t('common.back')}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <p className="flex-1 text-[15px] font-extrabold text-[#0A1E48]">
            Variant {variant.variantNumber}{savedResult ? ' · Natija' : ''}
          </p>
          {!savedResult ? (() => {
            const correctSoFar = Array.from({ length: variant.totalQuestions }, (_, index) => index + 1)
              .filter((n) => {
                const stepIndex = questionToStepIndex.get(n) ?? 0;
                const block = steps[stepIndex]?.block;
                return block ? isQuestionCorrect(block, answers, n) : false;
              }).length;
            return (
              <span className="rounded-full bg-pmn-card px-[11px] py-[6px] text-[12px] font-extrabold text-[#8A8172] shadow-[0_3px_8px_rgba(15,23,42,0.05)]">
                To'g'ri {correctSoFar}/{variant.totalQuestions}
              </span>
            );
          })() : null}
        </div>

        {savedResult ? (() => {
          const ringR = 90;
          const ringC = 2 * Math.PI * ringR;
          const pct = Math.max(0, Math.min(100, savedResult.score_percent));
          const dashOffset = ringC * (1 - pct / 100);
          const wrong = savedResult.total_count - savedResult.correct_count;
          return (
            <>
              {/* Navy hero with circular gauge */}
              <section
                className="relative mb-4 overflow-hidden rounded-[26px] p-6 text-center text-white shadow-[0_24px_54px_-22px_rgba(10,30,72,0.55)]"
                style={{ background: '#0A1E48' }}
              >
                {/* Guilloché rings decor */}
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.14]"
                  viewBox="0 0 400 400"
                  preserveAspectRatio="xMidYMid slice"
                  aria-hidden
                >
                  {[190, 158, 128, 100, 74, 52, 34].map((r, i) => (
                    <circle
                      key={r}
                      cx="200"
                      cy="200"
                      r={r}
                      fill="none"
                      stroke="#D9B45A"
                      strokeWidth={i === 0 ? 1.2 : 0.6}
                      opacity={0.9 - i * 0.1}
                    />
                  ))}
                </svg>

                {/* Gold caption */}
                <p className="relative z-[2] text-[11px] font-black uppercase tracking-[0.32em] text-[#D9B45A]">
                  Natija
                </p>

                {/* Circular gauge */}
                <div className="relative z-[2] mx-auto mt-4 flex h-[210px] w-[210px] items-center justify-center">
                  <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 210 210" aria-hidden>
                    {/* Track */}
                    <circle
                      cx="105"
                      cy="105"
                      r={ringR}
                      fill="none"
                      stroke="rgba(217,180,90,0.16)"
                      strokeWidth="12"
                    />
                    {/* Progress arc */}
                    <defs>
                      <linearGradient id="gauge-gold" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#F6E2A8" />
                        <stop offset="55%" stopColor="#D9B45A" />
                        <stop offset="100%" stopColor="#B8892F" />
                      </linearGradient>
                    </defs>
                    <circle
                      cx="105"
                      cy="105"
                      r={ringR}
                      fill="none"
                      stroke="url(#gauge-gold)"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={ringC}
                      strokeDashoffset={dashOffset}
                    />
                  </svg>
                  <div className="flex flex-col items-center leading-none">
                    <span className="font-serif-display flex items-baseline text-[54px] font-bold leading-none tracking-[-0.02em]">
                      {savedResult.score_percent}<span className="ml-0.5 text-[24px] font-bold text-[#D9B45A]">%</span>
                    </span>
                    <span className="mt-1.5 text-[10px] font-black uppercase tracking-[0.28em] text-[#D9B45A]">
                      Natija
                    </span>
                  </div>
                </div>

                {/* Gold pill status */}
                <div className="relative z-[2] mt-5 flex justify-center">
                  <span
                    className="patent-gold-cta inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[15px] font-black tracking-[0.01em]"
                    style={{ boxShadow: '0 14px 30px -10px rgba(217,180,90,0.65), inset 0 1px 0 rgba(255,255,255,0.35)' }}
                  >
                    <span aria-hidden className="text-[14px]">✦</span>
                    {savedResult.passed ? 'Imtihon topshirildi' : "Imtihondan o'tolmadi"}
                  </span>
                </div>

                <p className="relative z-[2] mt-4 text-[13px] font-semibold text-[#C5CFE4]">
                  To'g'ri javoblar: <b className="font-black text-white">{savedResult.correct_count} / {savedResult.total_count}</b>
                </p>
              </section>

              {/* 3-col white stat tiles */}
              <div className="mb-4 grid grid-cols-3 gap-2.5">
                <div className="rounded-[18px] border border-[#E9E1CE] bg-pmn-card py-4 text-center shadow-[0_10px_22px_-14px_rgba(10,30,72,0.14)]">
                  <p className="font-serif-display text-[26px] font-bold leading-none text-[#3F7B41]">
                    {savedResult.correct_count}
                  </p>
                  <p className="mt-2 text-[9.5px] font-black uppercase tracking-[0.22em] text-[#8A8172]">
                    To'g'ri
                  </p>
                </div>
                <div className="rounded-[18px] border border-[#E9E1CE] bg-pmn-card py-4 text-center shadow-[0_10px_22px_-14px_rgba(10,30,72,0.14)]">
                  <p className="font-serif-display text-[26px] font-bold leading-none text-[#B4282E]">
                    {wrong}
                  </p>
                  <p className="mt-2 text-[9.5px] font-black uppercase tracking-[0.22em] text-[#8A8172]">
                    Xato
                  </p>
                </div>
                <div className="rounded-[18px] border border-[#E9E1CE] bg-pmn-card py-4 text-center shadow-[0_10px_22px_-14px_rgba(10,30,72,0.14)]">
                  <p className="font-serif-display text-[26px] font-bold leading-none text-[#0A1E48]">
                    {savedResult.total_count}
                  </p>
                  <p className="mt-2 text-[9.5px] font-black uppercase tracking-[0.22em] text-[#8A8172]">
                    Jami
                  </p>
                </div>
              </div>

              {/* Dual CTAs */}
              <button
                type="button"
                onClick={() => navigate('/kurslar/patent')}
                className="mb-2.5 w-full rounded-full bg-[#0A1E48] px-6 py-4 text-[14px] font-black text-white shadow-[0_14px_30px_-14px_rgba(10,30,72,0.55)] transition active:scale-[0.99]"
              >
                Variantlarga qaytish
              </button>
              <button
                type="button"
                onClick={handleRetry}
                className="w-full rounded-full border-[1.5px] border-[#D9B45A] bg-[#FDF6E4] px-6 py-4 text-[14px] font-black text-[#B8892F] transition hover:bg-[#F6E9C7] active:scale-[0.99]"
              >
                Yana urinib ko'rish
              </button>

              {/* Footer note */}
              <p className="mt-4 text-center text-[12px] font-semibold text-[#8A8172]">
                Natija saqlandi. Keyingi kirishda test yangidan boshlanadi.
              </p>
            </>
          );
        })() : null}

        {!savedResult ? (
        <>
        {/* Gold progress bar */}
        {(() => {
          const answeredCount = Array.from({ length: variant.totalQuestions }, (_, index) => index + 1)
            .filter((n) => {
              const stepIndex = questionToStepIndex.get(n) ?? 0;
              const block = steps[stepIndex]?.block;
              return block ? isQuestionAnswered(block, answers, n) : false;
            }).length;
          const pct = variant.totalQuestions ? (answeredCount / variant.totalQuestions) * 100 : 0;
          return (
            <div className="mb-3 h-[6px] w-full overflow-hidden rounded-full bg-[#E9E1CE]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: 'linear-gradient(90deg, #F6E2A8 0%, #D9B45A 50%, #B8892F 100%)',
                }}
              />
            </div>
          );
        })()}

        {/* Question navigator chips */}
        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max gap-[7px]">
            {Array.from({ length: variant.totalQuestions }, (_, index) => {
              const questionNumber = index + 1;
              const stepIndex = questionToStepIndex.get(questionNumber) ?? 0;
              const block = steps[stepIndex]?.block;
              const answered = block ? isQuestionAnswered(block, answers, questionNumber) : false;
              const correct = block ? isQuestionCorrect(block, answers, questionNumber) : false;
              const active = (currentStep?.questionNumbers.includes(questionNumber) ?? false) && !answered;

              let background = '#F5EED8';
              let color = '#B0A484';
              let border = '1px solid #E9E1CE';
              let boxShadow = 'none';

              if (answered && correct) {
                background = '#88B989';
                color = '#FFFFFF';
                border = '1px solid #88B989';
              } else if (answered && !correct) {
                background = '#C97070';
                color = '#FFFFFF';
                border = '1px solid #C97070';
              } else if (active) {
                background = 'linear-gradient(135deg, #F6E2A8 0%, #D9B45A 50%, #B8892F 100%)';
                color = '#0A1E48';
                border = '1px solid #B8892F';
                boxShadow = '0 6px 14px rgba(217,180,90,0.4)';
              }

              return (
                <button
                  key={questionNumber}
                  type="button"
                  onClick={() => setCurrentStepIndex(stepIndex)}
                  className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] text-[13px] font-black transition-all duration-200"
                  style={{ background, color, border, boxShadow }}
                >
                  {questionNumber}
                </button>
              );
            })}
          </div>
        </div>

        {currentStep ? (
          <section className="mt-3 space-y-3">
            {currentStep.block.kind === 'audio-double' && currentStep.block.mediaUrl ? (
              <AudioPlayerCard
                mediaUrl={currentStep.block.mediaUrl}
                transcript={currentStep.block.transcript}
              />
            ) : null}

            {currentStep.block.kind === 'audio-double' ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {currentStep.block.subQuestions.map((question) => (
                  <ChoiceCard
                    key={question.key}
                    question={question}
                    answer={answers[question.key]}
                    onSelect={(value) => setChoiceAnswer(question.key, value, question.correctIndex)}
                  />
                ))}
              </div>
            ) : currentStep.block.kind === 'written' ? (
              <WrittenCard
                block={currentStep.block}
                answer={answers[currentStep.block.blockId]}
                onChange={(value) => setWrittenAnswer(currentStep.block.blockId, value)}
              />
            ) : currentChoiceBlock ? (
              <div className="space-y-3">
                {currentChoiceBlock.prompt ? (
                  <div className="rounded-[24px] bg-pmn-card px-4 py-3.5 shadow-[0_14px_28px_rgba(96,132,184,0.12)] sm:px-5">
                    <p className="text-[18px] font-bold leading-tight sm:text-[21px]" style={{ color: TEXT }}>
                      {currentChoiceBlock.questionNumber}. {currentChoiceBlock.prompt}
                    </p>
                  </div>
                ) : null}

                {currentChoiceBlock.passage ? (
                  <div className="rounded-[24px] bg-pmn-card px-4 py-1 shadow-[0_14px_28px_rgba(96,132,184,0.12)] sm:px-5 sm:py-2">
                    <PassageBlock passage={currentChoiceBlock.passage} />
                  </div>
                ) : null}

                {currentChoiceBlock.mediaUrl ? (
                  <div className="rounded-[24px] bg-pmn-card p-3.5 shadow-[0_14px_28px_rgba(96,132,184,0.12)]">
                    <div className="overflow-hidden rounded-[22px] border bg-slate-50" style={{ borderColor: BORDER }}>
                      <img src={courseAssetUrl(currentChoiceBlock.mediaUrl)} alt={currentChoiceBlock.question.text} className="w-full object-contain" />
                    </div>
                  </div>
                ) : null}

                <ChoiceCard
                  question={currentChoiceBlock.question}
                  answer={answers[currentChoiceBlock.question.key]}
                  onSelect={(value) => setChoiceAnswer(currentChoiceBlock.question.key, value, currentChoiceBlock.question.correctIndex)}
                  showQuestionNumber={!currentChoiceBlock.prompt}
                />
              </div>
            ) : null}
          </section>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={goPrev}
            disabled={currentStepIndex === 0 || examLocked}
            className="inline-flex items-center gap-2 rounded-full border border-[#E9E1CE] bg-pmn-card px-5 py-3 text-[13px] font-black text-[#0A1E48] shadow-[0_8px_18px_-10px_rgba(10,30,72,0.18)] transition disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Oldingi
          </button>

          <button
            type="button"
            onClick={goNext}
            disabled={currentStepIndex === steps.length - 1 || !currentAnswered || examLocked}
            className="inline-flex items-center gap-2 rounded-full bg-[#0A1E48] px-5 py-3 text-[13px] font-black text-white shadow-[0_14px_28px_-14px_rgba(10,30,72,0.55)] transition disabled:opacity-40"
          >
            Keyingi
            <ChevronRight className="h-4 w-4" />
          </button>

          {result && !savedResult ? (
            <div className="ml-auto rounded-full border border-[#E9E1CE] bg-pmn-card px-4 py-2.5 text-[12px] font-black shadow-[0_8px_18px_-10px_rgba(10,30,72,0.14)]">
              <span className="text-[#8A8172]">To‘g‘ri: </span>
              <span className="text-[#0A1E48]">{result.correctCount}/{result.totalCount}</span>
            </div>
          ) : null}

          {allAnswered && !savedResult && token ? (
            <button
              type="button"
              onClick={handleFinishExam}
              disabled={submitting}
              className="patent-gold-cta w-full rounded-full px-6 py-4 text-[14px] font-black shadow-[0_14px_30px_-10px_rgba(217,180,90,0.6),inset_0_1px_0_rgba(255,255,255,0.35)] transition sm:ml-0 sm:w-auto"
            >
              {submitting ? 'Saqlanmoqda...' : '✦ Imtihonni yakunlash'}
            </button>
          ) : null}
        </div>
        {submitError ? <p className="mt-2 text-sm text-red-600">{submitError}</p> : null}
        {!token && allAnswered && !savedResult ? (
          <p className="mt-2 text-sm text-amber-700">Natijani saqlash uchun tizimga kiring.</p>
        ) : null}
        </>
        ) : null}
      </main>
    </div>
  );
}
