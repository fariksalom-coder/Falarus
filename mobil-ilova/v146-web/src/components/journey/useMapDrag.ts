import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

/** Each gesture changes one ten-day map, without scrolling the document. */
export function useMapDrag(viewport: RefObject<HTMLDivElement | null>, count = 19) {
  const [page, setPage] = useState(0);
  const current = useRef(0);
  const moveTo = useCallback((next: number) => {
    const bounded = Math.max(0, Math.min(count - 1, next));
    current.current = bounded;
    setPage(bounded);
    if (viewport.current) viewport.current.scrollTop = 0;
  }, [count, viewport]);
  useEffect(() => {
    const view = viewport.current;
    if (!view) return;
    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = document.documentElement.style.overflow = 'hidden';
    let pointer: number | null = null, startY = 0, delta = 0, dragged = false;
    let wheelTotal = 0, lastWheel = 0, lastChange = 0, wheelConsumed = false;
    let scrollCard: HTMLElement | null = null, cardStart = 0;
    let clearClick: ReturnType<typeof setTimeout> | undefined;
    const change = (direction: number) => {
      if (Date.now() - lastChange < 520) return;
      lastChange = Date.now();
      moveTo(current.current + direction);
    };
    const wheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;
      e.preventDefault();
      const card = (e.target as HTMLElement).closest<HTMLElement>('.fantasy-lesson-card');
      if (card && card.scrollHeight > card.clientHeight + 1) { card.scrollTop += e.deltaY; return; }
      const now = Date.now();
      if (now - lastWheel > 180) { wheelTotal = 0; wheelConsumed = false; }
      lastWheel = now;
      if (wheelConsumed) return;
      wheelTotal += e.deltaY * (e.deltaMode === 1 ? 18 : e.deltaMode === 2 ? view.clientHeight : 1);
      if (Math.abs(wheelTotal) >= 45) { change(Math.sign(wheelTotal)); wheelTotal = 0; wheelConsumed = true; }
    };
    const down = (e: PointerEvent) => {
      if (!e.isPrimary || e.button !== 0) return;
      clearTimeout(clearClick);
      const card = (e.target as HTMLElement).closest<HTMLElement>('.fantasy-lesson-card');
      scrollCard = card && card.scrollHeight > card.clientHeight + 1 ? card : null;
      cardStart = scrollCard?.scrollTop ?? 0;
      pointer = e.pointerId; startY = e.clientY; delta = 0; dragged = false;
    };
    const move = (e: PointerEvent) => {
      if (pointer !== e.pointerId) return;
      delta = startY - e.clientY;
      if (Math.abs(delta) < 8) return;
      dragged = true;
      view.setPointerCapture(e.pointerId);
      e.preventDefault();
      if (scrollCard) scrollCard.scrollTop = cardStart + delta;
    };
    const up = (e: PointerEvent) => {
      if (pointer !== e.pointerId) return;
      pointer = null;
      if (view.hasPointerCapture(e.pointerId)) view.releasePointerCapture(e.pointerId);
      if (!scrollCard && e.type !== 'pointercancel' && Math.abs(delta) >= 45) change(Math.sign(delta));
      clearClick = setTimeout(() => { dragged = false; }, 0);
    };
    const click = (e: MouseEvent) => { if (dragged) { e.preventDefault(); e.stopPropagation(); } };
    const key = (e: KeyboardEvent) => {
      if (['ArrowDown', 'PageDown', 'ArrowUp', 'PageUp', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
        if (e.key === 'Home') moveTo(0);
        else if (e.key === 'End') moveTo(count - 1);
        else change(e.key === 'ArrowDown' || e.key === 'PageDown' ? 1 : -1);
      }
    };
    const resize = new ResizeObserver(() => {
      view.parentElement?.style.setProperty('--map-height', `${view.clientHeight}px`);
      view.scrollTop = 0;
    });
    resize.observe(view);
    view.addEventListener('wheel', wheel, { passive: false });
    view.addEventListener('pointerdown', down);
    view.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    view.addEventListener('pointercancel', up);
    view.addEventListener('click', click, true);
    view.addEventListener('keydown', key);
    return () => {
      clearTimeout(clearClick); resize.disconnect();
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
      view.removeEventListener('wheel', wheel);
      view.removeEventListener('pointerdown', down);
      view.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      view.removeEventListener('pointercancel', up);
      view.removeEventListener('click', click, true);
      view.removeEventListener('keydown', key);
    };
  }, [viewport, moveTo, count]);
  return { page, moveTo };
}
