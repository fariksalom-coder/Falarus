import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

/**
 * TO'LIQ SHARTLAR VA DAROMAD KALKULYATORI — sahifadan chiqmasdan.
 *
 * `/oqituvchilarga/` — alohida statik to'plam (React marshrutiga kirmaydi).
 * Ilgari unga havola bosilsa, foydalanuvchi lendingni tark etardi. Endi o'sha
 * sahifa shu yerda ochiladi va ostida ro'yxatdan o'tish bilan kirish
 * tugmalari turadi.
 *
 * TO'LIQ EKRAN, ATAYLAB (2026-08-17). Ilgari bu chegaralangan oynacha edi
 * (`max-w-[1040px]`, `h-[min(94vh,940px)]`, atrofida orqa fon ko'rinib
 * turardi) — ichkaridagi sahifaning o'zi 1200px kenglikka mo'ljallangani
 * uchun u yana bir marta siqilib, "sahifa ichidagi sahifa" bo'lib qolardi.
 * Telefonda esa sarlavha va tugmalar qatoridan keyin iframe'ga juda oz joy
 * qolardi. Endi panel butun ekranni egallaydi.
 *
 * Nega `createPortal`: banner `overflow-hidden` va Framer Motion transformlari
 * ichida — ular `position: fixed` ni o'z ichiga qamab qo'yadi, panel esa butun
 * ekranni egallashi kerak.
 */

/* To'g'ridan-to'g'ri fayl: papka indeksiga tayanmaydi, har qanday serverda ochiladi. */
const TERMS_URL = '/oqituvchilarga/index.html';

/**
 * Statik sahifa RU/UZ/EN da ishlaydi — manzildagi `?lang=` bilan ochamiz,
 * shunda oynacha lendingdagi til bilan bir xil tilda chiqadi. Qolgan tillar
 * (qozoq, tojik, qirg'iz) uchun eng tushunarlisi — ruscha.
 */
const TERMS_LANG: Record<string, 'RU' | 'UZ' | 'EN'> = { uz: 'UZ', en: 'EN', ru: 'RU', kk: 'RU', tg: 'RU', ky: 'RU' };

export type TeacherTermsModalProps = {
  open: boolean;
  onClose: () => void;
  /** Lending tili — statik sahifa shu tilda ochiladi. */
  language: string;
  title: string;
  registerLabel: string;
  loginLabel: string;
};

export default function TeacherTermsModal({
  open,
  onClose,
  language,
  title,
  registerLabel,
  loginLabel,
}: TeacherTermsModalProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [open, onClose]);

  /*
    Statik sahifa ichidagi havolalar oynacha ichida ochilib qolmasin: u bir xil
    manbadan (same-origin) kelgani uchun hujjatiga kirish mumkin.

    Kuzatuvchi kerak: sahifa o'z mazmunini yuklangandan KEYIN chizadi, ya'ni
    `onLoad` paytida havolalar hali yo'q. Sahifa ichidagi `#` havolalari
    tegilmaydi — ular o'sha yerda ishlashi kerak.
  */
  const handleLoaded = () => {
    try {
      const doc = frameRef.current?.contentDocument;
      if (!doc) return;

      /*
        Sahifadagi tugmalar JS bilan ko'chiradi (masalan «Stать преподавателем»
        → `/teacher-register`). Bunday holda ilova oynacha ichida ochilib
        qolmasin: oynachani yopamiz va asosiy oynani o'sha manzilga olib
        boramiz.
      */
      const path = frameRef.current?.contentWindow?.location?.pathname ?? '';
      if (path && !path.startsWith('/oqituvchilarga')) {
        onClose();
        navigate(path);
        return;
      }

      const applyTargets = () => {
        doc.querySelectorAll('a[href]').forEach((link) => {
          const href = link.getAttribute('href') ?? '';
          if (href.startsWith('#')) return;
          if (link.getAttribute('target') !== '_top') link.setAttribute('target', '_top');
        });
      };
      applyTargets();
      observerRef.current?.disconnect();
      const observer = new MutationObserver(applyTargets);
      observer.observe(doc.documentElement, { childList: true, subtree: true });
      observerRef.current = observer;
    } catch {
      /* boshqa manbadan bo'lsa — hech narsa qilmaymiz */
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          /*
            `100dvh` — mobil brauzerlarda manzil paneli yig'ilganda `100vh`
            ekrandan baland bo'lib, pastdagi tugmalar ko'rinmay qolardi.
          */
          className="fixed inset-0 z-[120] flex h-[100dvh] flex-col bg-white"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ type: 'spring', stiffness: 280, damping: 30 }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div
            className="flex shrink-0 items-center gap-3 border-b border-[#E2E8F0] px-4 sm:px-6"
            style={{ paddingTop: 'max(12px, env(safe-area-inset-top))', paddingBottom: 12 }}
          >
            <h3 className="min-w-0 flex-1 truncate text-[15px] font-bold text-[#0B2A6B] sm:text-base">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Yopish"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#64748B] transition hover:bg-[#F1F5F9] hover:text-[#0F172A]"
            >
              <X className="h-5 w-5" strokeWidth={2.4} />
            </button>
          </div>

          <iframe
            ref={frameRef}
            src={`${TERMS_URL}?lang=${TERMS_LANG[language] ?? 'RU'}`}
            title={title}
            onLoad={handleLoaded}
            className="min-h-0 w-full flex-1 border-0"
          />

          <div
            className="flex shrink-0 flex-col gap-2.5 border-t border-[#E2E8F0] bg-white px-4 sm:mx-auto sm:w-full sm:max-w-[720px] sm:flex-row sm:px-6"
            style={{ paddingTop: 12, paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
          >
            <Link
              to="/teacher-register"
              className="inline-flex h-12 flex-1 items-center justify-center rounded-[16px] bg-[#1E3A8A] px-5 text-[15px] font-bold text-white transition hover:bg-[#16307a]"
            >
              {registerLabel}
            </Link>
            <Link
              to="/teacher-login"
              className="inline-flex h-12 flex-1 items-center justify-center rounded-[16px] border-2 border-[#1E3A8A] px-5 text-[15px] font-bold text-[#1E3A8A] transition hover:bg-[#1E3A8A]/5"
            >
              {loginLabel}
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
