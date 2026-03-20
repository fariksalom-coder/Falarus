import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ChevronRight, Lock, Check } from 'lucide-react';
import { LESSONS, type LessonStatus } from '../data/lessonsList';
import { getLessonCompletionSummary } from '../utils/lessonTaskResults';
import { useAuth } from '../context/AuthContext';
import { useSequentialLesson } from '../context/SequentialLessonContext';
import { useLessonsSubscriptionLock } from '../hooks/useLessonsSubscriptionLock';
import PaywallModal from '../components/PaywallModal';
import PendingPaymentModal from '../components/PendingPaymentModal';
import { usePaymentStatus } from '../hooks/usePaymentStatus';

const BG = '#F8FAFC';
const CARD_BG = '#FFFFFF';
const PRIMARY = '#6366F1';
const BORDER = '#E2E8F0';
const TEXT = '#0F172A';
const TEXT_SECONDARY = '#64748B';

const STATUS_LABEL: Record<LessonStatus, string> = {
  completed: 'Tugallangan',
  in_progress: 'Jarayonda',
  locked: 'Boshlanmagan',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { lessonStates, isReady: seqReady } = useSequentialLesson();
  const { isLessonLockedBySubscription, loaded: subLoaded } = useLessonsSubscriptionLock();
  const [modalOpen, setModalOpen] = useState(false);
  const { hasPendingPayment } = usePaymentStatus();

  const dataReady = !token || (seqReady && subLoaded);

  const handleLessonClick = (lesson: (typeof LESSONS)[number]) => {
    const seq = lessonStates.find((s) => s.lessonPath === lesson.path);
    const lockedBySub = isLessonLockedBySubscription(lesson.id);
    const lockedBySeq = seq != null && !seq.isUnlocked;

    if (lockedBySub) {
      setModalOpen(true);
      return;
    }
    if (lockedBySeq) {
      return;
    }
    navigate(lesson.path);
  };

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: BG,
        backgroundImage: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
      }}
    >
      <main className="mx-auto max-w-[720px] px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: TEXT }}>
            Rus tili kursi
          </h1>
          <p className="mt-4 text-sm text-slate-600">
            Darslar ketma-ket ochiladi: har bir topshiriqda kamida 70% to‘g‘ri javob kerak. Keyingi bosqich ochilishi uchun avval
            joriy darsni tugating.
          </p>
        </div>

        {token && !dataReady && (
          <div className="flex items-center justify-center py-16">
            <div
              className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"
              aria-hidden
            />
          </div>
        )}
        {(!token || dataReady) && (
          <div className="space-y-3">
            {LESSONS.map((lesson) => {
              const seq = lessonStates.find((s) => s.lessonPath === lesson.path);
              const lockedBySub = isLessonLockedBySubscription(lesson.id);
              const lockedBySeq = seq != null && !seq.isUnlocked;
              const isLocked = lockedBySub || lockedBySeq;
              const summary = getLessonCompletionSummary(lesson.path, lesson.exercisesTotal);

              let status: LessonStatus = 'locked';
              if (!isLocked && seq) {
                if (seq.isCompleted) status = 'completed';
                else if (seq.isUnlocked) {
                  status = summary.status === 'completed' ? 'completed' : 'in_progress';
                }
              }

              return (
                <motion.button
                  key={lesson.id}
                  type="button"
                  onClick={() => handleLessonClick(lesson)}
                  disabled={isLocked}
                  className="group flex w-full items-center gap-4 rounded-2xl border bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-60"
                  style={{
                    borderColor: BORDER,
                    backgroundColor: CARD_BG,
                  }}
                  whileHover={!isLocked ? { scale: 1.01 } : undefined}
                  whileTap={!isLocked ? { scale: 0.99 } : undefined}
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-semibold text-white"
                    style={{
                      backgroundColor: isLocked ? '#94A3B8' : status === 'completed' ? '#22C55E' : PRIMARY,
                    }}
                  >
                    {status === 'completed' && !isLocked ? (
                      <Check className="h-5 w-5 text-white" strokeWidth={2.5} />
                    ) : (
                      lesson.num
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold" style={{ color: TEXT }}>
                      {lesson.title}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-sm" style={{ color: TEXT_SECONDARY }}>
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor:
                            status === 'completed'
                              ? '#DCFCE7'
                              : status === 'in_progress'
                                ? '#FFEDD5'
                                : '#F1F5F9',
                          color:
                            status === 'completed'
                              ? '#15803D'
                              : status === 'in_progress'
                                ? '#C05621'
                                : TEXT_SECONDARY,
                        }}
                      >
                        {STATUS_LABEL[status]}
                      </span>
                    </div>
                  </div>

                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                    style={{ color: isLocked ? '#94A3B8' : PRIMARY }}
                  >
                    {isLocked ? (
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 ring-2 ring-amber-200"
                        title="Qulflangan"
                      >
                        <Lock className="h-5 w-5 text-amber-600" strokeWidth={2.5} />
                      </span>
                    ) : (
                      <ChevronRight className="h-5 w-5" strokeWidth={2} />
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </main>

      {modalOpen && hasPendingPayment && (
        <PendingPaymentModal onClose={() => setModalOpen(false)} />
      )}
      {modalOpen && !hasPendingPayment && <PaywallModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}
