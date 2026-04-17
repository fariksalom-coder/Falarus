import { Layers, ClipboardList, Puzzle, Lock } from 'lucide-react';
const HINT_80 = 'Keyingi bosqich ochilishi uchun kamida 80% to‘g‘ri javob kerak';

export type VocabularyTaskListProps = {
  partTitle: string;
  learnedWords: number;
  totalWords: number;
  hasServerSnapshot: boolean;
  step1Completed: boolean;
  step1KnownDisplay: number;
  step1UnknownDisplay: number;
  step2Completed: boolean;
  step2Passed: boolean;
  step2CorrectDisplay: number;
  step2IncorrectDisplay: number;
  step2PercentageDisplay: number;
  step3Unlocked: boolean;
  step3Completed: boolean;
  onOpenStep1: () => void;
  onOpenStep2: () => void;
  onOpenStep3: () => void;
};

export function VocabularyTaskList({
  partTitle,
  learnedWords,
  totalWords,
  hasServerSnapshot,
  step1Completed,
  step1KnownDisplay,
  step1UnknownDisplay,
  step2Completed,
  step2Passed,
  step2CorrectDisplay,
  step2IncorrectDisplay,
  step2PercentageDisplay,
  step3Unlocked,
  step3Completed,
  onOpenStep1,
  onOpenStep2,
  onOpenStep3,
}: VocabularyTaskListProps) {
  const step2Locked = !step1Completed;
  const step3Locked = !step3Unlocked;

  return (
    <>
      <h2 className="mb-1 text-lg font-semibold text-slate-900">{partTitle}</h2>
      <p className="mb-4 text-sm text-slate-600">
        O‘rganilgan so‘zlar:{' '}
        <span className="font-semibold text-slate-900">
          {hasServerSnapshot ? `${learnedWords} / ${totalWords}` : 'Yuklanmoqda...'}
        </span>
      </p>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <button
          type="button"
          onClick={onOpenStep1}
          className="rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Layers className="h-5 w-5" strokeWidth={1.8} />
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-900">1. Tanishish</p>
          <p className="mt-1 text-xs text-slate-600">
            {step1Completed
              ? `Biladi ${step1KnownDisplay} / Bilmaydi ${step1UnknownDisplay}`
              : 'Bilaman / bilmayman'}
          </p>
          <span className="mt-2 inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
            {step1Completed ? 'Tugagan' : 'Boshlash'}
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenStep2}
          disabled={step2Locked}
          className="rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition enabled:hover:-translate-y-0.5 enabled:hover:border-indigo-200 enabled:hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            {step2Locked ? <Lock className="h-4.5 w-4.5" strokeWidth={1.8} /> : <ClipboardList className="h-5 w-5" strokeWidth={1.8} />}
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-900">2. Test</p>
          <p className="mt-1 text-xs text-slate-600">
            {step2Completed
              ? `${step2CorrectDisplay} / ${step2CorrectDisplay + step2IncorrectDisplay} (${Math.round(step2PercentageDisplay)}%)`
              : step2Locked
                ? HINT_80
                : 'Boshlash'}
          </p>
          <span className="mt-2 inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-700">
            {step2Locked ? 'Qulflangan' : step2Completed ? (step2Passed ? 'O‘tgan' : 'Qayta urinish') : 'Boshlash'}
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenStep3}
          disabled={step3Locked}
          className="rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition enabled:hover:-translate-y-0.5 enabled:hover:border-indigo-200 enabled:hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            {step3Locked ? <Lock className="h-4.5 w-4.5" strokeWidth={1.8} /> : <Puzzle className="h-5 w-5" strokeWidth={1.8} />}
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-900">3. Juftini topish</p>
          <p className="mt-1 text-xs text-slate-600">
            {step3Locked ? HINT_80 : step3Completed ? 'Barcha juftlar topildi' : 'Boshlash'}
          </p>
          <span className="mt-2 inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-700">
            {step3Locked ? 'Qulflangan' : step3Completed ? 'Tugagan' : 'Boshlash'}
          </span>
        </button>
      </div>
    </>
  );
}
