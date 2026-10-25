import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FileAudio, Loader2 } from 'lucide-react';
import { PAGE_WIDTHS, type MaterialKind, type PageWidth } from '../../../shared/teacherMaterials';
import { fetchMaterialBlob, loadPageUrl, type MaterialSource } from '../../api/teacherMaterials';

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
};

/** Ekranga mos eng kichik yetarli o'lcham (retina hisobga olinadi). */
function widthFor(cssWidth: number): PageWidth {
  const need = cssWidth * Math.min(window.devicePixelRatio || 1, 2.5);
  return PAGE_WIDTHS.find((w) => w >= need) ?? PAGE_WIDTHS[PAGE_WIDTHS.length - 1];
}

export default function MaterialViewer({
  token, source, kind, title, page = 1, pageCount, tone = 'light', loadingText = 'Yuklanmoqda…', errorText = 'Faylni ochib boʻlmadi',
}: MaterialViewerProps) {
  const dark = tone === 'dark';
  if (kind === 'pdf' || kind === 'image') {
    return (
      <PageView
        token={token} source={source} page={kind === 'image' ? 1 : page} pageCount={kind === 'image' ? 1 : pageCount ?? null}
        title={title} dark={dark} loadingText={loadingText} errorText={errorText}
      />
    );
  }
  return <MediaView token={token} source={source} kind={kind} title={title} dark={dark} loadingText={loadingText} errorText={errorText} />;
}

function PageView({ token, source, page, pageCount, title, dark, loadingText, errorText }: {
  token: string | null; source: MaterialSource; page: number; pageCount: number | null; title: string; dark: boolean; loadingText: string; errorText: string;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState<PageWidth | null>(null);
  const [shown, setShown] = useState<{ key: string; url: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const sourceKey = JSON.stringify(source);

  // O'lcham faqat kattalashganda almashadi — telefonni burganda sahifa qayta yuklanib turmasin.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const next = widthFor(e.contentRect.width);
      setWidth((w) => (w == null || next > w ? next : w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!token || !width) return;
    let alive = true;
    const key = `${sourceKey}:${page}:${width}`;
    setLoading(true);
    setError(false);
    loadPageUrl(token, source, page, width)
      .then((url) => {
        if (!alive) return;
        setShown({ key, url });
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

  return (
    <div ref={boxRef} className="relative flex h-full w-full items-center justify-center overflow-hidden p-2">
      {error && !shown ? (
        <p className={`px-6 text-center text-[14px] font-semibold ${dark ? 'text-white/70' : 'text-app-text-muted'}`}>{errorText}</p>
      ) : null}
      {shown ? (
        <img
          key={shown.key}
          src={shown.url}
          alt={pageCount && pageCount > 1 ? `${title} — ${page}` : title}
          draggable={false}
          className={`max-h-full max-w-full select-none rounded-[8px] bg-white object-contain shadow-[0_14px_34px_rgba(15,23,42,0.18)] transition-opacity duration-150 ${loading ? 'opacity-70' : 'opacity-100'}`}
        />
      ) : null}
      {loading && !shown ? <div className="absolute inset-0 flex items-center justify-center"><Spinner dark={dark} text={loadingText} /></div> : null}
      {loading && shown ? <Loader2 className={`absolute right-3 top-3 h-5 w-5 animate-spin ${dark ? 'text-white/70' : 'text-app-text-muted'}`} /> : null}
      {error && shown ? (
        <p className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-[#7F1D1D]/80 px-3 py-1.5 text-[12px] font-bold text-white">{errorText}</p>
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
