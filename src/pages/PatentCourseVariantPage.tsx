import { useEffect, useMemo, useRef, useState } from 'react';
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
  PatentExamAudioDoubleBlock,
  PatentExamBlock,
  PatentExamChoiceQuestion,
  PatentExamMultipleChoiceBlock,
  PatentExamVariant,
  PatentExamWrittenBlock,
} from '../data/patentExamData';
import { evaluatePatentVariant, isImageAssetOption, type PatentExamAnswerMap } from '../utils/patentExam';
import { courseAssetUrl } from '../utils/courseAssetUrl';
import { useAuth } from '../context/AuthContext';
import { savePatentVariantResult, type PatentVariantResult } from '../api/patentResults';

const BG = '#EEF6FF';
const BORDER = '#D7E5F5';
const TEXT = '#16324F';
const TEXT_SECONDARY = '#6B7F99';

type PatentVariantStep = {
  block: PatentExamBlock;
  questionNumbers: number[];
};

function normalizeWrittenAnswer(value: string): string {
  return value.trim().toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').replace(/\s+/g, ' ');
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
}: {
  question: PatentExamChoiceQuestion;
  answer: string | number | undefined;
  onSelect: (value: number) => void;
}) {
  const answered = typeof answer === 'number';

  return (
    <div className="rounded-[24px] bg-white p-4 shadow-[0_14px_28px_rgba(96,132,184,0.12)] sm:p-5">
      <h2 className="text-[18px] font-bold leading-tight sm:text-[21px]" style={{ color: TEXT }}>
        {question.questionNumber}. {question.text}
      </h2>

      <div className="mt-4 space-y-2.5">
        {question.options.map((option, optionIndex) => {
          const isCorrect = answered && optionIndex === question.correctIndex;
          const isWrong = answered && answer === optionIndex && optionIndex !== question.correctIndex;
          const isSelected = answer === optionIndex;
          const imageOption = isImageAssetOption(option);
          const optionSrc = courseAssetUrl(option);

          let borderColor = '#C4D6EC';
          let backgroundColor = '#FFFFFF';
          let icon = <Circle className="h-5 w-5 text-[#A8BEDA]" />;

          if (isCorrect) {
            borderColor = '#1D4ED8';
            backgroundColor = '#E8F0FF';
            icon = (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1D4ED8] text-white">
                <Check className="h-4 w-4" />
              </span>
            );
          } else if (isWrong) {
            borderColor = '#EF4444';
            backgroundColor = '#F4E6E6';
            icon = (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EF4444] text-white">
                <X className="h-4 w-4" />
              </span>
            );
          } else if (isSelected) {
            borderColor = '#2563EB';
            backgroundColor = '#EFF6FF';
            icon = <Circle className="h-5 w-5 fill-[#2563EB] text-[#2563EB]" />;
          }

          return (
            <button
              key={`${question.key}-${optionIndex}`}
              type="button"
              onClick={() => {
                if (!answered) onSelect(optionIndex);
              }}
              disabled={answered}
              className={`w-full rounded-[24px] border text-left transition ${
                imageOption ? 'overflow-hidden p-2.5' : 'px-3.5 py-3'
              }`}
              style={{
                borderColor,
                backgroundColor,
              }}
            >
              {imageOption ? (
                <div className="flex items-center gap-2.5">
                  <div className="shrink-0">{icon}</div>
                  <div className="min-w-0 flex-1 overflow-hidden rounded-[18px] bg-white/70">
                    <img src={optionSrc} alt={`Variant ${optionIndex + 1}`} className="h-28 w-full object-contain bg-slate-50 sm:h-32" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="shrink-0">{icon}</div>
                  <div className="min-w-0 text-[16px] sm:text-[17px]" style={{ color: TEXT }}>
                    {option}
                  </div>
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
  const currentValue = typeof answer === 'string' ? answer : '';
  const hasValue = currentValue.trim().length > 0;
  const correct = hasValue
    ? block.correctAnswers.some((candidate) => normalizeWrittenAnswer(candidate) === normalizeWrittenAnswer(currentValue))
    : false;

  return (
    <div className="rounded-[24px] bg-white p-4 shadow-[0_14px_28px_rgba(96,132,184,0.12)] sm:p-5">
      <h2 className="text-[18px] font-bold leading-tight sm:text-[21px]" style={{ color: TEXT }}>
        {block.questionNumber}. {block.prompt ?? "To'g'ri javobni yozing"}
      </h2>

      {block.mediaUrl ? (
        <div className="mt-4 overflow-hidden rounded-[22px] border bg-slate-50" style={{ borderColor: BORDER }}>
          <img src={courseAssetUrl(block.mediaUrl)} alt={`Question ${block.questionNumber}`} className="w-full object-contain" />
        </div>
      ) : null}

      <input
        type="text"
        value={currentValue}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Javobni yozing"
        className="mt-4 w-full rounded-[20px] border bg-white px-4 py-3 text-[16px] outline-none transition focus:ring-4 focus:ring-[#DBEAFF] sm:text-[17px]"
        style={{
          borderColor: !hasValue ? '#C4D6EC' : correct ? '#1D4ED8' : '#EF4444',
          color: TEXT,
          backgroundColor: !hasValue ? '#FFFFFF' : correct ? '#EEF4FF' : '#FDF2F2',
        }}
      />

      {hasValue ? (
        <div
          className="mt-3 inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold"
          style={{
            backgroundColor: correct ? '#E8F0FF' : '#FCE7E7',
            color: correct ? '#1D4ED8' : '#DC2626',
          }}
        >
          {correct ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          {correct ? "To'g'ri javob" : `To'g'ri javob: ${block.correctAnswers.join(' / ')}`}
        </div>
      ) : null}
    </div>
  );
}

function AudioPlayerCard({ mediaUrl }: { mediaUrl: string }) {
  return (
    <div className="rounded-[24px] bg-white p-4 shadow-[0_14px_28px_rgba(96,132,184,0.12)]">
      <audio controls preload="none" className="w-full" src={courseAssetUrl(mediaUrl)} />
    </div>
  );
}

export default function PatentCourseVariantPage() {
  const navigate = useNavigate();
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
        setVariantsError("Ma'lumotlar yuklanmadi");
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

  if (variantsLoading) {
    return (
      <div className="min-h-screen px-4 py-8" style={{ backgroundColor: BG }}>
        <div className="mx-auto flex max-w-5xl items-center justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
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
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Orqaga
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
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Orqaga
        </button>
        <p className="mt-6 text-lg font-semibold" style={{ color: TEXT }}>
          Variant topilmadi
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

  const setChoiceAnswer = (key: string, value: number) => {
    if (examLocked) return;
    setAnswers((prev) => {
      if (typeof prev[key] === 'number') return prev;
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
      <div className="pointer-events-none absolute -left-16 bottom-[-3rem] h-52 w-52 rounded-full bg-[#DCEBFF]" />
      <div className="pointer-events-none absolute -right-10 top-[-2rem] h-64 w-64 rounded-full bg-[#E6F1FF]" />

      <main className="relative mx-auto max-w-5xl px-4 py-4 sm:px-5">
        <div className="mb-4 flex items-center">
          <button
            type="button"
            onClick={() => navigate('/kurslar/patent')}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/85 text-[#2563EB] shadow-[0_10px_24px_rgba(37,99,235,0.12)] backdrop-blur-sm transition hover:-translate-y-0.5"
            aria-label="Orqaga"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
        </div>

        {savedResult ? (
          <section
            className="mb-4 rounded-[24px] border px-5 py-5 shadow-[0_18px_40px_rgba(148,163,184,0.18)]"
            style={{
              borderColor: savedResult.passed ? '#86EFAC' : '#FECACA',
              backgroundColor: savedResult.passed ? '#F0FDF4' : '#FEF2F2',
            }}
          >
            <p className="text-lg font-bold" style={{ color: savedResult.passed ? '#15803D' : '#B91C1C' }}>
              {savedResult.passed ? 'Экзамен сдан' : 'Экзамен не сдан'}
            </p>
            <p className="mt-2 text-sm font-medium text-slate-700">
              To‘g‘ri javoblar: {savedResult.correct_count} / {savedResult.total_count} ({savedResult.score_percent}%)
            </p>
            <p className="mt-2 text-xs text-slate-600">
              Natija saqlandi. Variantlar ro‘yxatiga qaytsangiz, natija u yerda ko‘rinadi. Keyingi kirishda test yangidan boshlanadi.
            </p>
            <button
              type="button"
              onClick={() => navigate('/kurslar/patent')}
              className="mt-4 w-full rounded-[16px] bg-[#2563EB] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(37,99,235,0.25)] sm:w-auto"
            >
              Variantlarga qaytish
            </button>
          </section>
        ) : null}

        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max gap-2">
            {Array.from({ length: variant.totalQuestions }, (_, index) => {
              const questionNumber = index + 1;
              const stepIndex = questionToStepIndex.get(questionNumber) ?? 0;
              const block = steps[stepIndex]?.block;
              const answered = block ? isQuestionAnswered(block, answers, questionNumber) : false;
              const correct = block ? isQuestionCorrect(block, answers, questionNumber) : false;
              const active = (currentStep?.questionNumbers.includes(questionNumber) ?? false) && !answered;

              let background = '#B8C7D9';
              let color = '#FFFFFF';
              let boxShadow = 'none';
              let border = '2px solid transparent';

              if (answered && correct) {
                background = '#16A34A';
                boxShadow = '0 10px 24px rgba(22,163,74,0.16)';
              } else if (answered && !correct) {
                background = '#EF4444';
                boxShadow = '0 10px 24px rgba(239,68,68,0.16)';
              } else if (active) {
                background = '#DBEAFE';
                color = '#2563EB';
                border = '2px solid #93C5FD';
                boxShadow = '0 8px 20px rgba(147,197,253,0.28)';
              }

              return (
                <button
                  key={questionNumber}
                  type="button"
                  onClick={() => setCurrentStepIndex(stepIndex)}
                  className="flex h-12 w-12 items-center justify-center rounded-[16px] text-[20px] font-bold transition-all duration-200 sm:h-[52px] sm:w-[52px]"
                  style={{ background, color, boxShadow, border }}
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
              <AudioPlayerCard mediaUrl={currentStep.block.mediaUrl} />
            ) : null}

            {currentStep.block.kind === 'audio-double' ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {currentStep.block.subQuestions.map((question) => (
                  <ChoiceCard
                    key={question.key}
                    question={question}
                    answer={answers[question.key]}
                    onSelect={(value) => setChoiceAnswer(question.key, value)}
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
                {currentChoiceBlock.mediaUrl ? (
                  <div className="rounded-[24px] bg-white p-3.5 shadow-[0_14px_28px_rgba(96,132,184,0.12)]">
                    <div className="overflow-hidden rounded-[22px] border bg-slate-50" style={{ borderColor: BORDER }}>
                      <img src={courseAssetUrl(currentChoiceBlock.mediaUrl)} alt={currentChoiceBlock.question.text} className="w-full object-contain" />
                    </div>
                  </div>
                ) : null}

                <ChoiceCard
                  question={currentChoiceBlock.question}
                  answer={answers[currentChoiceBlock.question.key]}
                  onSelect={(value) => setChoiceAnswer(currentChoiceBlock.question.key, value)}
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
            className="inline-flex items-center gap-2 rounded-[16px] border bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(148,163,184,0.12)] disabled:opacity-50"
            style={{ borderColor: BORDER }}
          >
            <ChevronLeft className="h-4 w-4" />
            Oldingi
          </button>

          <button
            type="button"
            onClick={goNext}
            disabled={currentStepIndex === steps.length - 1 || !currentAnswered || examLocked}
            className="inline-flex items-center gap-2 rounded-[16px] bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(37,99,235,0.22)] disabled:opacity-50"
          >
            Keyingi
            <ChevronRight className="h-4 w-4" />
          </button>

          {result && !savedResult ? (
            <div className="ml-auto rounded-[16px] bg-white px-4 py-2.5 text-sm font-semibold shadow-[0_10px_24px_rgba(148,163,184,0.12)]">
              <span style={{ color: TEXT_SECONDARY }}>To‘g‘ri: </span>
              <span style={{ color: TEXT }}>{result.correctCount}/{result.totalCount}</span>
            </div>
          ) : null}

          {allAnswered && !savedResult && token ? (
            <button
              type="button"
              onClick={handleFinishExam}
              disabled={submitting}
              className="w-full rounded-[16px] border-2 border-[#2563EB] bg-[#EFF6FF] px-4 py-3 text-sm font-bold text-[#1D4ED8] shadow-[0_10px_24px_rgba(37,99,235,0.15)] sm:ml-0 sm:w-auto"
            >
              {submitting ? 'Saqlanmoqda...' : 'Ekzamenni yakunlash va natijani saqlash'}
            </button>
          ) : null}
        </div>
        {submitError ? <p className="mt-2 text-sm text-red-600">{submitError}</p> : null}
        {!token && allAnswered && !savedResult ? (
          <p className="mt-2 text-sm text-amber-700">Natijani saqlash uchun tizimga kiring.</p>
        ) : null}
      </main>
    </div>
  );
}
