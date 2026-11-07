import { memo, useEffect, useState, type MutableRefObject, type RefObject } from 'react';
import type { Stroke } from '../../../shared/lessonRoom';
import { INK_W, strokePath } from './ink';

/**
 * Sahifa ustidagi qatlam: saqlangan chizmalar, hozir chizilayotgan chiziqlar (o'ziniki va
 * boshqaniki) va lazer izi. Sahifa bilan birga kattalashadi — koordinatalar 0..1.
 * O'zi bosishni ushlamaydi (pointer-events yo'q): chizish `useZoomPan` orqali keladi.
 */

export type LiveStroke = Pick<Stroke, 'id' | 'tool' | 'color' | 'size' | 'pts'>;
/** `gap` — oldingi nuqtaga chiziq tortilmaydi (barmoq ko'tarilib, qayta qo'yilgan). */
export type LaserPoint = { x: number; y: number; t: number; gap?: boolean };

/** Lazer izi ~1 soniyada so'nadi. */
export const LASER_FADE_MS = 1000;

/** Lazer izi: nuqtalar shu yerda, chizuvchi qatlam yangi nuqta kelganda uyg'otiladi. */
export class LaserTrail {
  points: LaserPoint[] = [];
  private listeners = new Set<() => void>();
  private breakNext = true;
  push(x: number, y: number) {
    this.points.push({ x, y, t: performance.now(), gap: this.breakNext });
    this.breakNext = false;
    if (this.points.length > 120) this.points.splice(0, this.points.length - 120);
    this.listeners.forEach((fn) => fn());
  }
  /** Uzilish: iz o'z-o'zidan so'nadi, yangi nuqta oldingisiga ulanmaydi. */
  end() {
    this.breakNext = true;
  }
  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }
}

const StrokeShape = memo(function StrokeShape({ s, ratio, done }: { s: LiveStroke & { text?: string }; ratio: number; done: boolean }) {
  if (s.tool === 'text') {
    const h = INK_W / ratio;
    return (
      <text
        x={s.pts[0] * INK_W}
        y={s.pts[1] * h}
        fontSize={s.size}
        fontWeight={700}
        fill={s.color}
        dominantBaseline="hanging"
        stroke="#ffffff"
        strokeWidth={s.size * 0.12}
        paintOrder="stroke"
        style={{ fontFamily: 'Manrope, system-ui, sans-serif' }}
      >
        {s.text}
      </text>
    );
  }
  return (
    <path
      d={strokePath(s, ratio, done)}
      fill={s.color}
      opacity={s.tool === 'marker' ? 0.38 : 1}
      style={s.tool === 'marker' ? { mixBlendMode: 'multiply' } : undefined}
    />
  );
});

/** Doskada to'g'ridan-to'g'ri matn yozish (matn asbobi tanlanganda). */
export type TextEditor = {
  /** Yozilayotgan joy (0..1); null — maydon tayyor, lekin yashirin. */
  at: { x: number; y: number } | null;
  value: string;
  color: string;
  /** Matn o'lchami — sahifa enining mingdan bir ulushida (doskadagi matn bilan bir xil). */
  size: number;
  inputRef: RefObject<HTMLInputElement | null>;
  onChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
};

