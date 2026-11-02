import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { CheckCircle2, Download, X } from 'lucide-react';
import { useLocale } from '../context/LocaleContext';
import { useAutoInstallPrompt, usePwaInstall } from '../hooks/usePwaInstall';
import { FalaRusLogoMark } from './FalaRusLogoMark';

/**
 * «Ilovani bosh ekranga chiqarish» — ilova ICHIDAGI o'rnatish tugmasi.
 *
 * Nega kerak: brauzerning o'z «bosh ekranga qo'shish» menyusi hamma telefonda
 * ham ko'rinmaydi (iOS'da faqat Safari'da, ba'zi Android brauzerlarida esa
 * chuqur menyuda). Shuning uchun ilovaning o'zida doimiy tugma turadi.
 *
 * Ikki xil yo'l:
 *   - Android/Chrome/Edge — `beforeinstallprompt` ushlangan bo'lsa, tugma
 *     TIZIM so'rovini (ruxsat oynasini) chaqiradi;
 *   - iOS va boshqa brauzerlar — dasturiy API yo'q, shuning uchun qadamma-qadam
 *     ko'rsatma oynasi ochiladi.
 * Ilova allaqachon o'rnatilgan (standalone) bo'lsa — hech nima ko'rsatilmaydi.
 */

const DISMISS_KEY = 'install_card_hidden_until';
const DISMISS_MS = 1000 * 60 * 60 * 24 * 7;

function isDismissed(): boolean {
  try {
    const until = Number(window.localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(until) && until > Date.now();
  } catch {
    return false;
  }
}

function rememberDismiss(): void {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_MS));
  } catch {
    /* localStorage yopiq bo'lsa ham kartochka ishlayveradi */
  }
}

/** Qadamma-qadam ko'rsatma — iOS va API'siz brauzerlar uchun. */
export function InstallGuideModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLocale();
  const { platform } = usePwaInstall();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const intro =
    platform === 'ios'
      ? t('install.guideIosIntro')
      : platform === 'android'
        ? t('install.guideAndroidIntro')
        : t('install.guideDesktopIntro');

  const steps =
    platform === 'ios'
      ? [t('install.guideIosStep1'), t('install.guideIosStep2'), t('install.guideIosStep3')]
      : platform === 'android'
        ? [
            t('install.guideAndroidStep1'),
            t('install.guideAndroidStep2'),
            t('install.guideAndroidStep3'),
          ]
        : [t('install.guideDesktopStep1'), t('install.guideDesktopStep2')];

  /*
   * PORTAL SHART: kartochka animatsiyali konteyner ichida turadi, u esa yangi
   * stacking kontekst yaratadi — shu sababli modal `z-[130]` bo'lsa ham pastki
   * navigatsiya (z-50) ostida qolib ketardi. `document.body` ga chiqaramiz.
   */
  return createPortal(
    <div
      className="fixed inset-0 z-[130] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-guide-title"
        className="w-full max-w-md rounded-t-[24px] border border-app-border bg-app-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-app-card sm:rounded-[24px] sm:pb-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <FalaRusLogoMark size={40} />
            <h2 id="install-guide-title" className="text-lg font-extrabold text-app-text">
              {t('install.guideTitle')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-app-icon-bg text-app-icon-fg"
            aria-label={t('install.close')}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <p className="text-sm font-semibold text-app-text-muted">{intro}</p>

        <ol className="mt-4 space-y-3">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-app-primary/10 text-[13px] font-black text-app-primary">
                {i + 1}
              </span>
              <span className="pt-0.5 text-[14px] font-semibold leading-snug text-app-text">
                {step}
              </span>
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 min-h-[44px] w-full rounded-2xl bg-app-primary px-5 py-3 text-[15px] font-black text-white active:scale-[0.99]"
        >
          {t('install.close')}
        </button>
      </motion.div>
    </div>,
    document.body,
  );
}

type Props = {
  /** Profil sahifasidagi qator kabi — kartochkasiz, faqat oyna boshqaruvi. */
  className?: string;
};

export default function InstallAppCard({ className = '' }: Props) {
  const { t } = useLocale();
  const { isInstalled, promptInstall } = usePwaInstall();
  const [hidden, setHidden] = useState(() => isDismissed());
  const [guideOpen, setGuideOpen] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);
  const [note, setNote] = useState('');

  const handleInstall = useCallback(async () => {
    setNote('');
    const outcome = await promptInstall();
    if (outcome === 'accepted') {
      setJustInstalled(true);
      return;
    }
    if (outcome === 'dismissed') {
      // Tizim so'rovi rad etildi — hodisa bir martalik, keyingi bosishda
      // qo'lda qo'shish ko'rsatmasini beramiz.
      setNote(t('install.dismissedHint'));
      return;
    }
    setGuideOpen(true);
  }, [promptInstall, t]);

  const dismiss = useCallback(() => {
    setHidden(true);
    rememberDismiss();
  }, []);

  const openGuide = useCallback(() => setGuideOpen(true), []);
  const markInstalled = useCallback(() => setJustInstalled(true), []);

  /*
   * «Avtomatik»: foydalanuvchi tugmani qidirmasin — ilova ochilgach, birinchi
   * tegishida tizim oynasi o'zi chiqadi. Kartochka ko'rinib turgandagina
   * ishlaydi (yopilgan yoki o'rnatilgan bo'lsa — yo'q).
   */
  useAutoInstallPrompt(!hidden && !isInstalled, openGuide, markInstalled);

  if (isInstalled && !justInstalled) return null;

  if (justInstalled) {
    return (
      <div className={`px-4 pt-3 ${className}`}>
        <div className="flex items-center gap-3 rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3.5">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" aria-hidden />
          <p className="text-[15px] font-black text-emerald-900">{t('install.installed')}</p>
        </div>
      </div>
    );
  }

  if (hidden) return null;

  return (
    <>
      <InstallGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className={`px-4 pt-3 ${className}`}
      >
        {/*
          Ikki qator: matn 375px ekranda ham kesilmasin (bir qatorda tugma
          bilan yonma-yon turganda «Ilovani bosh …» bo'lib qirqilardi).
        */}
        <div className="relative rounded-[22px] bg-[#0B2A6B] p-4 shadow-[0_12px_28px_-12px_rgba(11,42,107,0.55)]">
          <button
            type="button"
            onClick={dismiss}
            aria-label={t('install.dismiss')}
            className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full text-white/55 active:scale-95"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>

          <div className="flex items-center gap-3 pr-9">
            <FalaRusLogoMark size={40} className="shrink-0 ring-1 ring-white/20" />
            <div className="min-w-0 flex-1">
              <p className="text-[14.5px] font-extrabold leading-tight text-white">
                {t('install.cardTitle')}
              </p>
              <p className="mt-1 text-[12px] font-semibold leading-snug text-white/75">
                {note || t('install.cardSubtitle')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleInstall}
            className="mt-3.5 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white text-[14px] font-black text-[#0B2A6B] active:scale-[0.99]"
          >
            <Download className="h-4 w-4" aria-hidden />
            {t('install.action')}
          </button>
        </div>
      </motion.div>
    </>
  );
}
