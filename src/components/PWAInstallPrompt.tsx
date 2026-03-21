import { useState, useEffect } from 'react';
import { FalaRusLogoMark } from './FalaRusLogoMark';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<{ outcome: 'accepted' | 'dismissed' }>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa_install_prompt_hidden_until';
const DISMISS_MS = 1000 * 60 * 60 * 24 * 3;

function isStandaloneMode(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isMobileDevice(): boolean {
  const ua = window.navigator.userAgent.toLowerCase();
  return /android|iphone|ipad|ipod|mobile/.test(ua);
}

function isIosDevice(): boolean {
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

function isDismissedRecently(): boolean {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const until = Number(raw);
    return Number.isFinite(until) && until > Date.now();
  } catch {
    return false;
  }
}

function rememberDismiss(): void {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_MS));
  } catch {
    // ignore
  }
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [iosFallback, setIosFallback] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isMobileDevice()) return;
    if (isStandaloneMode()) {
      setInstalled(true);
      return;
    }
    if (isDismissedRecently()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIosFallback(false);
      setShowPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const installedHandler = () => {
      setInstalled(true);
      setShowPrompt(false);
      setShowIosHelp(false);
    };
    window.addEventListener('appinstalled', installedHandler);

    if (isIosDevice()) {
      setIosFallback(true);
      setShowPrompt(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setShowPrompt(false);
      setDeferredPrompt(null);
      return;
    }
    if (iosFallback) {
      setShowIosHelp((prev) => !prev);
    }
  };

  const dismiss = () => {
    setShowPrompt(false);
    setShowIosHelp(false);
    rememberDismiss();
  };

  if (installed || !showPrompt || (!deferredPrompt && !iosFallback)) return null;

  return (
    <div className="fixed bottom-20 left-3 right-3 z-40 mx-auto max-w-md rounded-2xl border border-white/10 bg-slate-900/95 p-4 text-white shadow-[0_20px_50px_rgba(15,23,42,0.38)] backdrop-blur">
      <div className="flex items-center gap-3">
        <FalaRusLogoMark size={44} className="ring-2 ring-white/20" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">FalaRus ilovasini o‘rnating</p>
          <p className="mt-0.5 text-xs text-slate-300">
            {iosFallback
              ? 'Bosh ekranga qo‘shib, ilova kabi oching'
              : 'Bosh ekranga qo‘shing va tezroq oching'}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 px-2 py-1 text-xs text-slate-400 transition-colors hover:text-white"
        >
          Yopish
        </button>
      </div>

      {showIosHelp ? (
        <div className="mt-3 rounded-xl bg-white/5 px-3 py-3 text-xs text-slate-200">
          Safari menyusini oching, keyin <span className="font-semibold text-white">Share</span> va{' '}
          <span className="font-semibold text-white">Add to Home Screen</span> ni tanlang.
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleInstall}
          className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
        >
          {iosFallback ? 'Qanday o‘rnatiladi?' : 'O‘rnatish'}
        </button>
      </div>
    </div>
  );
}
