import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { ArrowRight, Volume2, X } from 'lucide-react';

export const RUSSIA_PAYMENT_GUIDE_VIDEO = '/payment-guide/russia.mp4';
const RUSSIA_PAYMENT_GUIDE_POSTER = '/payment-guide/russia.jpg';

const STEPS = [
  '«To‘lash» tugmasini bosing — Rahmat to‘lov sahifasi ochiladi.',
  '«Способы оплаты» bo‘limidan o‘z bankingizni tanlang (Sber, T-Bank, VTB…).',
  'Bank ilovasida to‘lovni tasdiqlang — kurs avtomatik ochiladi.',
];

type RussiaPaymentGuideProps = {
  payLabel: string;
  paying: boolean;
  error: boolean;
  onPay: () => void;
  onClose: () => void;
};

/** Full-screen "how to pay from Russia" video shown before opening Rahmat checkout. */
export default function RussiaPaymentGuide({ payLabel, paying, error, onPay, onClose }: RussiaPaymentGuideProps) {
  const video = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    // Opened by a tap, so sound is usually allowed; otherwise fall back to muted autoplay.
    el.play().catch(() => {
      el.muted = true;
      setMuted(true);
      void el.play().catch(() => { /* Controls stay available for a manual start. */ });
    });
  }, []);

  // Parent re-renders every second (countdown), so read the latest onClose through a ref.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') closeRef.current(); };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prevOverflow; window.removeEventListener('keydown', onKey); };
  }, []);

  const unmute = () => {
    const el = video.current;
    if (!el) return;
    el.muted = false;
    setMuted(false);
    void el.play().catch(() => {});
  };

  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="russia-pay-title"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 34 }}
      className="fixed inset-0 z-[100] flex flex-col bg-[#F2F5FA] text-[#0F172A]"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex h-full w-full max-w-[480px] flex-col px-4">
        <header className="flex shrink-0 items-center justify-between gap-3 py-2">
          <h2 id="russia-pay-title" className="text-lg font-extrabold leading-tight">Rossiyadan to‘lov qilish</h2>
          <button type="button" onClick={onClose} aria-label="Yopish" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm transition-transform hover:bg-slate-50 active:scale-95">
            <X size={22} />
          </button>
        </header>

        <ol className="shrink-0 space-y-1.5 rounded-[20px] border border-[#E2E8F0] bg-white p-3 shadow-[0_14px_34px_rgba(148,163,184,0.12)]">
          {STEPS.map((step, index) => (
            <li key={step} className="flex gap-2.5 text-[13.5px] font-semibold leading-snug text-slate-700">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <div className="relative my-3 flex min-h-0 flex-1 items-center justify-center">
          <video
            ref={video}
            src={RUSSIA_PAYMENT_GUIDE_VIDEO}
            poster={RUSSIA_PAYMENT_GUIDE_POSTER}
            className="h-full max-h-full w-auto max-w-full rounded-2xl bg-black object-contain shadow-sm"
            style={{ aspectRatio: '9 / 16' }}
            autoPlay
            playsInline
            controls
            preload="auto"
          />
          {muted && (
            <button type="button" onClick={unmute} className="absolute left-1/2 top-3 inline-flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-slate-950/75 px-4 text-sm font-bold text-white shadow-lg active:scale-95">
              <Volume2 size={18} />Ovozni yoqish
            </button>
          )}
        </div>

        <div className="shrink-0 pb-3">
          {error && <p role="alert" className="mb-2 rounded-2xl bg-red-50 p-3 text-center text-sm text-red-700">To‘lovni ochib bo‘lmadi. Qayta urinib ko‘ring.</p>}
          <button type="button" disabled={paying} onClick={onPay} className="flex min-h-14 w-full items-center justify-center gap-3 rounded-[22px] border-b-4 border-blue-800 bg-[#2563FF] px-4 py-3 text-lg font-extrabold text-white shadow-[0_5px_12px_rgba(37,99,235,0.2)] transition-colors hover:bg-blue-600 active:border-b-2 disabled:opacity-50">
            {paying ? '…' : payLabel}<ArrowRight size={22} className="shrink-0" />
          </button>
        </div>
      </div>
    </motion.div>,
    document.body,
  );
}
