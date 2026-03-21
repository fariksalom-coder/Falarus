import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const SWIPE_SECTION_PATHS = ['/', '/vocabulary', '/statistika', '/reyting', '/profile'] as const;
const MAX_VERTICAL_DRIFT = 84;
const MIN_SWIPE_DISTANCE = 72;
const MAX_SWIPE_DURATION_MS = 550;

type TouchState = {
  startX: number;
  startY: number;
  startAt: number;
  startedOnInteractive: boolean;
};

function isInteractiveElement(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return target.closest(
    'a, button, input, textarea, select, label, summary, [role="button"], [data-no-section-swipe]'
  ) != null;
}

function useMobileSwipeEnabled(active: boolean): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!active || typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      setEnabled(false);
      return;
    }

    const media = window.matchMedia('(max-width: 768px) and (pointer: coarse)');
    const update = () => setEnabled(media.matches);
    update();

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, [active]);

  return enabled;
}

export function useSectionSwipeNavigation(active: boolean) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const touchStateRef = useRef<TouchState | null>(null);
  const routeIndex = useMemo(
    () => SWIPE_SECTION_PATHS.findIndex((path) => path === pathname),
    [pathname]
  );
  const swipeEnabled = useMobileSwipeEnabled(active && routeIndex >= 0);

  const canSwipe = swipeEnabled && routeIndex >= 0;

  return {
    canSwipe,
    onTouchStart: (event: React.TouchEvent<HTMLElement>) => {
      if (!canSwipe || event.touches.length !== 1) {
        touchStateRef.current = null;
        return;
      }

      const touch = event.touches[0];
      touchStateRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startAt: Date.now(),
        startedOnInteractive: isInteractiveElement(event.target),
      };
    },
    onTouchEnd: (event: React.TouchEvent<HTMLElement>) => {
      const state = touchStateRef.current;
      touchStateRef.current = null;

      if (!canSwipe || state == null || state.startedOnInteractive || event.changedTouches.length !== 1) {
        return;
      }

      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - state.startX;
      const deltaY = touch.clientY - state.startY;
      const duration = Date.now() - state.startAt;

      if (duration > MAX_SWIPE_DURATION_MS) return;
      if (Math.abs(deltaX) < MIN_SWIPE_DISTANCE) return;
      if (Math.abs(deltaY) > MAX_VERTICAL_DRIFT) return;
      if (Math.abs(deltaX) <= Math.abs(deltaY) * 1.2) return;

      const nextIndex = deltaX < 0 ? routeIndex + 1 : routeIndex - 1;
      if (nextIndex < 0 || nextIndex >= SWIPE_SECTION_PATHS.length) return;

      navigate(SWIPE_SECTION_PATHS[nextIndex]);
    },
  };
}
