import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock, Check, Play } from 'lucide-react';
import { LESSONS } from '../data/lessonsList';
import {
  getLessonAveragePercentFromResults,
  getLessonCompletionSummaryFromResults,
} from '../utils/lessonTaskResults';
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

type LessonCardState = 'completed' | 'current' | 'locked';

function getCardStateStyles(state: LessonCardState) {
  if (state === 'completed') {
    return {
      cardClassName:
        'border-[#D7E8DD] bg-white text-slate-900 shadow-[0_14px_40px_rgba(15,23,42,0.06)]',
      iconWrapClassName: 'bg-[#29B35D] text-white shadow-[0_12px_24px_rgba(41,179,93,0.25)]',
      pillClassName: 'bg-[#E7F5EB] text-[#22A552]',
      subtitleClassName: 'text-[#7B7B98]',
      metaClassName: 'text-[#22A552]',
    };
  }

  if (state === 'current') {
    return {
      cardClassName:
        'border-transparent bg-[linear-gradient(135deg,#6E2DE2_0%,#7C3AED_45%,#5B21B6_100%)] text-white shadow-[0_18px_44px_rgba(91,33,182,0.28)]',
      iconWrapClassName: 'bg-white/18 text-white backdrop-blur-sm',
      pillClassName: 'bg-white/16 text-white/95',
      subtitleClassName: 'text-white/75',
      metaClassName: 'text-white/85',
    };
  }

  return {
    cardClassName:
      'border-[#E8EAF4] bg-white/65 text-slate-400 shadow-[0_10px_28px_rgba(148,163,184,0.08)] backdrop-blur-[1px]',
    iconWrapClassName: 'bg-[#F3F4FA] text-slate-400',
    pillClassName: 'bg-white/70 text-slate-400',
    subtitleClassName: 'text-slate-400/85',
    metaClassName: 'text-slate-400/85',
  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { lessonStates, results, isReady: seqReady } = useSequentialLesson();
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
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-5 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-[2rem]" style={{ color: TEXT }}>
            Darslar
          </h1>
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
          <div className="space-y-3.5 sm:space-y-4">
            {LESSONS.map((lesson) => {
              const seq = lessonStates.find((s) => s.lessonPath === lesson.path);
              const lockedBySub = isLessonLockedBySubscription(lesson.id);
              const lockedBySeq = seq != null && !seq.isUnlocked;
              const isLocked = lockedBySub || lockedBySeq;
              const lessonResults = results[lesson.path] ?? {};
              const summary = getLessonCompletionSummaryFromResults(lessonResults, lesson.exercisesTotal);
              const averagePercent = getLessonAveragePercentFromResults(lessonResults, lesson.exercisesTotal);

              let state: LessonCardState = 'locked';
              if (!isLocked && seq?.isCompleted) {
                state = 'completed';
              } else if (!isLocked && seq?.isUnlocked) {
                state = 'current';
              }

              const styles = getCardStateStyles(state);
              const canInteract = !lockedBySeq;
              const title = lesson.titleUz ?? lesson.title;
              const subtitle = lesson.titleRu ?? lesson.title;
              const footerText =
                state === 'completed'
                  ? ''
                  : state === 'current'
                    ? averagePercent != null
                      ? `${summary.passedTasks}/${lesson.exercisesTotal} topshiriq bajarildi`
                      : `1-bosqichdan davom eting`
                    : lockedBySub
                      ? 'Tarif orqali ochiladi'
                      : 'Oldingi dars tugagach ochiladi';

              return (
                <motion.button
                  key={lesson.id}
                  type="button"
                  onClick={() => handleLessonClick(lesson)}
                  disabled={lockedBySeq}
                  className={`group flex w-full items-center gap-3 rounded-[28px] border px-4 py-4 text-left transition-all duration-200 sm:gap-5 sm:px-6 sm:py-5 ${styles.cardClassName} ${
                    canInteract ? 'hover:-translate-y-0.5' : 'cursor-not-allowed'
                  }`}
                  style={{ borderColor: state === 'current' ? 'transparent' : BORDER, backgroundColor: state === 'current' ? undefined : CARD_BG }}
                  whileHover={canInteract ? { scale: 1.005 } : undefined}
                  whileTap={canInteract ? { scale: 0.995 } : undefined}
                >
                  <div
                    className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] ${styles.iconWrapClassName} sm:h-20 sm:w-20`}
                  >
                    {state === 'completed' ? (
                      <Check className="h-8 w-8 sm:h-10 sm:w-10" strokeWidth={2.7} />
                    ) : state === 'current' ? (
                      <Play className="ml-0.5 h-7 w-7 fill-current sm:h-9 sm:w-9" strokeWidth={2.4} />
                    ) : (
                      <Lock className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={2.2} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-[1.05rem] font-bold leading-tight sm:text-[1.2rem] ${
                        state === 'locked' ? 'text-slate-400' : ''
                      }`}
                      style={{ color: state === 'current' ? '#FFFFFF' : state === 'locked' ? '#9CA3AF' : TEXT }}
                    >
                      {lesson.num}. {title}
                    </p>
                    <p className={`mt-1 truncate text-sm sm:text-base ${styles.subtitleClassName}`}>{subtitle}</p>
                    {footerText ? (
                      <p className={`mt-3 text-xs font-medium sm:text-sm ${styles.metaClassName}`}>{footerText}</p>
                    ) : null}
                  </div>

                  {averagePercent != null && state !== 'locked' ? (
                    <div
                      className={`shrink-0 rounded-full px-3 py-2 text-sm font-bold sm:px-4 sm:text-[1.05rem] ${styles.pillClassName}`}
                    >
                      {averagePercent}%
                    </div>
                  ) : null}
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
