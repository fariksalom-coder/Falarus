import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FileAudio, Loader2 } from 'lucide-react';
import type { MaterialKind } from '../../../shared/teacherMaterials';

/**
 * Dars materialini ko'rsatadi: PDF — bitta sahifa (pdf.js, kanvasda), rasm, audio, video.
 * PDF sahifasini tashqaridan `page` boshqaradi — darsda o'qituvchi varaqlaydi, o'quvchi ergashadi.
 *
 * pdf.js public/vendor da (npm paketi emas): faqat PDF ochilganda yuklanadi.
 */

const PDFJS_DIR = '/vendor/pdfjs-4.10.38';

type PdfPage = {
  getViewport: (o: { scale: number }) => { width: number; height: number };
  render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void>; cancel: () => void };
  cleanup: () => void;
};
type PdfDoc = { numPages: number; getPage: (n: number) => Promise<PdfPage>; destroy: () => Promise<void> };
type PdfLib = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (o: { data: Uint8Array; standardFontDataUrl: string; isEvalSupported: boolean }) => { promise: Promise<PdfDoc> };
};

let pdfLib: Promise<PdfLib> | null = null;
function loadPdfLib(): Promise<PdfLib> {
  if (!pdfLib) {
    const url = new URL(`${PDFJS_DIR}/pdf.min.mjs`, window.location.origin).href;
    pdfLib = (import(/* @vite-ignore */ url) as Promise<PdfLib>).then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = new URL(`${PDFJS_DIR}/pdf.worker.min.mjs`, window.location.origin).href;
      return lib;
    });
    pdfLib.catch(() => { pdfLib = null; });
  }
  return pdfLib;
}

/** PDF ning birinchi sahifasi kichik rasm bo'lib (kartochka uchun). */
export async function renderPdfThumb(blob: Blob, width = 480): Promise<string | null> {
  const lib = await loadPdfLib();
  const doc = await lib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), standardFontDataUrl: `${PDFJS_DIR}/standard_fonts/`, isEvalSupported: false }).promise;
  try {
    const p = await doc.getPage(1);
    const viewport = p.getViewport({ scale: width / p.getViewport({ scale: 1 }).width });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    await p.render({ canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL('image/jpeg', 0.82);
  } finally {
    void doc.destroy();
  }
}

export type MaterialViewerProps = {
  blob: Blob | null;
  kind: MaterialKind;
  title: string;
  /** PDF sahifasi (1 dan). */
  page?: number;
  onPageCount?: (n: number) => void;
  /** `dark` — dars xonasidagi to'q fon. */
  tone?: 'light' | 'dark';
  /** Yuklanayotganda ko'rsatiladigan matn. */
  loadingText?: string;
  errorText?: string;
};

export default function MaterialViewer({
  blob, kind, title, page = 1, onPageCount, tone = 'light', loadingText = 'Yuklanmoqda…', errorText = 'Faylni ochib boʻlmadi',
}: MaterialViewerProps) {
  const dark = tone === 'dark';
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob || kind === 'pdf') { setUrl(null); return; }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob, kind]);

  if (!blob) return <Centered dark={dark}><Spinner dark={dark} text={loadingText} /></Centered>;

  if (kind === 'pdf') return <PdfPageView blob={blob} page={page} onPageCount={onPageCount} dark={dark} loadingText={loadingText} errorText={errorText} />;
  if (!url) return <Centered dark={dark}><Spinner dark={dark} text={loadingText} /></Centered>;

  if (kind === 'image') {
    return (
      <Centered dark={dark}>
        <img src={url} alt={title} className="max-h-full max-w-full rounded-[12px] object-contain" draggable={false} />
      </Centered>
    );
  }
  if (kind === 'video') {
    return (
      <Centered dark={dark}>
        <video src={url} controls playsInline className="max-h-full max-w-full rounded-[12px] bg-black" />
      </Centered>
    );
  }
  return (
    <Centered dark={dark}>
      <div className={`flex w-full max-w-[420px] flex-col items-center gap-4 rounded-[22px] p-6 text-center ${dark ? 'bg-white/[0.06] ring-1 ring-white/10' : 'border border-app-border bg-app-surface'}`}>
        <span className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#FEF3C7] text-[#B45309]">
          <FileAudio className="h-8 w-8" />
        </span>
        <p className={`text-[15px] font-extrabold ${dark ? 'text-white' : 'text-app-text'}`}>{title}</p>
        <audio src={url} controls className="w-full" />
      </div>
    </Centered>
  );
}

