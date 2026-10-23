/**
 * Profil suratini kvadratga kesish oynasi. O'qituvchi suratni suradi va
 * kattalashtiradi (barmoq bilan chimdish, g'ildirak yoki slayder), ramka ichidagi
 * qism 800×800 JPEG bo'lib qaytadi. Kesish brauzerda — kutubxonasiz, canvas bilan,
 * shuning uchun telefon kamerasining katta fayllari ham serverga kichik bo'lib boradi.
 */
import { useEffect, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Minus, Plus, X } from 'lucide-react';
import { ONBOARDING_TEXT } from './text';

const OUT = 800;
const MAX_ZOOM = 4;
/** Tanlanadigan asl fayl chegarasi: kesilgandan keyin u baribir ~150 KB bo'ladi. */
export const CROP_SOURCE_MAX_BYTES = 40 * 1024 * 1024;

type Lang = 'uz' | 'ru';

/** Faylni rasm sifatida ochadi. HEIC'ni faqat Safari ocha oladi — boshqalarda xato qaytadi. */
export function loadCropImage(file: File, lang: Lang): Promise<{ img: HTMLImageElement; url: string }> {
  const t = ONBOARDING_TEXT[lang];
  if (file.type && !file.type.startsWith('image/')) return Promise.reject(new Error(t.cropNotImage));
  if (file.size > CROP_SOURCE_MAX_BYTES) return Promise.reject(new Error(t.cropTooBig));
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => (img.naturalWidth && img.naturalHeight ? resolve({ img, url }) : reject(new Error(t.cropCantOpen)));
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(t.cropCantOpen)); };
    img.src = url;
  });
}

function frameSize() {
  return typeof window === 'undefined' ? 300 : Math.max(200, Math.min(340, window.innerWidth - 48, window.innerHeight - 330));
}

