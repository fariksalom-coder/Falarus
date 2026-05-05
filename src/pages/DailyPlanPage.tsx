import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { useSequentialLesson } from '../context/SequentialLessonContext';
import { useKunlikProgress } from '../hooks/useKunlikProgress';
import KunlikPlanFullSection from '../components/kunlik/KunlikPlanFullSection';

export default function DailyPlanPage() {
  const navigate = useNavigate();
  const { isReady } = useSequentialLesson();
  const { loaded: kunlikLoaded } = useKunlikProgress();

  const planBootstrapDone = isReady && kunlikLoaded;

  if (!planBootstrapDone) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#F8FAFC] px-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
        <p className="text-center text-sm font-medium text-slate-500">Reja yuklanmoqda…</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#F8FAFC] pb-28 sm:pb-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(37,99,235,0.08),transparent_55%),radial-gradient(ellipse_80%_50%_at_100%_50%,rgba(99,102,241,0.06),transparent)]"
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-blue-50/70 via-transparent to-slate-50/90"
        initial={false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
      />

      <header className="relative z-10 px-4 pb-1 pt-1 sm:pb-1.5 sm:pt-2">
        <div className="mx-auto max-w-lg">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200/80 transition-colors hover:bg-slate-50 hover:text-slate-800 active:scale-[0.97]"
            aria-label="Orqaga"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
      </header>

      <KunlikPlanFullSection mode="route" />
    </div>
  );
}
