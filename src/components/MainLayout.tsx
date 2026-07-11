import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import AppNavBar from './AppNavBar';
import PWAInstallPrompt from './PWAInstallPrompt';
import { mainSectionIndex } from '../constants/mainSectionPaths';
import { appMainBottomOffsetCss } from '../constants/appLayout';
import { useAuth } from '../context/AuthContext';
import { useHeartbeat } from '../hooks/useHeartbeat';

/** Routes where we hide the global bottom nav — focus mode for lesson/exercise/game/course/payment drill-ins. */
function hideNavBar(path: string): boolean {
  if (path === '/payment' || path.startsWith('/payment')) return true;
  if (path === '/tariflar' || path === '/pricing') return true;
  if (path === '/payment-history') return true;
  if (path === '/invite') return true;
  if (path.startsWith('/kurslar/patent')) return true;
  if (path.startsWith('/kurslar/vnzh')) return true;
  if (path.startsWith('/kurslar/')) return true;
  if (path.startsWith('/help/')) return true;
  if (path.startsWith('/games/')) return true;
  // Kunlik reja: hide on any drilled-in lesson (grammar, lug'at, o'qish, gapirish).
  if (/^\/kunlik-reja\/kun\/\d+\/.+/.test(path)) return true;
  if (path === '/kunlik-reja/xarita') return true;
  if (path === '/games/word-swipe/xarita') return true;
  if (path.startsWith('/profile/')) return true;
  if (path.startsWith('/u/')) return true;
  if (path.startsWith('/teachers/')) return true;
  if (path.startsWith('/help/') || path === '/help') return true;
  if (path.startsWith('/huquqiy')) return true;
  return false;
}

const zoomTransition = { duration: 0.22, ease: [0.32, 0.72, 0, 1] as const };

export default function MainLayout() {
  const { pathname } = useLocation();
  const { token } = useAuth();
  useHeartbeat(token);
  const showNavBar = !hideNavBar(pathname);
  const reduceMotion = useReducedMotion();
  const sectionIdx = mainSectionIndex(pathname);
  const motionKey = sectionIdx >= 0 ? `section-${sectionIdx}` : pathname;

  const variants = reduceMotion
    ? {
        enter: { opacity: 0 },
        center: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        enter: { opacity: 0, scale: 0.985, zIndex: 2 },
        center: { opacity: 1, scale: 1, zIndex: 2 },
        exit: { opacity: 0, scale: 1.012, zIndex: 1 },
      };
  const transition = zoomTransition;

  // Nav har doim pastda → tepada faqat status zonasi, scroll uchun pastdan padding.
  const bottomOffset = appMainBottomOffsetCss();

  return (
    <>
      <style>{`
        .app-layout-safe-pad {
          padding-top: env(safe-area-inset-top, 0px);
          padding-bottom: 0;
        }
        .app-content-safe-min-h {
          min-height: calc(100dvh - env(safe-area-inset-top, 0px));
        }
        .nav-scroll-pad {
          padding-bottom: ${bottomOffset};
        }
      `}</style>
      {showNavBar && <AppNavBar />}
      <div
        className="min-h-screen app-layout-safe-pad"
      >
        <div
          className="relative w-full overflow-hidden app-content-safe-min-h"
        >
          {/*
            mode="sync": old/new routes animate together with subtle zoom.
            Absolute inset-0 keeps transitions smooth without layout jump.
          */}
          <AnimatePresence mode="sync" initial={false}>
            <motion.div
              key={motionKey}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transition}
              className={`absolute inset-0 w-full min-w-0 overflow-y-auto overflow-x-hidden bg-app-bg overscroll-y-contain${showNavBar ? ' nav-scroll-pad' : ''}`}
            >
              <div className="flex min-h-full flex-col">
                <div className="flex-1">
                  <Outlet />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      {showNavBar && <PWAInstallPrompt />}
    </>
  );
}
