import { useLayoutEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import AppNavBar from './AppNavBar';
import PWAInstallPrompt from './PWAInstallPrompt';
import { mainSectionIndex } from '../constants/mainSectionPaths';
import { appMainTopOffsetCss, appMainBottomOffsetCss } from '../constants/appLayout';

/** Routes where we hide the top nav bar (payment = fullscreen, vocabulary nested = back only, invite = has back button). */
function hideNavBar(path: string): boolean {
  if (path === '/vocabulary') return true;
  if (path === '/payment' || path.startsWith('/payment')) return true;
  if (path === '/tariflar') return true;
  if (path === '/payment-history') return true;
  if (path === '/invite') return true;
  if (path.startsWith('/vocabulary/')) return true;
  if (path.startsWith('/kurslar/patent')) return true;
  if (path.startsWith('/kurslar/vnzh')) return true;
  return false;
}

/** Sync enter/exit so panels pass side-by-side (Telegram-style); spring tuned for low overshoot. */
const springTab = { type: 'spring' as const, damping: 38, stiffness: 520, mass: 0.82 };
const fadeSoft = { duration: 0.18, ease: [0.32, 0.72, 0, 1] as const };

/** Forward (next tab): new from right, old exits left; backward: opposite. Nav stays fixed — only this block animates. */
export default function MainLayout() {
  const { pathname } = useLocation();
  const showNavBar = !hideNavBar(pathname);
  const reduceMotion = useReducedMotion();
  const sectionIdx = mainSectionIndex(pathname);
  const motionKey = sectionIdx >= 0 ? `section-${sectionIdx}` : pathname;

  const prevPathRef = useRef(pathname);
  const [tabDir, setTabDir] = useState(0);

  useLayoutEffect(() => {
    const prev = prevPathRef.current;
    const a = mainSectionIndex(prev);
    const b = mainSectionIndex(pathname);
    let d = 0;
    if (a >= 0 && b >= 0 && prev !== pathname) {
      d = b > a ? 1 : b < a ? -1 : 0;
    }
    setTabDir(d);
    prevPathRef.current = pathname;
  }, [pathname]);

  const variants = reduceMotion
    ? {
        enter: { opacity: 0 },
        center: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        enter: (dir: number) =>
          dir === 0
            ? { opacity: 0, y: 6, zIndex: 2 }
            : { x: dir > 0 ? '100%' : '-100%', zIndex: 2 },
        center: { x: 0, y: 0, opacity: 1, zIndex: 2 },
        exit: (dir: number) =>
          dir === 0
            ? { opacity: 0, y: -4, zIndex: 1 }
            : { x: dir > 0 ? '-100%' : '100%', zIndex: 1 },
      };

  const transition = reduceMotion ? fadeSoft : springTab;

  // On mobile (< sm): nav is at the bottom → paddingBottom.
  // On desktop (sm+): nav is at the top → paddingTop.
  // We inject a <style> tag with responsive CSS vars to avoid JS-based breakpoint detection.
  const topOffset = appMainTopOffsetCss();
  const bottomOffset = appMainBottomOffsetCss();

  return (
    <>
      {showNavBar && (
        <style>{`
          .nav-layout-pad {
            padding-top: calc(env(safe-area-inset-top, 0px) + 8px);
            padding-bottom: 0;
          }
          @media (min-width: 640px) {
            .nav-layout-pad {
              padding-top: ${topOffset};
              padding-bottom: 0;
            }
          }
          .nav-content-min-h {
            min-height: calc(100dvh - (env(safe-area-inset-top, 0px) + 8px));
          }
          @media (min-width: 640px) {
            .nav-content-min-h {
              min-height: calc(100dvh - ${topOffset});
            }
          }
          .nav-scroll-pad {
            padding-bottom: ${bottomOffset};
          }
          @media (min-width: 640px) {
            .nav-scroll-pad {
              padding-bottom: 0;
            }
          }
        `}</style>
      )}
      {showNavBar && <AppNavBar />}
      <div
        className={showNavBar ? 'min-h-screen nav-layout-pad' : 'min-h-screen'}
      >
        <div
          className={`relative w-full overflow-hidden${showNavBar ? ' nav-content-min-h' : ''}`}
          style={showNavBar ? undefined : { minHeight: '100dvh' }}
        >
          {/*
            mode="sync": old and new routes animate together (no white gap).
            Absolute inset-0: both layers overlap during the slide like Telegram folders.
          */}
          <AnimatePresence mode="sync" initial={false} custom={tabDir}>
            <motion.div
              key={motionKey}
              custom={tabDir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transition}
              className={`absolute inset-0 w-full overflow-y-auto overflow-x-hidden bg-[#F8FAFC] overscroll-y-contain${showNavBar ? ' nav-scroll-pad' : ''}`}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      {showNavBar && <PWAInstallPrompt />}
    </>
  );
}
