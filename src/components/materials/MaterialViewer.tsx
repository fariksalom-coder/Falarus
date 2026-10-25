import { useEffect, useState, type ReactNode } from 'react';
import { FileAudio, Loader2, ZoomOut } from 'lucide-react';
import { PAGE_WIDTHS, type MaterialKind, type PageWidth } from '../../../shared/teacherMaterials';
import { fetchMaterialBlob, loadPageUrl, type MaterialSource } from '../../api/teacherMaterials';
import { useZoomPan } from './useZoomPan';

/**
 * Dars materialini ko'rsatadi. PDF va rasm — server chizgan yengil sahifa rasmlari (WebP):
 * telefon butun kitobni emas, faqat ko'rinayotgan sahifani yuklaydi, qo'shnilari oldindan olinadi.
 * Audio/video — butun fayl.
 *
 * PDF sahifasini tashqaridan `page` boshqaradi — darsda o'qituvchi varaqlaydi, o'quvchi ergashadi.
 */

export type MaterialViewerProps = {
  token: string | null;
  source: MaterialSource;
  kind: MaterialKind;
  title: string;
  /** PDF sahifasi (1 dan). */
  page?: number;
  pageCount?: number | null;
  /** `dark` — dars xonasidagi to'q fon. */
  tone?: 'light' | 'dark';
  loadingText?: string;
  errorText?: string;
  /** Kattalashtirilmagan sahifada tez gorizontal surish (o'qituvchi varaqlaydi). */
  onSwipe?: (dir: 1 | -1) => void;
  /** Sahifa ustidagi qatlam (chizmalar, lazer) — sahifa bilan birga kattalashadi. */
  overlay?: ReactNode;
};

/** Ekranga mos eng kichik yetarli o'lcham (retina hisobga olinadi). */
function widthFor(cssWidth: number): PageWidth {
  const need = cssWidth * Math.min(window.devicePixelRatio || 1, 2.5);
  return PAGE_WIDTHS.find((w) => w >= need) ?? PAGE_WIDTHS[PAGE_WIDTHS.length - 1];
}

export default function MaterialViewer({
  token, source, kind, title, page = 1, pageCount, tone = 'light', loadingText = 'Yuklanmoqda…', errorText = 'Faylni ochib boʻlmadi',
  onSwipe, overlay,
}: MaterialViewerProps) {
  const dark = tone === 'dark';
  if (kind === 'pdf' || kind === 'image') {
    return (
      <PageView
        token={token} source={source} page={kind === 'image' ? 1 : page} pageCount={kind === 'image' ? 1 : pageCount ?? null}
        title={title} dark={dark} loadingText={loadingText} errorText={errorText} onSwipe={onSwipe} overlay={overlay}
      />
    );
  }
  return <MediaView token={token} source={source} kind={kind} title={title} dark={dark} loadingText={loadingText} errorText={errorText} />;
}

