import { Check, ClipboardList, Layers, Lock, Puzzle } from 'lucide-react';
const HINT_STEP2_LOCKED = 'Avval tanishish bosqichini tugating';
const HINT_STEP3_LOCKED = 'Testdan kamida 80% bilan o‘ting — keyin juftlik ochiladi';

/** Kunlik grammatika kartochkalari bilan mos ranglar */
const shellLocked =
  'cursor-not-allowed border border-slate-200/95 bg-gradient-to-b from-slate-100 to-slate-50/90 opacity-[0.92] shadow-sm';
const shellCurrent =
  'cursor-pointer border-2 border-[#2563EB]/45 bg-gradient-to-b from-blue-50 via-blue-50/70 to-white shadow-[0_10px_30px_rgba(37,99,235,0.14)] ring-1 ring-[#2563EB]/20 hover:-translate-y-0.5 hover:border-[#2563EB] hover:shadow-[0_14px_36px_rgba(37,99,235,0.22)] active:scale-[0.98]';
const shellCompleted =
  'cursor-pointer border border-emerald-200/95 bg-gradient-to-b from-emerald-50 via-emerald-50/50 to-white shadow-[0_10px_30px_rgba(16,185,129,0.12)] ring-1 ring-emerald-100/80 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_14px_34px_rgba(16,185,129,0.14)] active:scale-[0.98]';

const footerPrimary =
  'pointer-events-none mt-3 block w-full rounded-2xl bg-[#2563EB] py-2.5 text-center text-sm font-bold text-white shadow-[0_8px_22px_rgba(37,99,235,0.32)]';
const footerSuccess =
  'pointer-events-none mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-2.5 text-center text-sm font-bold text-white shadow-[0_8px_22px_rgba(22,163,74,0.28)]';

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

  const step1Current = !step1Completed;
  const step2Current = step1Completed && !step2Passed;
  const step3Current = step2Passed && !step3Completed;

  const iconEmeraldWrap = 'bg-emerald-100 text-emerald-700 ring-emerald-200/90';
  const iconBlueWrap = 'bg-blue-100 text-[#2563EB] ring-blue-200/90';
  const iconMutedWrap = 'bg-slate-200/90 text-slate-500 ring-slate-200/80';

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
          className={`rounded-2xl p-3 text-left shadow-sm transition-all ${step1Completed ? shellCompleted : shellCurrent}`}
        >
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-inner ring-1 ${step1Completed ? iconEmeraldWrap : iconBlueWrap}`}
          >
            <Layers className="h-5 w-5" strokeWidth={1.8} />
          </div>
          <p className={`mt-2 text-sm font-semibold ${step1Completed ? 'text-emerald-950/90' : 'text-[#0F172A]'}`}>
            1. Tanishish
          </p>
          <p className={`mt-1 text-xs ${step1Completed ? 'text-emerald-900/75' : 'text-blue-950/85'}`}>
            {step1Completed
              ? `Biladi ${step1KnownDisplay} / Bilmaydi ${step1UnknownDisplay}`
              : 'Bilaman / bilmayman'}
          </p>
          {step1Current ? (
            <span className={footerPrimary}>Boshlash</span>
          ) : (
            <span className={footerSuccess}>
              <Check className="h-4 w-4 shrink-0" strokeWidth={3} aria-hidden />
              Tugagan
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onOpenStep2}
          disabled={step2Locked}
          className={`rounded-2xl p-3 text-left shadow-sm transition-all ${
            step2Locked ? shellLocked : step2Passed ? shellCompleted : step2Current ? shellCurrent : shellCompleted
          }`}
        >
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-inner ring-1 ${
              step2Locked ? iconMutedWrap : step2Passed ? iconEmeraldWrap : iconBlueWrap
            }`}
          >
            {step2Locked ? <Lock className="h-[18px] w-[18px]" strokeWidth={2} /> : <ClipboardList className="h-5 w-5" strokeWidth={1.8} />}
          </div>
          <p
            className={`mt-2 text-sm font-semibold ${
              step2Locked ? 'text-slate-500' : step2Passed ? 'text-emerald-950/90' : 'text-[#0F172A]'
            }`}
          >
            2. Test
          </p>
          <p
            className={`mt-1 text-xs ${
              step2Locked ? 'text-slate-500' : step2Passed ? 'text-emerald-900/75' : 'text-blue-950/85'
            }`}
          >
            {step2Completed
              ? `${step2CorrectDisplay} / ${step2CorrectDisplay + step2IncorrectDisplay} (${Math.round(step2PercentageDisplay)}%)`
              : step2Locked
                ? HINT_STEP2_LOCKED
                : 'Variantlarni tanlang'}
          </p>
          {step2Locked ? (
            <span className="pointer-events-none mt-3 inline-flex w-full justify-center rounded-xl bg-slate-200/90 py-2 text-center text-[11px] font-bold text-slate-600 ring-1 ring-slate-300/60">
              Qulflangan
            </span>
          ) : step2Current ? (
            <span className={footerPrimary}>{step2Completed && !step2Passed ? 'Qayta urinish' : 'Boshlash'}</span>
          ) : (
            <span className={footerSuccess}>
              <Check className="h-4 w-4 shrink-0" strokeWidth={3} aria-hidden />
              O‘tgan
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onOpenStep3}
          disabled={step3Locked}
          className={`rounded-2xl p-3 text-left shadow-sm transition-all ${
            step3Locked ? shellLocked : step3Completed ? shellCompleted : step3Current ? shellCurrent : shellCompleted
          }`}
        >
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-inner ring-1 ${
              step3Locked ? iconMutedWrap : step3Completed ? iconEmeraldWrap : iconBlueWrap
            }`}
          >
            {step3Locked ? <Lock className="h-[18px] w-[18px]" strokeWidth={2} /> : <Puzzle className="h-5 w-5" strokeWidth={1.8} />}
          </div>
          <p
            className={`mt-2 text-sm font-semibold ${
              step3Locked ? 'text-slate-500' : step3Completed ? 'text-emerald-950/90' : 'text-[#0F172A]'
            }`}
          >
            3. Juftini topish
          </p>
          <p
            className={`mt-1 text-xs ${
              step3Locked ? 'text-slate-500' : step3Completed ? 'text-emerald-900/75' : 'text-blue-950/85'
            }`}
          >
            {step3Locked ? HINT_STEP3_LOCKED : step3Completed ? 'Barcha juftlar topildi' : 'Rus va o‘zbek juftlari'}
          </p>
          {step3Locked ? (
            <span className="pointer-events-none mt-3 inline-flex w-full justify-center rounded-xl bg-slate-200/90 py-2 text-center text-[11px] font-bold text-slate-600 ring-1 ring-slate-300/60">
              Qulflangan
            </span>
          ) : step3Current ? (
            <span className={footerPrimary}>Boshlash</span>
          ) : (
            <span className={footerSuccess}>
              <Check className="h-4 w-4 shrink-0" strokeWidth={3} aria-hidden />
              Tugagan
            </span>
          )}
        </button>
      </div>
    </>
  );
}
