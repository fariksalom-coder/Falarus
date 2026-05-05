import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Crown } from 'lucide-react';
import { useSequentialLesson } from '../context/SequentialLessonContext';
import { useKunlikProgress } from '../hooks/useKunlikProgress';
import KunlikPlanFullSection from '../components/kunlik/KunlikPlanFullSection';
import { prefetchRoutePath } from '../routeModules';
import PlatformTutorialStrip from '../components/home/PlatformTutorialStrip';

const QUICK_COURSES = [
  {
    href: '/kurslar/patent',
    label: 'Patent',
    ariaLabel: 'Patent imtihoni — tayyorlov kursi',
    className:
      'border-violet-200/90 bg-violet-50/90 text-violet-900 shadow-sm hover:bg-violet-100/90',
    icon: null,
  },
  {
    href: '/kurslar/vnzh',
    label: 'ВНЖ',
    ariaLabel: 'ВНЖ imtihoni — tayyorlov kursi',
    className:
      'border-emerald-200/90 bg-emerald-50/90 text-emerald-900 shadow-sm hover:bg-emerald-100/90',
    icon: null,
  },
  {
    href: '/tariflar',
    label: 'Premium',
    ariaLabel: 'Premium tariflar — bir oy yoki bir yil',
    className:
      'border-amber-300/90 bg-amber-100/95 text-amber-900 shadow-sm hover:bg-amber-200/95',
    icon: Crown,
  },
] as const;

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

      <header className="relative z-10 border-b border-slate-200/55 bg-[#F8FAFC]/93 px-4 pb-2 pt-2 backdrop-blur-md sm:pt-3">
        <div className="mx-auto max-w-lg">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <img
                src="/icons/icon-192.png"
                width={44}
                height={44}
                alt=""
                className="h-11 w-11 shrink-0 rounded-2xl object-cover shadow-[0_6px_20px_rgba(37,99,235,0.2)] ring-1 ring-slate-200/90"
                decoding="async"
              />
              <span
                className="text-[22px] font-bold tracking-tight lg:text-[24px]"
                style={{ color: '#0F172A', letterSpacing: '-0.02em' }}
              >
                Falarus
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {QUICK_COURSES.map(({ href, label, ariaLabel, className: btnCls, icon: Icon }) => (
                <button
                  key={href}
                  type="button"
                  aria-label={ariaLabel}
                  onClick={() => navigate(href)}
                  onMouseEnter={() => prefetchRoutePath(href)}
                  onTouchStart={() => prefetchRoutePath(href)}
                  onFocus={() => prefetchRoutePath(href)}
                  className={`min-h-[36px] shrink-0 rounded-xl border px-2.5 py-1.5 text-center text-[13px] font-bold leading-tight transition-colors ${btnCls}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {Icon ? <Icon className="h-3.5 w-3.5" strokeWidth={2.2} /> : null}
                    <span>{label}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mx-auto mt-3 max-w-lg">
          <PlatformTutorialStrip />
        </div>
      </header>

      <KunlikPlanFullSection mode="route" />
    </div>
  );
}
