import { Layers, ClipboardList, Puzzle } from 'lucide-react';
import { StepCard, type StepStatus } from './ThreeStepLearning/StepCard';
import { VocabularyProgressBar } from './VocabularyProgressBar';
import type { WordGroupStepsState } from '../../api/vocabulary';

const HINT_80 = 'Keyingi bosqich ochilishi uchun kamida 80% to‘g‘ri javob kerak';

export type VocabularyTaskListProps = {
  partTitle: string;
  learnedWords: number;
  totalWords: number;
  step1Completed: boolean;
  step1KnownDisplay: number;
  step1UnknownDisplay: number;
  stepsState: WordGroupStepsState | undefined;
  step3Completed: boolean;
  onOpenStep1: () => void;
  onOpenStep2: () => void;
  onOpenStep3: () => void;
};

export function VocabularyTaskList({
  partTitle,
  learnedWords,
  totalWords,
  step1Completed,
  step1KnownDisplay,
  step1UnknownDisplay,
  stepsState,
  step3Completed,
  onOpenStep1,
  onOpenStep2,
  onOpenStep3,
}: VocabularyTaskListProps) {
  const step2Completed = stepsState?.step2.completed ?? false;
  const step2Passed = stepsState?.step2.passed ?? false;
  const step3Unlocked = stepsState?.step3.unlocked ?? false;

  const step2Status: StepStatus = !step1Completed
    ? 'locked'
    : !step2Completed
      ? 'available'
      : step2Passed
        ? 'completed'
        : 'failed';

  const step3Status: StepStatus = !step3Unlocked
    ? 'locked'
    : step3Completed
      ? 'completed'
      : 'available';

  return (
    <>
      <h2 className="mb-1 text-lg font-semibold text-slate-900">{partTitle}</h2>
      <p className="mb-2 text-sm text-slate-600">
        O‘rganilgan so‘zlar (2-bosqich — test natijasi):{' '}
        <span className="font-semibold text-slate-900">
          {learnedWords} / {totalWords}
        </span>
      </p>
      <VocabularyProgressBar learned={learnedWords} total={totalWords} className="mb-6" />

      <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">Vazifalar</p>
        <div className="space-y-3">
          <StepCard
            title="1. Tanishish: bilaman / bilmayman"
            status={step1Completed ? 'completed' : 'available'}
            icon={<Layers className="h-5 w-5" strokeWidth={1.8} />}
            disabled={false}
            actionLabel={step1Completed ? 'Qayta o‘tish yoki davom' : 'Boshlash'}
            onClick={onOpenStep1}
            result={
              step1Completed ? (
                <div className="mt-2 flex flex-col gap-2">
                  <div
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold"
                    style={{ color: '#166534' }}
                  >
                    <span>🟢</span>
                    Biladi: {step1KnownDisplay}
                  </div>
                  <div
                    className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm font-semibold"
                    style={{ color: '#B91C1C' }}
                  >
                    <span>🔴</span>
                    Bilmaydi: {step1UnknownDisplay}
                  </div>
                </div>
              ) : null
            }
          />

          <StepCard
            title="2. Test"
            status={step2Status}
            icon={<ClipboardList className="h-5 w-5" strokeWidth={1.8} />}
            disabled={!step1Completed}
            actionLabel={
              !step1Completed
                ? 'Qulflangan'
                : step2Completed
                  ? step2Passed
                    ? 'Davom etish'
                    : 'Qayta urinish'
                  : 'Boshlash'
            }
            hint={!step1Completed || (step2Completed && !step2Passed) ? HINT_80 : undefined}
            onClick={onOpenStep2}
            result={
              step2Completed ? (
                <div className="mt-2 flex flex-col gap-2">
                  <div
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold"
                    style={{
                      borderColor: '#BBF7D0',
                      backgroundColor: '#F0FDF4',
                      color: '#166534',
                    }}
                  >
                    <span>🟢</span>
                    To‘g‘ri: {stepsState?.step2.correct ?? 0}
                  </div>
                  <div
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold"
                    style={{
                      borderColor: '#FECACA',
                      backgroundColor: '#FEF2F2',
                      color: '#B91C1C',
                    }}
                  >
                    <span>🔴</span>
                    Noto‘g‘ri: {stepsState?.step2.incorrect ?? 0}
                  </div>
                  <div
                    className="rounded-full border px-3 py-1 text-sm font-semibold"
                    style={{
                      borderColor: step2Passed ? '#BBF7D0' : '#FECACA',
                      backgroundColor: step2Passed ? '#F0FDF4' : '#FEF2F2',
                      color: step2Passed ? '#166534' : '#B91C1C',
                    }}
                  >
                    Foiz: {Math.round(stepsState?.step2.percentage ?? 0)}%
                  </div>
                </div>
              ) : null
            }
          />

          <StepCard
            title="3. Juftini topish"
            status={step3Status}
            icon={<Puzzle className="h-5 w-5" strokeWidth={1.8} />}
            disabled={!step3Unlocked}
            actionLabel={
              !step3Unlocked ? 'Qulflangan' : step3Completed ? 'Qayta o‘ynash' : 'Boshlash'
            }
            hint={!step3Unlocked ? HINT_80 : undefined}
            onClick={onOpenStep3}
            result={
              step3Completed ? (
                <p className="mt-2 text-sm font-medium text-emerald-800">
                  Bosqich tugallangan — barcha juftlar topildi.
                </p>
              ) : null
            }
          />
        </div>
      </div>
    </>
  );
}