function PageView({ token, source, page, pageCount, title, dark, loadingText, errorText, onSwipe, overlay }: {
  token: string | null; source: MaterialSource; page: number; pageCount: number | null; title: string; dark: boolean;
  loadingText: string; errorText: string; onSwipe?: (dir: 1 | -1) => void; overlay?: ReactNode;
}) {
  const sourceKey = JSON.stringify(source);
  const zoom = useZoomPan(`${sourceKey}:${page}`, onSwipe);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [width, setWidth] = useState<PageWidth | null>(null);
  const [shown, setShown] = useState<{ key: string; url: string; ratio: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const el = zoom.boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [zoom.boxRef]);

  // Rasm o'lchami faqat kattalashadi — telefonni burganda sahifa qayta yuklanib turmasin.
  // Kattalashtirilganda tiniqroq nusxa olinadi.
  useEffect(() => {
    if (!box.w) return;
    const next = widthFor(box.w * Math.min(zoom.scale, 2));
    setWidth((w) => (w == null || next > w ? next : w));
  }, [box.w, zoom.scale]);

  useEffect(() => {
    if (!token || !width) return;
    let alive = true;
    const key = `${sourceKey}:${page}`;
    setLoading(true);
    setError(false);
    loadPageUrl(token, source, page, width)
      .then((url) => new Promise<{ url: string; ratio: number }>((ok, bad) => {
        const img = new Image();
        img.onload = () => ok({ url, ratio: img.naturalWidth / Math.max(1, img.naturalHeight) });
        img.onerror = bad;
        img.src = url;
      }))
      .then(({ url, ratio }) => {
        if (!alive) return;
        setShown({ key, url, ratio });
        setLoading(false);
        // Keyingi va oldingi sahifa oldindan — varaqlash bir zumda bo'lsin.
        for (const n of [page + 1, page - 1]) {
          if (n >= 1 && (pageCount == null || n <= pageCount)) void loadPageUrl(token, source, n, width).catch(() => undefined);
        }
      })
      .catch(() => { if (alive) { setError(true); setLoading(false); } });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, sourceKey, page, width, pageCount]);

  // Sahifa maydoni: konteynerga sig'adigan eng katta to'rtburchak (chizmalar shu o'lchamga bog'lanadi).
  const pad = 8;
  const fit = shown && box.w && box.h
    ? (() => {
        const w = Math.max(1, box.w - pad * 2);
        const h = Math.max(1, box.h - pad * 2);
        return w / h > shown.ratio ? { w: h * shown.ratio, h } : { w, h: w / shown.ratio };
      })()
    : null;

  return (
    <div
      ref={zoom.boxRef}
      {...zoom.handlers}
      className="relative h-full w-full touch-none select-none overflow-hidden"
      style={{ cursor: zoom.scale > 1 ? (zoom.gesturing ? 'grabbing' : 'grab') : undefined }}
    >
      {error && !shown ? (
        <p className={`absolute inset-0 flex items-center justify-center px-6 text-center text-[14px] font-semibold ${dark ? 'text-white/70' : 'text-app-text-muted'}`}>{errorText}</p>
      ) : null}
      {shown && fit ? (
        <div
          className="absolute inset-0 flex items-center justify-center will-change-transform"
          style={{ transform: zoom.transform, transition: zoom.gesturing ? 'none' : 'transform 180ms ease-out' }}
        >
          <div className="relative overflow-hidden rounded-[6px] bg-white shadow-[0_14px_34px_rgba(15,23,42,0.18)]" style={{ width: fit.w, height: fit.h }}>
            <img
              key={shown.key}
              src={shown.url}
              alt={pageCount && pageCount > 1 ? `${title} — ${page}` : title}
              draggable={false}
              className={`h-full w-full transition-opacity duration-150 ${loading ? 'opacity-70' : 'opacity-100'}`}
            />
            {overlay}
          </div>
        </div>
      ) : null}
      {loading && !shown ? <div className="absolute inset-0 flex items-center justify-center"><Spinner dark={dark} text={loadingText} /></div> : null}
      {loading && shown ? <Loader2 className={`pointer-events-none absolute right-3 top-3 h-5 w-5 animate-spin ${dark ? 'text-white/70' : 'text-app-text-muted'}`} /> : null}
      {zoom.scale > 1 ? (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={zoom.reset}
          className="absolute bottom-3 right-3 flex min-h-[40px] items-center gap-1.5 rounded-full bg-[#0F172A]/80 px-3.5 text-[12.5px] font-bold text-white backdrop-blur transition active:scale-95"
        >
          <ZoomOut className="h-4 w-4" /> {Math.round(zoom.scale * 100)}%
        </button>
      ) : null}
      {error && shown ? (
        <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-[#7F1D1D]/80 px-3 py-1.5 text-[12px] font-bold text-white">{errorText}</p>
      ) : null}
    </div>
  );
}

function MediaView({ token, source, kind, title, dark, loadingText, errorText }: {
  token: string | null; source: MaterialSource; kind: MaterialKind; title: string; dark: boolean; loadingText: string; errorText: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const sourceKey = JSON.stringify(source);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    let objectUrl: string | null = null;
    setUrl(null);
    setError(false);
    fetchMaterialBlob(token, source)
      .then((b) => { if (alive) { objectUrl = URL.createObjectURL(b); setUrl(objectUrl); } })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, sourceKey]);

  if (error) return <Centered><p className={`px-6 text-center text-[14px] font-semibold ${dark ? 'text-white/70' : 'text-app-text-muted'}`}>{errorText}</p></Centered>;
  if (!url) return <Centered><Spinner dark={dark} text={loadingText} /></Centered>;
  if (kind === 'video') {
    return (
      <Centered>
        <video src={url} controls playsInline className="max-h-full max-w-full rounded-[12px] bg-black" />
      </Centered>
    );
  }
  return (
    <Centered>
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

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex h-full w-full items-center justify-center p-3">{children}</div>;
}

function Spinner({ dark, text }: { dark: boolean; text: string }) {
  return (
    <span className={`flex items-center gap-2 text-[13px] font-bold ${dark ? 'text-white/70' : 'text-app-text-muted'}`}>
      <Loader2 className="h-5 w-5 animate-spin" /> {text}
    </span>
  );
}
