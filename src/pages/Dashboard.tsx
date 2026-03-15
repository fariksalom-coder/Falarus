import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ChevronRight, Lock } from 'lucide-react';
import {
  LESSONS,
  TOTAL_LESSONS,
  getLessonStatus,
  type LessonStatus,
} from '../data/lessonsList';
import { getLessonCompletionSummary } from '../utils/lessonTaskResults';
import { useAuth } from '../context/AuthContext';
import * as accessApi from '../api/access';
import PaywallModal from '../components/PaywallModal';

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
  const { token } = useAuth();
  const completedCount = useCompletedCount();
  const [lessonsLockMap, setLessonsLockMap] = useState<Record<number, boolean>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLockedLessonId, setSelectedLockedLessonId] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    accessApi.getLessons(token).then((list) => {
      const map: Record<number, boolean> = {};
      list.forEach((l) => { map[l.id] = l.locked; });
      setLessonsLockMap(map);
    }).catch(() => {});
  }, [token]);

  const isLessonLocked = (lessonId: number) => {
    if (lessonsLockMap[lessonId] !== undefined) return lessonsLockMap[lessonId];
    return lessonId > 3;
  };

  const handleLessonClick = (lesson: (typeof LESSONS)[number]) => {
    const locked = isLessonLocked(lesson.id);
    if (locked) {
      setSelectedLockedLessonId(lesson.id);
      setModalOpen(true);
    } else {
      navigate(lesson.path);
    }
  };

  const handleOpenPreview = () => {
    if (selectedLockedLessonId) {
      setModalOpen(false);
      navigate(`/preview/lesson/${selectedLockedLessonId}`);
      setSelectedLockedLessonId(null);
    }
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
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: TEXT }}>
            Rus tili kursi
          </h1>
        </div>

        {/* Learning path — lesson cards */}
        <div className="space-y-3">
          {LESSONS.map((lesson, index) => {
            const baseStatus = getLessonStatus(index, completedCount);
            const summary = getLessonCompletionSummary(lesson.path, lesson.exercisesTotal);
            const status: LessonStatus =
              summary.status === 'completed'
                ? 'completed'
                : summary.status === 'in_progress' && baseStatus === 'locked'
                  ? 'in_progress'
                  : baseStatus;
            const isLocked = isLessonLocked(lesson.id);

            return (
              <motion.button
                key={lesson.id}
                type="button"
                onClick={() => handleLessonClick(lesson)}
                className="group flex w-full items-center gap-4 rounded-2xl border bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                style={{
                  borderColor: BORDER,
                  backgroundColor: CARD_BG,
                  opacity: isLocked ? 0.9 : 1,
                }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                {/* Номер урока в кружке */}
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-semibold text-white relative"
                  style={{
                    backgroundColor: isLocked ? '#94A3B8' : PRIMARY,
                  }}
                >
                  {lesson.num}
                  {isLocked && (
                    <Lock className="absolute -top-0.5 -right-0.5 w-4 h-4 text-amber-500" strokeWidth={2.5} />
                  )}
                </div>

                {/* Иконка темы + название урока (без "X-dars") */}
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
                            ? '#DCFCE7' // green-100
                            : status === 'in_progress'
                              ? '#FFEDD5' // orange-100
                              : '#F1F5F9', // slate-100
                        color:
                          status === 'completed'
                            ? '#15803D' // green-700
                            : status === 'in_progress'
                              ? '#C05621' // orange-600
                              : TEXT_SECONDARY,
                      }}
                    >
                      {STATUS_LABEL[status]}
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ color: isLocked ? '#94A3B8' : PRIMARY }}
                >
                  <ChevronRight className="h-5 w-5" strokeWidth={2} />
                </div>
              </motion.button>
            );
          })}
        </div>
      </main>

      {modalOpen && (
        <PaywallModal
          onClose={() => { setModalOpen(false); setSelectedLockedLessonId(null); }}
          title="🔒 Bu dars faqat obuna bo'lganlar uchun"
          description="Barcha darslar, so'zlar va mashqlarga kirish uchun tarifni sotib oling. Rus tilini cheklovsiz o'rganing."
          buttonText="🚀 Barcha darslarni ochish"
          previewLabel={selectedLockedLessonId ? "Darsni ko'rish (preview)" : undefined}
          onPreview={selectedLockedLessonId ? () => { setModalOpen(false); navigate(`/preview/lesson/${selectedLockedLessonId}`); setSelectedLockedLessonId(null); } : undefined}
        />
      )}
    </div>
  );
}