export function InkLayer({ ratio, strokes, live, laser, rootRef, editor }: {
  ratio: number;
  strokes: Stroke[];
  /** Chizilayotgan chiziqlar (barmoq hali ko'tarilmagan). */
  live: LiveStroke[];
  laser: LaserTrail;
  rootRef: MutableRefObject<HTMLDivElement | null>;
  editor?: TextEditor | null;
}) {
  const h = INK_W / ratio;
  // Sahifaning haqiqiy eni — yozilayotgan matn doskadagi tayyor matn bilan bir xil o'lchamda chiqsin.
  const [pageW, setPageW] = useState(0);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setPageW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [rootRef]);
  // Marker matn ostida qolsin: avval markerlar, keyin pero va matn.
  const ordered = [...strokes.filter((s) => s.tool === 'marker'), ...strokes.filter((s) => s.tool !== 'marker')];
  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0">
      <svg viewBox={`0 0 ${INK_W} ${h}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
        {ordered.map((s) => <StrokeShape key={s.id} s={s} ratio={ratio} done />)}
        {live.map((s) => <StrokeShape key={`live-${s.id}`} s={s} ratio={ratio} done={false} />)}
      </svg>
      <LaserLayer trail={laser} ratio={ratio} />
      {editor ? <InlineTextEditor editor={editor} pageW={pageW} /> : null}
    </div>
  );
}

/**
 * Yozilayotgan matn bosilgan joyning o'zida, tayyor matn ko'rinishida chiqadi.
 * Ko'rinadigan qism — oddiy matn (eni shu matnga moslashadi), ustida shaffof maydon
 * (kursor va klaviatura). Enter yoki boshqa joyga bosish — matn doskaga qo'yiladi.
 */
function InlineTextEditor({ editor, pageW }: { editor: TextEditor; pageW: number }) {
  const { at, value, color, size, inputRef, onChange, onCommit, onCancel } = editor;
  const fontPx = Math.max(12, (size * pageW) / INK_W);
  const textStyle = {
    fontSize: fontPx,
    lineHeight: 1.15,
    fontWeight: 700,
    fontFamily: 'Manrope, system-ui, sans-serif',
  } as const;
  return (
    <div
      className="pointer-events-auto absolute"
      style={at ? { left: `${at.x * 100}%`, top: `${at.y * 100}%` } : { left: -9999, top: 0, opacity: 0 }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="relative -m-1 rounded-[6px] p-1"
        style={{ outline: `2px dashed ${color}`, outlineOffset: 1, background: 'rgba(255,255,255,0.55)' }}
      >
        <span
          aria-hidden="true"
          className="block whitespace-pre"
          style={{ ...textStyle, color: value ? color : `${color}66`, minWidth: fontPx * 1.2 }}
        >
          {value || 'Yozing…'}
        </span>
        <input
          ref={inputRef}
          value={value}
          maxLength={200}
          enterKeyHint="done"
          autoCapitalize="sentences"
          aria-label="Doskaga matn"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
            else if (e.key === 'Escape') { onCancel(); e.currentTarget.blur(); }
          }}
          onBlur={onCommit}
          className="absolute inset-0 h-full w-full bg-transparent p-1 outline-none"
          style={{ ...textStyle, color: 'transparent', caretColor: color }}
        />
      </div>
    </div>
  );
}

/**
 * Lazer: qizil nuqta va so'nayotgan iz. Nuqtalar React holatida emas (har harakatda butun
 * doska qayta chizilmasin); kadrlar faqat iz ko'rinib turgan paytda aylanadi — batareya tejaladi.
 */
function LaserLayer({ trail, ratio }: { trail: LaserTrail; ratio: number }) {
  const [, setFrame] = useState(0);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      trail.points = trail.points.filter((p) => now - p.t < LASER_FADE_MS);
      setFrame((f) => (f + 1) % 1_000_000);
      raf = trail.points.length ? requestAnimationFrame(tick) : 0;
    };
    const unsubscribe = trail.subscribe(() => { if (!raf) raf = requestAnimationFrame(tick); });
    return () => { unsubscribe(); cancelAnimationFrame(raf); };
  }, [trail]);

  const now = performance.now();
  const pts = trail.points.filter((p) => now - p.t < LASER_FADE_MS);
  if (!pts.length) return null;
  const h = INK_W / ratio;
  const last = pts[pts.length - 1];
  const lastAge = now - last.t;
  return (
    <svg viewBox={`0 0 ${INK_W} ${h}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
      {pts.slice(1).map((p, i) => {
        const a = pts[i];
        if (p.gap) return null;
        const fade = Math.max(0, 1 - (now - p.t) / LASER_FADE_MS);
        return (
          <line
            key={i}
            x1={a.x * INK_W} y1={a.y * h} x2={p.x * INK_W} y2={p.y * h}
            stroke="#EF4444" strokeWidth={6 * fade + 1} strokeLinecap="round" opacity={0.75 * fade}
          />
        );
      })}
      <g opacity={Math.max(0, 1 - lastAge / LASER_FADE_MS)}>
        <circle cx={last.x * INK_W} cy={last.y * h} r={18} fill="#EF4444" opacity={0.25} />
        <circle cx={last.x * INK_W} cy={last.y * h} r={8} fill="#EF4444" stroke="#ffffff" strokeWidth={2.5} />
      </g>
    </svg>
  );
}
