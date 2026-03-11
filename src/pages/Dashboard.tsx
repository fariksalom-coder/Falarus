import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ChevronRight,
} from 'lucide-react';
import {
  LESSONS,
  TOTAL_LESSONS,
  getLessonStatus,
  getLessonExercisesDone,
  type LessonStatus,
} from '../data/lessonsList';

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

/** Completed lessons count: from localStorage for now; can be replaced with API. */
function useCompletedCount(): number {
  try {
    const raw = localStorage.getItem('lessons-completed-count');
    if (raw != null) {
      const n = parseInt(raw, 10);
      if (!Number.isNaN(n) && n >= 0) return Math.min(n, TOTAL_LESSONS);
    }
  } catch {
    // ignore
  }
  return 0;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const completedCount = useCompletedCount();

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: BG,
        backgroundImage: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
      }}
    >
      <main className="mx-auto max-w-[720px] px-4 py-8">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: TEXT }}>
            Rus tili kursi
          </h1>
        </div>

        {/* Learning path — lesson cards */}
        <div className="space-y-3">
          {LESSONS.map((lesson, index) => {
            const status = getLessonStatus(index, completedCount);
            const exercisesDone = getLessonExercisesDone(status, lesson.exercisesTotal);
            const isLocked = false;

            return (
              <motion.button
                key={lesson.id}
                type="button"
                disabled={isLocked}
                onClick={() => !isLocked && navigate(lesson.path)}
                className="group flex w-full items-center gap-4 rounded-2xl border bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                style={{
                  borderColor: BORDER,
                  backgroundColor: CARD_BG,
                }}
                whileHover={!isLocked ? { scale: 1.01 } : undefined}
                whileTap={!isLocked ? { scale: 0.99 } : undefined}
              >
                {/* Номер урока в кружке */}
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-semibold text-white"
                  style={{
                    backgroundColor:
                      status === 'completed' ? '#22C55E' : status === 'in_progress' ? PRIMARY : '#94A3B8',
                  }}
                >
                  {lesson.num}
                </div>

                {/* Иконка темы + название урока (без "X-dars") */}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold" style={{ color: TEXT }}>
                    {lesson.title}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-sm" style={{ color: TEXT_SECONDARY }}>
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: '#F1F5F9', color: TEXT_SECONDARY }}>
                      {STATUS_LABEL[status]}
                    </span>
                    <span>
                      {exercisesDone} / {lesson.exercisesTotal} mashq bajarildi
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                {!isLocked && (
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors group-hover:bg-indigo-50"
                    style={{ color: '#94A3B8' }}
                  >
                    <ChevronRight className="h-5 w-5 group-hover:opacity-100" style={{ color: PRIMARY }} strokeWidth={2} />
                  </div>
                )}
                {isLocked && (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-300">
                    <ChevronRight className="h-5 w-5" strokeWidth={2} />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