function PdfPageView({ blob, page, onPageCount, dark, loadingText, errorText }: {
  blob: Blob; page: number; onPageCount?: (n: number) => void; dark: boolean; loadingText: string; errorText: string;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [error, setError] = useState(false);
  const [rendering, setRendering] = useState(true);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const countRef = useRef(onPageCount);
  countRef.current = onPageCount;

  useEffect(() => {
    let alive = true;
    let opened: PdfDoc | null = null;
    setDoc(null);
    setError(false);
    void (async () => {
      try {
        const lib = await loadPdfLib();
        const data = new Uint8Array(await blob.arrayBuffer());
        opened = await lib.getDocument({ data, standardFontDataUrl: `${PDFJS_DIR}/standard_fonts/`, isEvalSupported: false }).promise;
        if (!alive) { void opened.destroy(); return; }
        setDoc(opened);
        countRef.current?.(opened.numPages);
      } catch {
        if (alive) setError(true);
      }
    })();
    return () => { alive = false; void opened?.destroy(); };
  }, [blob]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: Math.floor(e.contentRect.width), h: Math.floor(e.contentRect.height) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!doc || !box.w || !box.h || !canvasRef.current) return;
    let task: { cancel: () => void } | null = null;
    let alive = true;
    setRendering(true);
    void (async () => {
      try {
        const p = await doc.getPage(Math.min(Math.max(1, page), doc.numPages));
        if (!alive) return;
        const base = p.getViewport({ scale: 1 });
        // Sahifa butunligicha ko'rinadi (slayd ham, A4 ham); retina ekranda tiniq bo'lishi uchun dpr.
        const fit = Math.min(box.w / base.width, box.h / base.height);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = p.getViewport({ scale: fit * dpr });
        const canvas = canvasRef.current!;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const r = p.render({ canvasContext: ctx, viewport });
        task = r;
        await r.promise;
        if (alive) setRendering(false);
      } catch {
        /* sahifa almashganda eski chizish bekor qilinadi — bu xato emas */
      }
    })();
    return () => { alive = false; task?.cancel(); };
  }, [doc, page, box.w, box.h]);

  return (
    <div ref={boxRef} className="relative flex h-full w-full items-center justify-center overflow-hidden">
      {error ? (
        <p className={`px-6 text-center text-[14px] font-semibold ${dark ? 'text-white/70' : 'text-app-text-muted'}`}>{errorText}</p>
      ) : (
        <>
          <canvas ref={canvasRef} className={`rounded-[8px] bg-white shadow-[0_14px_34px_rgba(15,23,42,0.18)] transition-opacity duration-200 ${rendering ? 'opacity-60' : 'opacity-100'}`} />
          {!doc ? <div className="absolute inset-0 flex items-center justify-center"><Spinner dark={dark} text={loadingText} /></div> : null}
        </>
      )}
    </div>
  );
}

function Centered({ children }: { children: ReactNode; dark?: boolean }) {
  return <div className="flex h-full w-full items-center justify-center p-3">{children}</div>;
}

function Spinner({ dark, text }: { dark: boolean; text: string }) {
  return (
    <span className={`flex items-center gap-2 text-[13px] font-bold ${dark ? 'text-white/70' : 'text-app-text-muted'}`}>
      <Loader2 className="h-5 w-5 animate-spin" /> {text}
    </span>
  );
}
