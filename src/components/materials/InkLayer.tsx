import { memo, useEffect, useState, type MutableRefObject, type RefObject } from 'react';
import type { Stroke } from '../../../shared/lessonRoom';
import { Trash2 } from 'lucide-react';
import { INK_W, TEXT_FONT, TEXT_LINE, strokePath, textBox, textLines, textMaxWidth } from './ink';

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
    const x = s.pts[0] * INK_W;
    // Uzun matn sahifaning o'ng chetidan chiqmaydi — qatorlarga bo'linadi.
    const lines = textLines(s.text ?? '', s.size, s.pts[0]);
    return (
      <text
        x={x}
        y={s.pts[1] * h}
        fontSize={s.size}
        fontWeight={700}
        fill={s.color}
        dominantBaseline="hanging"
        stroke="#ffffff"
        strokeWidth={s.size * 0.12}
        paintOrder="stroke"
        style={{ fontFamily: TEXT_FONT }}
      >
        {lines.map((line, i) => (
          <tspan key={i} x={x} dy={i ? s.size * TEXT_LINE : 0}>{line}</tspan>
        ))}
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
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  /** Matnni butunlay o'chirish (burchakdagi savat). */
  onDelete: () => void;
  /** Tahrirlanayotgan yoki surilayotgan eski matn — doskada vaqtincha ko'rinmaydi. */
  hiddenId: string | null;
  /** Matn asbobida: bosib tahrirlash/surish mumkin bo'lgan matnlar. */
  editableIds: Set<string>;
};

export function InkLayer({ ratio, strokes, live, laser, rootRef, editor }: {
  ratio: number;
  strokes: Stroke[];
  /** Chizilayotgan chiziqlar (barmoq hali ko'tarilmagan) va surilayotgan matn. */
  live: Array<LiveStroke & { text?: string }>;
  laser: LaserTrail;
  rootRef: MutableRefObject<HTMLDivElement | null>;
  editor?: TextEditor | null;
}) {
  const h = INK_W / ratio;
  const hiddenId = editor?.hiddenId ?? null;
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
        {ordered.map((s) => (s.id === hiddenId ? null : <StrokeShape key={s.id} s={s} ratio={ratio} done />))}
        {/* Matn asbobida: bosib tahrirlanadigan matnlar yengil ramkada — qayerni bosish kerakligi ko'rinsin. */}
        {editor ? strokes.filter((s) => s.tool === 'text' && s.id !== hiddenId && editor.editableIds.has(s.id)).map((s) => {
          const b = textBox(s, ratio);
          const pad = 6;
          return (
            <rect
              key={`edit-${s.id}`}
              x={b.x * INK_W - pad} y={b.y * h - pad} width={b.w * INK_W + pad * 2} height={b.h * h + pad * 2}
              rx={8} fill="none" stroke={s.color} strokeOpacity={0.45} strokeWidth={2} strokeDasharray="6 6"
            />
          );
        }) : null}
        {live.map((s) => <StrokeShape key={`live-${s.id}`} s={s} ratio={ratio} done={false} />)}
      </svg>
      <LaserLayer trail={laser} ratio={ratio} />
      {editor ? <InlineTextEditor editor={editor} pageW={pageW} /> : null}
    </div>
  );
}

/**
 * Yozilayotgan matn bosilgan joyning o'zida, tayyor matn ko'rinishida chiqadi.
 * Ko'rinadigan qism — oddiy matn (o'lchami shu matnga moslashadi, sahifa chetida keyingi
 * qatorga o'tadi), ustida shaffof maydon (kursor va klaviatura). Enter yoki boshqa joyga
 * bosish — matn doskaga qo'yiladi. O'ng-yuqori burchakdagi savat — matnni o'chiradi.
 */
function InlineTextEditor({ editor, pageW }: { editor: TextEditor; pageW: number }) {
  const { at, value, color, size, inputRef, onChange, onCommit, onCancel, onDelete } = editor;
  const scale = pageW / INK_W;
  const fontPx = Math.max(12, size * scale);
  const maxW = at ? textMaxWidth(size, at.x) * scale : 0;
  const textStyle = {
    fontSize: fontPx,
    lineHeight: TEXT_LINE,
    fontWeight: 700,
    fontFamily: TEXT_FONT,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
  } as const;
  return (
    <div
      className="pointer-events-auto absolute"
      style={at ? { left: `${at.x * 100}%`, top: `${at.y * 100}%` } : { left: -9999, top: 0, opacity: 0 }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="relative -m-1.5 rounded-[8px] p-1.5"
        style={{ outline: `2px dashed ${color}`, outlineOffset: 1, background: 'rgba(255,255,255,0.7)' }}
      >
        <div aria-hidden="true" style={{ ...textStyle, maxWidth: maxW || undefined, minWidth: fontPx * 1.5, color: value ? color : `${color}66` }}>
          {value || 'Yozing…'}{'\u200b'}
        </div>
        <textarea
          ref={inputRef}
          value={value}
          maxLength={200}
          rows={1}
          enterKeyHint="done"
          autoCapitalize="sentences"
          aria-label="Doskaga matn"
          onChange={(e) => onChange(e.target.value.replace(/\s*\n\s*/g, ' '))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
            else if (e.key === 'Escape') { onCancel(); e.currentTarget.blur(); }
          }}
          onBlur={onCommit}
          className="absolute inset-1.5 resize-none overflow-hidden bg-transparent p-0 outline-none"
          style={{ ...textStyle, color: 'transparent', caretColor: color }}
        />
        {at ? (
          <button
            type="button"
            aria-label="Matnni oʻchirish"
            // Bosilganda maydondan chiqilmasin (aks holda matn avval saqlanib qolardi).
            onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onDelete}
            // Savat yozilayotgan matnning ustiga tushmasin: ramkadan tashqarida, uning ustida (sahifa
            // tepasida yozilsa — pastida). O'ng chetga tekislangan.
            className={`absolute right-[-6px] flex h-11 w-11 items-center justify-center ${at.y < 0.1 ? 'top-full mt-1' : 'bottom-full mb-1'}`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EF4444] text-white shadow-[0_6px_16px_rgba(239,68,68,0.45)] ring-2 ring-white transition active:scale-90">
              <Trash2 className="h-4 w-4" />
            </span>
          </button>
        ) : null}
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
