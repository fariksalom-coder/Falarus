import { useLayoutEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import AppNavBar from './AppNavBar';
import PWAInstallPrompt from './PWAInstallPrompt';
import { useSectionSwipeNavigation } from '../hooks/useSectionSwipeNavigation';
import { mainSectionIndex } from '../constants/mainSectionPaths';

/** Routes where we hide the top nav bar (payment = fullscreen, vocabulary nested = back only, invite = has back button). */
function hideNavBar(path: string): boolean {
  if (path === '/payment' || path.startsWith('/payment')) return true;
  if (path === '/tariflar') return true;
  if (path === '/payment-history') return true;
  if (path === '/invite') return true;
  if (path.startsWith('/vocabulary/')) return true;
  return false;
}

const springTab = { type: 'spring' as const, damping: 34, stiffness: 440, mass: 0.88 };
const fadeSoft = { duration: 0.2, ease: [0.32, 0.72, 0, 1] as const };

/** Forward (next tab): new screen from right; backward: from left — similar to Telegram folder / chat list. */
export default function MainLayout() {
  const { pathname } = useLocation();
  const showNavBar = !hideNavBar(pathname);
  const swipe = useSectionSwipeNavigation(showNavBar);
  const reduceMotion = useReducedMotion();

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
            ? { opacity: 0, y: 5 }
            : { x: dir > 0 ? '26%' : '-26%', opacity: 0.96 },
        center: { x: 0, y: 0, opacity: 1 },
        exit: (dir: number) =>
          dir === 0
            ? { opacity: 0, y: -4 }
            : { x: dir > 0 ? '-20%' : '20%', opacity: 0.96 },
      };

  const transition = reduceMotion ? fadeSoft : springTab;

  return (
    <>
      {showNavBar && <AppNavBar />}
      <motion.div
        className={
          showNavBar
            ? `min-h-screen pt-[78px]${swipe.canSwipe ? ' will-change-transform' : ''}`
            : 'min-h-screen'
        }
        style={
          swipe.canSwipe
            ? { x: swipe.x, touchAction: 'pan-y pinch-zoom' }
            : undefined
        }
        onTouchStart={swipe.onTouchStart}
        onTouchMove={swipe.onTouchMove}
        onTouchEnd={swipe.onTouchEnd}
        onTouchCancel={swipe.onTouchCancel}
      >
        <div className="relative min-h-0 overflow-x-hidden">
          <AnimatePresence mode="wait" initial={false} custom={tabDir}>
            <motion.div
              key={pathname}
              custom={tabDir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transition}
              className="min-h-screen"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
      {showNavBar && <PWAInstallPrompt />}
    </>
  );
}
