import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { animate, useMotionValue } from 'motion/react';
import { MAIN_SECTION_PATHS } from '../constants/mainSectionPaths';
const MAX_VERTICAL_DRIFT = 84;
const MIN_SWIPE_DISTANCE = 72;
const MAX_SWIPE_DURATION_MS = 550;
const EXIT_DURATION_S = 0.26;
/** px/ms — quick flick still counts as navigation */
const MIN_FLICK_VELOCITY = 0.45;

type TouchState = {
  startX: number;
  startY: number;
  startAt: number;
  startedOnInteractive: boolean;
  lastX: number;
  lastAt: number;
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

function clampDrag(routeIndex: number, delta: number): number {
  const w = typeof window !== 'undefined' ? window.innerWidth : 400;
  const cap = Math.min(w * 0.42, 280);
  let v = Math.max(-cap, Math.min(cap, delta));
  const atStart = routeIndex === 0;
  const atEnd = routeIndex === MAIN_SECTION_PATHS.length - 1;
  if (atStart && v > 0) v *= 0.32;
  if (atEnd && v < 0) v *= 0.32;
  return v;
}

export function useSectionSwipeNavigation(active: boolean) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const x = useMotionValue(0);
  const touchStateRef = useRef<TouchState | null>(null);
  const animatingRef = useRef(false);
  const routeIndex = useMemo(
    () => MAIN_SECTION_PATHS.findIndex((path) => path === pathname),
    [pathname]
  );
  const swipeEnabled = useMobileSwipeEnabled(active && routeIndex >= 0);
  const canSwipe = swipeEnabled && routeIndex >= 0;

  useEffect(() => {
    x.set(0);
  }, [pathname, x]);

  const finishWithSpring = (to: number) => {
    animatingRef.current = true;
    void animate(x, to, {
      type: 'spring',
      stiffness: 420,
      damping: 32,
      mass: 0.85,
    }).then(() => {
      animatingRef.current = false;
    });
  };

  return {
    canSwipe,
    x,
    onTouchStart: (event: React.TouchEvent<HTMLElement>) => {
      if (!canSwipe || animatingRef.current || event.touches.length !== 1) {
        touchStateRef.current = null;
        return;
      }

      const touch = event.touches[0];
      touchStateRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startAt: Date.now(),
        startedOnInteractive: isInteractiveElement(event.target),
        lastX: touch.clientX,
        lastAt: Date.now(),
      };
    },
    onTouchMove: (event: React.TouchEvent<HTMLElement>) => {
      const state = touchStateRef.current;
      if (!canSwipe || animatingRef.current || state == null || event.touches.length !== 1) {
        return;
      }
      if (state.startedOnInteractive) return;

      const touch = event.touches[0];
      const deltaX = touch.clientX - state.startX;
      const deltaY = touch.clientY - state.startY;

      if (Math.abs(deltaY) > MAX_VERTICAL_DRIFT) {
        touchStateRef.current = null;
        finishWithSpring(0);
        return;
      }

      state.lastX = touch.clientX;
      state.lastAt = Date.now();
      x.set(clampDrag(routeIndex, deltaX));
    },
    onTouchEnd: (event: React.TouchEvent<HTMLElement>) => {
      const state = touchStateRef.current;
      touchStateRef.current = null;

      if (!canSwipe || animatingRef.current || state == null || state.startedOnInteractive) {
        return;
      }
      if (event.changedTouches.length !== 1) return;

      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - state.startX;
      const deltaY = touch.clientY - state.startY;
      const duration = Date.now() - state.startAt;
      const flickMs = Math.max(1, Date.now() - state.lastAt + 16);
      const flickVelocity = Math.abs(touch.clientX - state.lastX) / flickMs;

      if (duration > MAX_SWIPE_DURATION_MS && Math.abs(deltaX) < MIN_SWIPE_DISTANCE) {
        finishWithSpring(0);
        return;
      }
      if (Math.abs(deltaY) > MAX_VERTICAL_DRIFT) {
        finishWithSpring(0);
        return;
      }
      if (Math.abs(deltaX) < MIN_SWIPE_DISTANCE && flickVelocity < MIN_FLICK_VELOCITY) {
        finishWithSpring(0);
        return;
      }
      if (Math.abs(deltaX) <= Math.abs(deltaY) * 1.2) {
        finishWithSpring(0);
        return;
      }

      const nextIndex = deltaX < 0 ? routeIndex + 1 : routeIndex - 1;
      if (nextIndex < 0 || nextIndex >= MAIN_SECTION_PATHS.length) {
        finishWithSpring(0);
        return;
      }

      const w = typeof window !== 'undefined' ? window.innerWidth : 400;
      const exitTarget = deltaX < 0 ? -w : w;

      animatingRef.current = true;
      void animate(x, exitTarget, {
        duration: EXIT_DURATION_S,
        ease: [0.32, 0.72, 0, 1],
      }).then(() => {
        navigate(MAIN_SECTION_PATHS[nextIndex]);
        x.set(0);
        animatingRef.current = false;
      });
    },
    onTouchCancel: () => {
      touchStateRef.current = null;
      if (canSwipe && !animatingRef.current) finishWithSpring(0);
    },
  };
}
