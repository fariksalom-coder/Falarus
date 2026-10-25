import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';

/**
 * Sahifani kattalashtirish — har kimda o'zi (o'quvchi va o'qituvchi alohida).
 *  - ikki barmoq bilan chimdish, ikki marta bosish (1× ↔ 2.5×), kompyuterda Ctrl + g'ildirak;
 *  - kattalashganda bir barmoq bilan surish;
 *  - 1× da tez gorizontal surish — sahifa almashtirish (`onSwipe`, faqat o'qituvchiga beriladi).
 * Sahifa yoki material almashganda (`resetKey`) asl holatga qaytadi.
 */
export const MAX_ZOOM = 4;
const DOUBLE_TAP_MS = 300;
const SWIPE_PX = 60;

type View = { s: number; x: number; y: number };
const IDENTITY: View = { s: 1, x: 0, y: 0 };

export function useZoomPan(resetKey: string, onSwipe?: (dir: 1 | -1) => void) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState<View>(IDENTITY);
  const viewRef = useRef(view);
  viewRef.current = view;
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ kind: 'pan' | 'pinch'; start: View; px: number; py: number; dist: number; t: number } | null>(null);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const [gesturing, setGesturing] = useState(false);

  useEffect(() => { setView(IDENTITY); }, [resetKey]);

  /** Kattalashganda sahifa ekrandan butunlay chiqib ketmasin. */
  const clamp = useCallback((v: View): View => {
    const el = boxRef.current;
    const s = Math.max(1, Math.min(MAX_ZOOM, v.s));
    if (!el || s === 1) return { s, x: 0, y: 0 };
    const maxX = ((s - 1) * el.clientWidth) / 2;
    const maxY = ((s - 1) * el.clientHeight) / 2;
    return { s, x: Math.max(-maxX, Math.min(maxX, v.x)), y: Math.max(-maxY, Math.min(maxY, v.y)) };
  }, []);

  /** (cx, cy) — konteyner markaziga nisbatan nuqta; shu nuqta barmoq ostida qoladi. */
  const zoomAt = useCallback((from: View, s: number, cx: number, cy: number): View => {
    const k = Math.max(1, Math.min(MAX_ZOOM, s)) / from.s;
    return clamp({ s: from.s * k, x: cx - (cx - from.x) * k, y: cy - (cy - from.y) * k });
  }, [clamp]);

  const local = (e: { clientX: number; clientY: number }) => {
    const r = boxRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 };
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!boxRef.current) return;
    try { boxRef.current.setPointerCapture?.(e.pointerId); } catch { /* barmoq allaqachon qo'yib yuborilgan */ }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    if (pts.length === 2) {
      const mid = local({ clientX: (pts[0].x + pts[1].x) / 2, clientY: (pts[0].y + pts[1].y) / 2 });
      gesture.current = { kind: 'pinch', start: viewRef.current, px: mid.x, py: mid.y, dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), t: Date.now() };
    } else if (pts.length === 1) {
      gesture.current = { kind: 'pan', start: viewRef.current, px: e.clientX, py: e.clientY, dist: 0, t: Date.now() };
    }
    setGesturing(true);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    const pts = [...pointers.current.values()];
    if (g.kind === 'pinch' && pts.length >= 2) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mid = local({ clientX: (pts[0].x + pts[1].x) / 2, clientY: (pts[0].y + pts[1].y) / 2 });
      const zoomed = zoomAt(g.start, g.start.s * (dist / Math.max(1, g.dist)), g.px, g.py);
      setView(clamp({ ...zoomed, x: zoomed.x + (mid.x - g.px), y: zoomed.y + (mid.y - g.py) }));
    } else if (g.kind === 'pan' && g.start.s > 1) {
      setView(clamp({ ...g.start, x: g.start.x + (e.clientX - g.px), y: g.start.y + (e.clientY - g.py) }));
    }
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size > 0) {
      // Chimdishdan bitta barmoq qoldi — surishga o'tamiz.
      const [p] = [...pointers.current.values()];
      gesture.current = { kind: 'pan', start: viewRef.current, px: p.x, py: p.y, dist: 0, t: Date.now() };
      return;
    }
    gesture.current = null;
    setGesturing(false);
    if (!g || g.kind !== 'pan') return;
    const dx = e.clientX - g.px;
    const dy = e.clientY - g.py;
    const quick = Date.now() - g.t < 500;
    if (g.start.s === 1 && onSwipe && quick && Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
      onSwipe(dx < 0 ? 1 : -1);
      return;
    }
    if (Math.hypot(dx, dy) < 8) {
      const now = Date.now();
      const tap = lastTap.current;
      if (tap && now - tap.t < DOUBLE_TAP_MS && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 30) {
        lastTap.current = null;
        const p = local(e);
        setView((v) => (v.s > 1 ? IDENTITY : zoomAt(v, 2.5, p.x, p.y)));
      } else {
        lastTap.current = { t: now, x: e.clientX, y: e.clientY };
      }
    }
  };

  const onWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey && viewRef.current.s === 1) return;
    const p = local(e);
    if (e.ctrlKey) setView((v) => zoomAt(v, v.s * Math.exp(-e.deltaY / 200), p.x, p.y));
    else setView((v) => clamp({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
  };

  // Ctrl + g'ildirak brauzerning o'zi sahifani kattalashtirmasin (React onWheel passiv).
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const stop = (e: WheelEvent) => { if (e.ctrlKey) e.preventDefault(); };
    el.addEventListener('wheel', stop, { passive: false });
    return () => el.removeEventListener('wheel', stop);
  }, []);

  return {
    boxRef,
    scale: view.s,
    gesturing,
    reset: () => setView(IDENTITY),
    transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.s})`,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onWheel },
  };
}