export default function PhotoCropper({ img, src, lang, onCancel, onDone }: {
  img: HTMLImageElement;
  src: string;
  lang: Lang;
  onCancel: () => void;
  /** Kesilgan surat. Promise xato bilan tugasa, oyna ochiq qoladi va xato ko'rsatiladi. */
  onDone: (blob: Blob) => Promise<void>;
}) {
  const t = ONBOARDING_TEXT[lang];
  const [box] = useState(frameSize);
  const base = box / Math.min(img.naturalWidth, img.naturalHeight);
  // Bitta holat: tez ketma-ket hodisalarda (chimdish) eski qiymat ustiga yozilmasin.
  const [view, setView] = useState(() => ({ zoom: 1, x: (box - img.naturalWidth * base) / 2, y: (box - img.naturalHeight * base) / 2 }));
  const { zoom } = view;
  const [moving, setMoving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const frame = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; zoom: number } | null>(null);

  // Oyna ochiq paytda orqadagi sahifa aylanmasin; Esc — bekor qilish.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [busy, onCancel]);

  const w = img.naturalWidth * base * zoom;
  const h = img.naturalHeight * base * zoom;
  const fit = (z: number, x: number, y: number) => {
    const cw = img.naturalWidth * base * z, ch = img.naturalHeight * base * z;
    return { zoom: z, x: Math.min(0, Math.max(box - cw, x)), y: Math.min(0, Math.max(box - ch, y)) };
  };

  /** (cx, cy) ramka ichidagi nuqta joyida qolgan holda kattalashtirish. */
  const zoomAt = (next: number | ((z: number) => number), cx = box / 2, cy = box / 2) => setView((v) => {
    const z = Math.min(MAX_ZOOM, Math.max(1, typeof next === 'function' ? next(v.zoom) : next));
    const k = z / v.zoom;
    return fit(z, cx - (cx - v.x) * k, cy - (cy - v.y) * k);
  });

  const local = (e: { clientX: number; clientY: number }) => {
    const r = frame.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const down = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setMoving(true);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
    }
  };

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size >= 2 && gesture.current) {
      const [a, b] = [...pointers.current.values()];
      const mid = local({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
      zoomAt(gesture.current.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / gesture.current.dist), mid.x, mid.y);
    } else {
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      setView((v) => fit(v.zoom, v.x + dx, v.y + dy));
    }
  };

  const up = (e: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current = null;
    if (pointers.current.size === 0) setMoving(false);
  };

  const wheel = (e: WheelEvent<HTMLDivElement>) => {
    const p = local(e);
    zoomAt((z) => z * Math.exp(-e.deltaY * 0.0015), p.x, p.y);
  };

  const confirm = async () => {
    setBusy(true); setError('');
    try {
      const canvas = document.createElement('canvas');
      canvas.width = OUT; canvas.height = OUT;
      const ctx = canvas.getContext('2d')!;
      // Shaffof PNG qora fon olmasin.
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, OUT, OUT);
      ctx.imageSmoothingQuality = 'high';
      const scale = img.naturalWidth / w;
      ctx.drawImage(img, -view.x * scale, -view.y * scale, box * scale, box * scale, 0, 0, OUT, OUT);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.9));
      if (!blob) throw new Error(t.cropCantOpen);
      await onDone(blob);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.cropCantOpen);
    } finally {
      setBusy(false);
    }
  };

  const step = 0.25;
  const iconBtn = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-app-border bg-app-surface text-app-text transition hover:bg-app-bg-subtle active:scale-95 disabled:opacity-40';

  // Portal: ota-blokdagi animatsiya (transform) fixed oynani siqib qo'ymasin.
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#0F172A]/70 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={t.cropTitle}>
      <div className="flex max-h-[100dvh] w-full flex-col overflow-y-auto rounded-t-[24px] bg-app-surface pb-[max(16px,env(safe-area-inset-bottom))] shadow-[0_24px_60px_rgba(15,23,42,0.35)] sm:max-w-[440px] sm:rounded-[24px]">
        <div className="flex items-center justify-between gap-3 px-5 pt-4">
          <div>
            <h2 className="text-[17px] font-extrabold text-app-text">{t.cropTitle}</h2>
            <p className="text-[12.5px] text-app-text-muted">{t.cropHint}</p>
          </div>
          <button type="button" onClick={onCancel} disabled={busy} aria-label={t.cropCancel} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-app-text-muted transition hover:bg-app-bg-subtle">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex justify-center bg-[#0F172A] py-5">
          <div
            ref={frame}
            className="relative cursor-grab touch-none select-none overflow-hidden active:cursor-grabbing"
            style={{ width: box, height: box }}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            onWheel={wheel}
          >
            <img src={src} alt="" draggable={false} className="pointer-events-none absolute max-w-none" style={{ width: w, height: h, left: view.x, top: view.y }} />
            {/* Ramka: aylana — ro'yxatda shunday ko'rinadi; to'r — faqat surilayotganda. */}
            <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.9)]" />
            <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_999px_rgba(15,23,42,0.45)] ring-2 ring-white/70" />
            <div className={`pointer-events-none absolute inset-0 transition-opacity ${moving ? 'opacity-100' : 'opacity-0'}`}>
              <div className="absolute inset-y-0 left-1/3 w-px bg-white/40" />
              <div className="absolute inset-y-0 left-2/3 w-px bg-white/40" />
              <div className="absolute inset-x-0 top-1/3 h-px bg-white/40" />
              <div className="absolute inset-x-0 top-2/3 h-px bg-white/40" />
            </div>
          </div>
        </div>

        <div className="space-y-4 px-5 pt-4">
          <p className="text-center text-[12.5px] text-app-text-muted">{t.photoDrag}</p>
          <div className="flex items-center gap-3">
            <button type="button" className={iconBtn} onClick={() => zoomAt((z) => z - step)} disabled={zoom <= 1} aria-label={t.cropZoomOut}><Minus className="h-4 w-4" /></button>
            <input
              type="range" min={1} max={MAX_ZOOM} step={0.01} value={zoom}
              onChange={(e) => zoomAt(Number(e.target.value))}
              aria-label={t.photoZoom}
              className="h-11 flex-1 accent-[#0F766E]"
            />
            <button type="button" className={iconBtn} onClick={() => zoomAt((z) => z + step)} disabled={zoom >= MAX_ZOOM} aria-label={t.cropZoomIn}><Plus className="h-4 w-4" /></button>
          </div>
          {error && <p role="alert" className="rounded-[12px] bg-[#FEF2F2] px-3 py-2 text-[13px] font-medium text-[#B91C1C]">{error}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={onCancel} disabled={busy} className="min-h-[48px] rounded-[16px] border border-app-border bg-app-surface text-[14px] font-bold text-app-text transition hover:bg-app-bg-subtle active:scale-[0.98]">
              {t.cropCancel}
            </button>
            <button type="button" onClick={() => void confirm()} disabled={busy} className="flex min-h-[48px] items-center justify-center rounded-[16px] bg-[#0F766E] text-[14px] font-bold text-white transition hover:bg-[#115E59] active:scale-[0.98] disabled:opacity-60">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : t.cropConfirm}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
