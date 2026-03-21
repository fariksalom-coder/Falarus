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
      <div className="mx-auto max-w-[720px]" style={{ backgroundColor: '#F8FAFC' }}>
        <p className="text-center text-sm font-medium" style={{ color: '#64748B' }}>
          {testIndex + 1} / {n} savol
        </p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${((testIndex + 1) / n) * 100}%`,
              backgroundColor: '#6366F1',
            }}
          />
        </div>

        <div
          className="mt-6 rounded-[20px] border bg-white p-8 text-center shadow-md"
          style={{ borderColor: '#E2E8F0' }}
        >
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#64748B' }}>
            So&apos;zni tarjimasini tanlang
          </p>
          <p className="mt-4 text-3xl font-bold" style={{ color: '#0F172A' }}>
            {current.uzbek}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {current.options.map((opt) => {
            const isSelected = testSelected === opt;
            const isCorrect = Boolean(testSelected) && opt === current.correct;
            const isWrong = isSelected && testSelected !== current.correct;
            const baseCls =
              'w-full rounded-[14px] border-2 px-4 py-4 text-left text-base font-medium transition-all duration-200';
            const cls = isCorrect
              ? `${baseCls} border-[#22C55E] bg-[#F0FDF4] text-[#166534]`
              : isWrong
                ? `${baseCls} border-[#EF4444] bg-[#FEF2F2] text-[#B91C1C]`
                : testSelected
                  ? `${baseCls} border-[#E2E8F0] bg-white text-[#64748B] opacity-80`
                  : `${baseCls} border-[#E2E8F0] bg-white text-[#0F172A] hover:border-[#6366F1] hover:bg-[#EEF2FF] hover:shadow-sm`;
            return (
              <button
                key={opt}
                type="button"
                disabled={!!testSelected}
                onClick={() => onChoose(opt)}
                className={cls}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {testSelected ? (
          <button
            type="button"
            onClick={onNext}
            className="mt-6 w-full rounded-[14px] py-4 text-lg font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            style={{ backgroundColor: '#6366F1' }}
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
    <div className="mx-auto max-w-[720px]" style={{ backgroundColor: '#F8FAFC' }}>
      <div
        className="rounded-[20px] border bg-white p-12 text-center shadow-sm"
        style={{
          borderColor: passed ? '#BBF7D0' : '#FECACA',
          backgroundColor: passed ? '#FFFFFF' : '#FEF2F2',
        }}
      >
        <p className="text-xl font-semibold" style={{ color: '#0F172A' }}>
          Test tugallandi
        </p>
        {!passed ? (
          <p className="mt-2 text-sm font-medium text-red-700">
            Siz testdan o‘tmadingiz. Kamida {PASS_PERCENT}% to‘g‘ri javob kerak.
          </p>
        ) : (
          <p className="mt-2 text-sm" style={{ color: '#166534' }}>
            Ajoyib! 3-bosqich ochildi.
          </p>
        )}

        <div className="mt-4 flex flex-col items-center gap-3" style={{ width: '100%' }}>
          <div
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold"
            style={{
              borderColor: '#BBF7D0',
              backgroundColor: '#F0FDF4',
              color: '#166534',
            }}
          >
            <span>🟢</span>
            To‘g‘ri: {correct}
          </div>

          <div
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold"
            style={{
              borderColor: '#FECACA',
              backgroundColor: '#FEF2F2',
              color: '#B91C1C',
            }}
          >
            <span>🔴</span>
            Noto‘g‘ri: {incorrect}
          </div>

          <div
            className="rounded-xl border px-4 py-2 text-sm font-semibold"
            style={{
              borderColor: passed ? '#BBF7D0' : '#FECACA',
              backgroundColor: passed ? '#F0FDF4' : '#FEE2E2',
              color: passed ? '#166534' : '#B91C1C',
            }}
          >
            Natija: {percentage}% {passed ? '— O‘tdi' : '— O‘tmadi'}
          </div>

          {pointsEarnedMessage != null && pointsEarnedMessage > 0 ? (
            <p className="mt-2 text-base font-semibold" style={{ color: '#0F172A' }}>
              Siz {pointsEarnedMessage} ball oldingiz! Barakalla!
            </p>
          ) : null}

          {!passed ? (
            <p className="text-xs font-medium" style={{ color: '#64748B' }}>
              Keyingi bosqich ochilishi uchun kamida {PASS_PERCENT}% to‘g‘ri javob kerak
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={passed ? onContinueToPairs : onRetry}
          className="mt-6 w-full rounded-xl px-5 py-3.5 text-base font-semibold text-white shadow-md transition-colors hover:opacity-95"
          style={{ backgroundColor: passed ? '#6366F1' : '#EF4444' }}
        >
          {passed ? '3-bosqichga o‘tish (juftlar)' : 'Qayta urinish'}
        </button>
      </div>
    </div>
  );
}
