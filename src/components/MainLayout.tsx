import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import AppNavBar from './AppNavBar';
import PWAInstallPrompt from './PWAInstallPrompt';
import { useSectionSwipeNavigation } from '../hooks/useSectionSwipeNavigation';

/** Routes where we hide the top nav bar (payment = fullscreen, vocabulary nested = back only, invite = has back button). */
function hideNavBar(path: string): boolean {
  if (path === '/payment' || path.startsWith('/payment')) return true;
  if (path === '/tariflar') return true;
  if (path === '/payment-history') return true;
  if (path === '/invite') return true;
  if (path.startsWith('/vocabulary/')) return true;
  return false;
}

/** Fixed top nav + content with padding so content is not under the bar. */
export default function MainLayout() {
  const { pathname } = useLocation();
  const showNavBar = !hideNavBar(pathname);
  const swipe = useSectionSwipeNavigation(showNavBar);

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
        <Outlet />
      </motion.div>
      {showNavBar && <PWAInstallPrompt />}
    </>
  );
}
