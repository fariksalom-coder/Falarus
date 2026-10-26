import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FileText, Loader2, RotateCw, X, ZoomIn } from 'lucide-react';
import { apiUrl } from '../../api';
import { getAdminToken } from '../../lib/adminApi';

/**
 * Chekni yuklab olmasdan ko'rsatish: kartochkada kichik surat, bosilsa butun ekranda
 * (o'sha yerda tasdiqlash/rad etish tugmalari). PDF ham shu sahifada, butun ekranli oynada.
 *
 * Fayl faqat kartochka ekranga yaqinlashganda olinadi — 50 ta chek birdaniga yuklanmasin.
 */
type Loaded = { url: string; pdf: boolean };

export default function ReceiptPreview({ kind, id, actions }: {
  /** `receipts` yoki `rahmat-claims` — `/api/admin/operator-bot/<kind>/<id>/file`. */
  kind: string;
  id: number;
  /** Butun ekranli ko'rinishda chiqadigan tugmalar (tasdiqlash/rad etish). */
  actions?: (close: () => void) => ReactNode;
}) {
  const box = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [file, setFile] = useState<Loaded | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el || visible) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { rootMargin: '300px' });
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    let url: string | null = null;
    setError(false);
    fetch(apiUrl(`/api/admin/operator-bot/${kind}/${id}/file`), { headers: { Authorization: `Bearer ${getAdminToken()}` } })
      .then((res) => { if (!res.ok) throw new Error(String(res.status)); return res.blob(); })
      .then((blob) => {
        if (!alive) return;
        url = URL.createObjectURL(blob);
        setFile({ url, pdf: blob.type === 'application/pdf' });
      })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [visible, kind, id, attempt]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div ref={box} className="overflow-hidden rounded-xl border border-app-border bg-app-bg">
      {error ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-app-text-muted">
          <span>Chekni ochib boʻlmadi</span>
          <button type="button" className="ui-button ui-button--secondary" onClick={() => setAttempt((n) => n + 1)}>
            <RotateCw className="mr-1 inline h-4 w-4" /> Qayta urinish
          </button>
        </div>
      ) : !file ? (
        <div className="flex h-40 items-center justify-center text-app-text-muted" role="status" aria-label="Chek yuklanmoqda">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : file.pdf ? (
        <button type="button" onClick={() => setOpen(true)} className="flex h-28 w-full items-center justify-center gap-3 font-semibold text-app-primary transition hover:bg-white">
          <FileText className="h-7 w-7" /> PDF chekni ochish
        </button>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="group relative block w-full cursor-zoom-in" aria-label={`Chek #${id} ni kattalashtirish`}>
          <img src={file.url} alt={`Chek #${id}`} className="mx-auto max-h-[340px] w-full object-contain" />
          <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-slate-900/75 px-2.5 py-1 text-xs font-semibold text-white opacity-90 transition group-hover:opacity-100">
            <ZoomIn className="h-3.5 w-3.5" /> Kattalashtirish
          </span>
        </button>
      )}

      {open && file ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/90" role="dialog" aria-modal="true" aria-label={`Chek #${id}`} onClick={() => setOpen(false)}>
          <div className="flex items-center justify-between gap-3 p-3 text-white" onClick={(e) => e.stopPropagation()}>
            <strong>Chek #{id}</strong>
            <div className="flex flex-wrap items-center gap-2">
              {actions?.(() => setOpen(false))}
              <button type="button" onClick={() => setOpen(false)} aria-label="Yopish" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          {/* Uzun chek — aylantirib ko'riladi; surat bosilsa yopilmaydi. */}
          <div className="min-h-0 flex-1 overflow-auto p-3">
            {file.pdf ? (
              <iframe src={file.url} title={`Chek #${id}`} onClick={(e) => e.stopPropagation()} className="mx-auto h-full w-full max-w-[1000px] rounded-lg bg-white" />
            ) : (
              <img src={file.url} alt={`Chek #${id}`} onClick={(e) => e.stopPropagation()} className="mx-auto max-w-full rounded-lg bg-white" />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
