import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { Maximize2, Minimize2, Video } from 'lucide-react';

/**
 * Dars videosining joyi. Jitsi iframe'i shu komponent ichida doim BIR joyda turadi —
 * faqat o'lchami va o'rni o'zgaradi, aks holda qo'ng'iroq uzilib qayta ulanardi.
 *
 *  full — material yo'q: oddiy video qo'ng'iroq, butun ekran.
 *  side — kompyuter: material yonida ustun.
 *  pip  — telefon: tepada kichik oyna. Barmoq bilan suriladi (chetga yopishadi),
 *         bosilsa kattalashadi, «yig'ish» tugmasi bilan dumaloq belgiga aylanadi.
 */
export type DockMode = 'full' | 'side' | 'pip';

/** Tepada sarlavha, pastda asboblar paneli — oyna ularning ustiga chiqmaydi. */
const TOP_RESERVE = 64;
/** Boshlang'ich o'rin: doska sarlavhasi (va «Yopish» tugmasi) ostida, sahifaning o'ng burchagida. */
const START_TOP = 122;
/** Telefon yotiq: sarlavha yo'q, oyna tepadan boshlanishi mumkin. */
const isLandscapePhone = () => window.innerWidth > window.innerHeight && window.innerHeight < 600;
const BOTTOM_RESERVE = 92;
const EDGE = 10;

type Size = { w: number; h: number };

function pipSize(big: boolean, mini: boolean): Size {
  if (mini) return { w: 56, h: 56 };
  const landscape = window.innerWidth > window.innerHeight;
  const base = landscape ? { w: 176, h: 104 } : { w: 112, h: 156 };
  return big ? { w: Math.round(base.w * 1.7), h: Math.round(base.h * 1.7) } : base;
}

export default function VideoDock({ mode, children }: { mode: DockMode; children: ReactNode }) {
  const [mini, setMini] = useState(false);
  const [big, setBig] = useState(false);
  const [side, setSide] = useState<'left' | 'right'>('right');
  const [top, setTop] = useState(START_TOP);
  const [drag, setDragState] = useState<{ x: number; y: number } | null>(null);
  // Qo'yib yuborishda oxirgi o'rin kerak — tez siltashda holat (state) hali yangilanmagan bo'ladi.
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const setDrag = (d: { x: number; y: number } | null) => { dragRef.current = d; setDragState(d); };
  const [, setViewport] = useState(0);
  const start = useRef<{ px: number; py: number; x: number; y: number; moved: boolean } | null>(null);
  const pip = mode === 'pip';

  // Telefonni burganda (portret ↔ albom) oyna ekrandan chiqib ketmasin.
  useEffect(() => {
    if (!pip) return;
    const onResize = () => setViewport((n) => n + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [pip]);

  const size = pip ? pipSize(big, mini) : null;
  const clampTop = useCallback((y: number, h: number) => {
    const minTop = isLandscapePhone() ? EDGE + 52 : TOP_RESERVE;
    const safeBottom = window.innerHeight - h - (isLandscapePhone() ? 72 : BOTTOM_RESERVE);
    return Math.max(minTop, Math.min(y, Math.max(minTop, safeBottom)));
  }, []);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!size) return;
    // Barmoq allaqachon qo'yib yuborilgan bo'lsa brauzer xato beradi — surish baribir ishlaydi.
    try { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); } catch { /* yuqoriga qarang */ }
    const x = side === 'left' ? EDGE : window.innerWidth - size.w - EDGE;
    start.current = { px: e.clientX, py: e.clientY, x, y: clampTop(top, size.h), moved: false };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = start.current;
    if (!s || !size) return;
    const dx = e.clientX - s.px;
    const dy = e.clientY - s.py;
    if (!s.moved && Math.hypot(dx, dy) < 6) return;
    s.moved = true;
    setDrag({
      x: Math.max(EDGE, Math.min(window.innerWidth - size.w - EDGE, s.x + dx)),
      y: Math.max(TOP_RESERVE, Math.min(window.innerHeight - size.h - EDGE, s.y + dy)),
    });
  };
  const onPointerUp = () => {
    const s = start.current;
    start.current = null;
    if (!s || !size) return;
    if (!s.moved) {
      // Bosish: dumaloq belgi → oyna, oyna → katta oyna → oyna.
      if (mini) setMini(false);
      else setBig((b) => !b);
      return;
    }
    const last = dragRef.current;
    if (last) {
      setSide(last.x + size.w / 2 < window.innerWidth / 2 ? 'left' : 'right');
      setTop(clampTop(last.y, size.h));
    }
    setDrag(null);
  };

  let className = 'relative min-h-0 flex-1';
  let style: CSSProperties | undefined;
  if (mode === 'side') className = 'relative h-full w-[360px] shrink-0 overflow-hidden rounded-[20px] ring-1 ring-white/10';
  if (pip && size) {
    className = `fixed z-40 overflow-hidden bg-[#0C1526] shadow-[0_18px_44px_rgba(0,0,0,0.45)] ring-1 ring-white/15 ${
      drag ? '' : 'transition-[left,top,width,height,border-radius] duration-200 ease-out'
    } ${mini ? 'rounded-full' : 'rounded-[18px]'}`;
    style = {
      width: size.w,
      height: size.h,
      top: drag ? drag.y : clampTop(top, size.h),
      left: drag ? drag.x : side === 'left' ? EDGE : window.innerWidth - size.w - EDGE,
    };
  }

  return (
    <div className={className} style={style}>
      {children}
      {pip ? (
        <div
          className="absolute inset-0 z-10 touch-none select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => { start.current = null; setDrag(null); }}
          role="button"
          aria-label={mini ? 'Videoni ochish' : 'Videoni kattalashtirish yoki surish'}
        >
          {mini ? (
            <span className="flex h-full w-full items-center justify-center rounded-full bg-[#2563EB] text-white">
              <Video className="h-6 w-6" />
            </span>
          ) : (
            <span className="absolute right-1 top-1 flex gap-1">
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setBig((b) => !b)}
                aria-label={big ? 'Kichraytirish' : 'Kattalashtirish'}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur active:scale-95"
              >
                {big ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => { setMini(true); setBig(false); }}
                aria-label="Videoni yigʻish"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-[15px] font-black leading-none text-white backdrop-blur active:scale-95"
              >
                –
              </button>
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}
