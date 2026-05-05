import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { prefetchRoutePath } from '../routeModules';
import KunlikPlanFullSection from '../components/kunlik/KunlikPlanFullSection';
import PlatformTutorialStrip from '../components/home/PlatformTutorialStrip';

const BG = '#F8FAFC';
const TEXT = '#0F172A';

const QUICK_COURSES = [
  {
    href: '/kurslar/patent',
    label: 'Patent',
    ariaLabel: 'Patent imtihoni — tayyorlov kursi',
    className:
      'border-violet-200/90 bg-violet-50/90 text-violet-900 shadow-sm hover:bg-violet-100/90',
  },
  {
    href: '/kurslar/vnzh',
    label: 'ВНЖ',
    ariaLabel: 'ВНЖ imtihoni — tayyorlov kursi',
    className:
      'border-emerald-200/90 bg-emerald-50/90 text-emerald-900 shadow-sm hover:bg-emerald-100/90',
  },
] as const;

function HomeQuickCourseButtons({ className = '' }: { className?: string }) {
  const navigate = useNavigate();
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {QUICK_COURSES.map(({ href, label, ariaLabel, className: btnCls }, i) => (
        <motion.button
          key={href}
          type="button"
          aria-label={ariaLabel}
          onClick={() => navigate(href)}
          onMouseEnter={() => prefetchRoutePath(href)}
          onTouchStart={() => prefetchRoutePath(href)}
          onFocus={() => prefetchRoutePath(href)}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 + i * 0.05, ease: [0.32, 0.72, 0, 1] }}
          whileTap={{ scale: 0.97 }}
          className={`min-h-[44px] shrink-0 rounded-xl border px-2.5 py-2 text-center text-[12px] font-bold leading-tight transition-colors lg:min-h-[36px] lg:py-1.5 lg:text-[13px] ${btnCls}`}
        >
          {label}
        </motion.button>
      ))}
    </div>
  );
}

/** Yon bo‘shliq minimal (touch ~12px dan past emas mobil). */
const HOME_EDGE_PAD = 'px-3 sm:px-3.5 md:px-4 lg:px-4 xl:px-5 2xl:px-6';
/** Video qatoriga maxsus — yana biroz tor. */
const HOME_STRIP_PAD = 'px-2 sm:px-3 md:px-3 lg:px-3.5 xl:px-4 2xl:px-5';

/** Logo + video — viewport bo‘yi (main px yo‘q), ichkarida bir xil gorizontal indent. */
function HomeTopChrome() {
  return (
    <div
      className={
        'sticky top-0 z-30 mb-6 flex w-full min-w-0 flex-col border-b border-slate-200/55 bg-[#F8FAFC]/93 backdrop-blur-md ' +
        'pb-2 pt-2 sm:pt-3'
      }
    >
      <div className={`mb-3 flex min-w-0 items-center justify-between gap-3 ${HOME_EDGE_PAD}`}>
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
            style={{ color: TEXT, letterSpacing: '-0.02em' }}
          >
            Falarus
          </span>
        </div>
        <HomeQuickCourseButtons />
      </div>

      <div className={`min-w-0 ${HOME_STRIP_PAD}`}>
        <PlatformTutorialStrip />
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: BG }}>
      {/* Tor max-w yo‘q — yon bo‘shliq kam; rejani ichki max bilan cheklaymiz */}
      <main className="mx-auto flex w-full min-w-0 flex-col px-0 pt-0">
        <HomeTopChrome />

        <div className={`mx-auto w-full min-w-0 pb-1 ${HOME_EDGE_PAD}`}>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
            className="pb-1"
          >
            <KunlikPlanFullSection mode="embedded" />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
