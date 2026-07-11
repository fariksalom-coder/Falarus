import type { TestQuestion } from '../vocabExerciseUtils';

const PASS_PERCENT = 80;

type Props = {
  questions: TestQuestion[];
  testIndex: number;
  testSelected: string | null;
  testCorrect: number;
  pointsEarnedMessage: number | null;
  /** After save, prefer server step2 fields so the summary does not flicker. */
  summaryFromServer?: {
    correct: number;
    incorrect: number;
    percentage: number;
    passed: boolean;
  } | null;
  onChoose: (option: string) => void;
  onNext: () => void;
  onContinueToPairs: () => void;
  onRetry: () => void;
};

export function VocabularyTestExercise({
  questions,
  testIndex,
  testSelected,
  testCorrect,
  pointsEarnedMessage,
  summaryFromServer,
  onChoose,
  onNext,
  onContinueToPairs,
  onRetry,
}: Props) {
  const current = questions[testIndex];
  const n = questions.length;

  if (current) {
    return (
      <div className="mx-auto max-w-[720px]">
        {/* Purple gradient progress bar */}
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#DDD7F5]">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${((testIndex + 1) / n) * 100}%`,
                background: 'linear-gradient(90deg, #8B7AF7, #5B4CE0)',
              }}
            />
          </div>
          <span className="grammar-heading text-[13px] text-[#5B4CE0]">
            {testIndex + 1}/{n}
          </span>
        </div>

        <p className="mt-3 text-[11px] font-black uppercase tracking-[0.16em] text-[#8B7FAB]">
          VAZIFA 2 · TEST · {testIndex + 1}/{n}
        </p>

        {/* Caption + word card with peach decor */}
        <div className="mt-3 text-center">
          <p className="mb-2 text-[13px] font-black text-[#8B7FAB]">
            Tarjimasini tanlang
          </p>
          <div className="relative overflow-hidden rounded-[24px] border-[1.5px] border-[#DDD7F5] bg-white p-[26px] shadow-[0_10px_28px_-14px_rgba(45,27,105,0.14)]">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-6 bottom-4 h-20 w-20 rounded-full"
              style={{ background: 'rgba(255,206,176,0.35)' }}
            />
            <p className="grammar-heading relative z-[2] text-[40px] leading-none tracking-[-0.02em] text-[#2D1B69]">
              {current.uzbek}
            </p>
          </div>
        </div>

        {/* Options */}
        <div className="mt-4 grid grid-cols-2 gap-[10px]">
          {current.options.map((opt) => {
            const isSelected = testSelected === opt;
            const isCorrect = Boolean(testSelected) && opt === current.correct;
            const isWrong = isSelected && testSelected !== current.correct;
            const answered = Boolean(testSelected);

            let cls =
              'grammar-heading flex min-h-[60px] w-full items-center justify-center rounded-[16px] border-[1.5px] border-[#DDD7F5] bg-white px-4 py-3 text-center text-[17px] text-[#2D1B69] shadow-[0_6px_14px_-8px_rgba(45,27,105,0.12)] transition-all';
            if (isCorrect) {
              cls =
                'grammar-heading flex min-h-[60px] w-full items-center justify-center rounded-[16px] border-[1.5px] border-[#82E5B8] bg-[#DCFCE7] px-4 py-3 text-center text-[17px] text-[#0F7C3A] shadow-[0_8px_18px_-8px_rgba(34,197,94,0.35)]';
            } else if (isWrong) {
              cls =
                'grammar-heading flex min-h-[60px] w-full items-center justify-center rounded-[16px] border-[1.5px] border-[#F5B5B5] bg-[#FEEBEB] px-4 py-3 text-center text-[17px] text-[#B4282E] shadow-[0_10px_22px_-10px_rgba(180,40,46,0.28)]';
            } else if (isSelected) {
              cls =
                'grammar-heading flex min-h-[60px] w-full items-center justify-center rounded-[16px] border-2 border-[#5B4CE0] bg-[#EDE9FB] px-4 py-3 text-center text-[17px] text-[#2D1B69] shadow-[0_0_0_4px_rgba(91,76,224,0.14)]';
            } else if (answered) {
              cls += ' opacity-70';
            }

            return (
              <button
                key={opt}
                type="button"
                disabled={answered}
                onClick={() => onChoose(opt)}
                className={cls}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {/* Next button — mint green */}
        {testSelected ? (
          <button
            type="button"
            onClick={onNext}
            className="grammar-heading mt-5 h-[54px] w-full rounded-full bg-[#22C55E] text-[16px] text-white shadow-[0_14px_28px_-12px_rgba(34,197,94,0.55)] active:scale-[0.99]"
          >
            Keyingi savol →
          </button>
        ) : null}
      </div>
    );
  }

  const srv = summaryFromServer;
  const correct = srv?.correct ?? testCorrect;
  const incorrect = srv?.incorrect ?? Math.max(0, n - testCorrect);
  const total = correct + incorrect;
  const percentage =
    srv?.percentage ?? (total > 0 ? Math.round((correct / total) * 100) : 0);
  const passed = srv?.passed ?? percentage >= PASS_PERCENT;

  return (
    <div className="mx-auto max-w-[720px]">
      <div
        className="rounded-[20px] border-[1.5px] p-8 text-center shadow-[0_8px_20px_rgba(23,34,74,0.06)]"
        style={{
          borderColor: passed ? '#ABEBC8' : '#F6C6C6',
          backgroundColor: passed ? '#F0FFF6' : '#FEF3F3',
        }}
      >
        <p className="text-[19px] font-extrabold text-app-text">Test tugallandi</p>
        {!passed ? (
          <p className="mt-2 text-sm font-bold text-[#D14343]">
            Siz testdan o'tmadingiz. Kamida {PASS_PERCENT}% to'g'ri javob kerak.
          </p>
        ) : (
          <p className="mt-2 text-sm font-bold text-[#12813F]">
            Ajoyib! 3-bosqich ochildi.
          </p>
        )}

        <div className="mt-4 flex flex-col items-center gap-2.5">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#E4F8EC] px-4 py-2 text-sm font-bold text-[#12813F]">
            <span>🟢</span> To'g'ri: {correct}
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#FFEDED] px-4 py-2 text-sm font-bold text-[#D14343]">
            <span>🔴</span> Noto'g'ri: {incorrect}
          </div>
          <div
            className="rounded-full px-4 py-2 text-sm font-black"
            style={{
              background: passed ? '#DDF6E7' : '#FBDDDD',
              color: passed ? '#12813F' : '#8A1F1F',
            }}
          >
            Natija: {percentage}% {passed ? "— O'tdi" : "— O'tmadi"}
          </div>

          {pointsEarnedMessage != null && pointsEarnedMessage > 0 ? (
            <p className="mt-2 text-base font-black text-app-text">
              Siz {pointsEarnedMessage} ball oldingiz! Barakalla!
            </p>
          ) : null}

          {!passed ? (
            <p className="text-xs font-semibold text-app-text-muted">
              Keyingi bosqich ochilishi uchun kamida {PASS_PERCENT}% to'g'ri javob kerak
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={passed ? onContinueToPairs : onRetry}
          className="mt-6 h-[54px] w-full rounded-[16px] px-5 text-[16px] font-extrabold text-white shadow-[0_14px_26px_-10px_rgba(11,42,107,0.55)] transition-colors active:scale-[0.99]"
          style={{ backgroundColor: passed ? '#0B2A6B' : '#D14343' }}
        >
          {passed ? "3-bosqichga o'tish (juftlar)" : 'Qayta urinish'}
        </button>
      </div>
    </div>
  );
}
