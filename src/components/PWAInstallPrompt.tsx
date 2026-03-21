import { useState, useEffect } from 'react';
import { FalaRusLogoMark } from './FalaRusLogoMark';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<{ outcome: 'accepted' | 'dismissed' }>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const installedHandler = () => setInstalled(true);
    window.addEventListener('appinstalled', installedHandler);

    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowPrompt(false);
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setShowPrompt(false);
  };

  if (installed || !showPrompt || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 mx-auto max-w-md rounded-2xl bg-slate-800 text-white shadow-lg p-4 flex items-center gap-3">
      <FalaRusLogoMark size={44} className="ring-2 ring-white/20" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">Falarus ilovasini o‘rnating</p>
        <p className="text-slate-300 text-xs mt-0.5">Uy ekraniga qo‘shing va tezroq oching</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={dismiss}
          className="px-3 py-1.5 text-slate-400 hover:text-white text-sm"
        >
          Yopish
        </button>
        <button
          type="button"
          onClick={handleInstall}
          className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-medium text-sm"
        >
          O‘rnatish
        </button>
      </div>
    </div>
  );
}
