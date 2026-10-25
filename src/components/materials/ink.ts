/**
 * Doskadagi chizmalar: asboblar, ranglar, chiziqni SVG ga aylantirish va o'chirgich uchun tekshiruv.
 *
 * Koordinatalar sahifaga nisbatan 0..1 saqlanadi. Chizishda esa sahifa «virtual» o'lchamda:
 * eni 1000, bo'yi 1000 / nisbat — shunda qalinlik va burilishlar har ekranda bir xil.
 */
import { getStroke } from '../../lib/vendor/perfect-freehand';
import type { InkTool, Stroke } from '../../../shared/lessonRoom';

export const INK_W = 1000;

/** Tanlanadigan asbob: chizmalardan tashqari — ko'rish (kattalashtirish/surish), o'chirgich va lazer. */
export type BoardTool = 'view' | InkTool | 'eraser' | 'laser';

export const INK_COLORS = ['#0F172A', '#EF4444', '#2563EB', '#16A34A', '#F59E0B', '#9333EA'] as const;
/** Marker sukut bo'yicha sariq (matn ustini bo'yash uchun). */
export const MARKER_COLORS = ['#FDE047', '#86EFAC', '#93C5FD', '#F9A8D4', '#FDBA74', '#EF4444'] as const;

/** Asbob qalinligi — sahifa enining mingdan bir ulushida. */
export const TOOL_SIZE: Record<InkTool, number> = { pen: 7, marker: 26, text: 34 };

export const ERASER_RADIUS = 0.022;

/** Nuqtalar [x, y, …] (0..1) → virtual o'lchamdagi juftliklar. */
function toVirtual(pts: number[], ratio: number): number[][] {
  const h = INK_W / ratio;
  const out: number[][] = [];
  for (let i = 0; i + 1 < pts.length; i += 2) out.push([pts[i] * INK_W, pts[i + 1] * h]);
  // Bitta nuqta (bosib qo'yish) ham ko'rinsin.
  if (out.length === 1) out.push([out[0][0] + 0.01, out[0][1] + 0.01]);
  return out;
}

/** perfect-freehand qaytargan kontur → SVG `d` (README dagi silliq usul). */
function outlineToPath(outline: [number, number][]): string {
  if (outline.length < 4) return '';
  const avg = (a: number, b: number) => (a + b) / 2;
  const [a, b, c] = outline;
  let d = `M${a[0].toFixed(1)},${a[1].toFixed(1)} Q${b[0].toFixed(1)},${b[1].toFixed(1)} ${avg(b[0], c[0]).toFixed(1)},${avg(b[1], c[1]).toFixed(1)} T`;
  for (let i = 2; i < outline.length - 1; i++) {
    const p = outline[i];
    const q = outline[i + 1];
    d += `${avg(p[0], q[0]).toFixed(1)},${avg(p[1], q[1]).toFixed(1)} `;
  }
  return `${d}Z`;
}

/** Pero — bosimga o'xshab ingichkalashadi; marker — tekis, keng. */
export function strokePath(s: Pick<Stroke, 'tool' | 'size' | 'pts'>, ratio: number, done = true): string {
  const marker = s.tool === 'marker';
  const outline = getStroke(toVirtual(s.pts, ratio), {
    size: s.size,
    thinning: marker ? 0 : 0.45,
    smoothing: 0.6,
    streamline: marker ? 0.3 : 0.45,
    simulatePressure: !marker,
    start: { cap: true },
    end: { cap: true },
    last: done,
  });
  return outlineToPath(outline);
}

/** Matnning taxminiy chegarasi (0..1) — o'chirgich uchun. */
function textBox(s: Stroke, ratio: number) {
  const w = ((s.text?.length ?? 0) * s.size * 0.56) / INK_W;
  const h = (s.size * 1.25 * ratio) / INK_W;
  return { x: s.pts[0], y: s.pts[1], w, h };
}

/** (x, y) nuqtasi chizmaga tegadimi (0..1 koordinatada, `ratio` — sahifa eni/bo'yi). */
export function hitStroke(s: Stroke, x: number, y: number, ratio: number, radius = ERASER_RADIUS): boolean {
  if (s.tool === 'text') {
    const b = textBox(s, ratio);
    return x >= b.x - radius && x <= b.x + b.w + radius && y >= b.y - radius && y <= b.y + b.h + radius;
  }
  // Masofa virtual o'lchamda hisoblanadi (eni va bo'yi bir xil birlikda).
  const h = INK_W / ratio;
  const px = x * INK_W;
  const py = y * h;
  const r = radius * INK_W + s.size / 2;
  const p = s.pts;
  if (p.length === 2) return Math.hypot(p[0] * INK_W - px, p[1] * h - py) <= r;
  for (let i = 0; i + 3 < p.length; i += 2) {
    const ax = p[i] * INK_W, ay = p[i + 1] * h, bx = p[i + 2] * INK_W, by = p[i + 3] * h;
    const dx = bx - ax, dy = by - ay;
    const len = dx * dx + dy * dy;
    const k = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
    if (Math.hypot(ax + k * dx - px, ay + k * dy - py) <= r) return true;
  }
  return false;
}

let counter = 0;
export const newStrokeId = () => `${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
