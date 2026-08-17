import { useEffect, useRef, useState } from 'react';

/**
 * Platforma ichidagi video xona (Jitsi external API).
 * Kutubxona qo'shilmaydi — skript kerak bo'lganda dinamik yuklanadi.
 */

type JitsiApi = {
  dispose: () => void;
  addEventListener: (event: string, handler: (...args: unknown[]) => void) => void;
  executeCommand: (command: string, ...args: unknown[]) => void;
};

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => JitsiApi;
  }
}

const scriptPromises = new Map<string, Promise<void>>();

function loadJitsiScript(domain: string): Promise<void> {
  const src = `https://${domain}/external_api.js`;
  const cached = scriptPromises.get(src);
  if (cached) return cached;

  const promise = new Promise<void>((resolve, reject) => {
    if (window.JitsiMeetExternalAPI) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Video xizmati yuklanmadi')));
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Video xizmati yuklanmadi'));
    document.head.appendChild(script);
  });

  scriptPromises.set(src, promise);
  return promise;
}

export type JitsiRoomProps = {
  domain: string;
  roomName: string;
  displayName: string;
  email?: string | null;
  /** O'qituvchi — mikrofon yoqilgan holda kiradi. */
  isModerator?: boolean;
  subject?: string;
  onLeave?: () => void;
  /**
   * `viewer` — jonli efir tomoshabini (vebinar).
   *
   * Mikrofon, kamera va ekran ulashish tugmalari OLIB TASHLANADI: efirda
   * yuzlab odam bo'lishi mumkin va har biri o'zini yoqib yuborsa, ham server
   * ko'tara olmaydi, ham gapiruvchi eshitilmay qoladi. So'z berish support
   * (moderator) qo'lida qoladi, savol esa yozma chat orqali beriladi.
   *
   * Bu chegara BRAUZER tomonida: xona nomini bilgan odam Jitsi sahifasini
   * to'g'ridan-to'g'ri ochib mikrofonini yoqishi mumkin. U moderator
   * bo'lmaydi, ya'ni support uni o'chira yoki chiqarib yubora oladi.
   */
  mode?: 'meet' | 'viewer';
};

/** Efir tomoshabinida ovoz/kamera tugmalari yo'q — faqat kuzatish va chat. */
const VIEWER_TOOLBAR = ['chat', 'raisehand', 'tileview', 'fullscreen', 'settings', 'hangup'];

const MEET_TOOLBAR = [
  'microphone',
  'camera',
  'desktop',
  'chat',
  'raisehand',
  'tileview',
  'fullscreen',
  'settings',
  'hangup',
];

export default function JitsiRoom({
  domain,
  roomName,
  displayName,
  email,
  isModerator = false,
  subject,
  onLeave,
  mode = 'meet',
}: JitsiRoomProps) {
  const viewer = mode === 'viewer';
  const containerRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<JitsiApi | null>(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let disposed = false;

    void loadJitsiScript(domain)
      .then(() => {
        if (disposed || !containerRef.current || !window.JitsiMeetExternalAPI) return;
        const api = new window.JitsiMeetExternalAPI(domain, {
          roomName,
          parentNode: containerRef.current,
          width: '100%',
          height: '100%',
          userInfo: { displayName, email: email ?? undefined },
          configOverwrite: {
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            startWithAudioMuted: viewer || !isModerator,
            startWithVideoMuted: viewer,
            defaultLanguage: 'ru',
            subject: subject ?? '',
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_BRAND_WATERMARK: false,
            SHOW_POWERED_BY: false,
            MOBILE_APP_PROMO: false,
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            TOOLBAR_BUTTONS: viewer ? VIEWER_TOOLBAR : MEET_TOOLBAR,
          },
        });
        apiRef.current = api;
        setReady(true);
        if (onLeave) {
          api.addEventListener('readyToClose', onLeave);
          api.addEventListener('videoConferenceLeft', onLeave);
        }
      })
      .catch((e: unknown) => {
        if (!disposed) setError(e instanceof Error ? e.message : 'Video xizmati yuklanmadi');
      });

    return () => {
      disposed = true;
      apiRef.current?.dispose();
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain, roomName, viewer]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="max-w-sm text-center text-sm font-semibold text-app-danger">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {!ready ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0C1526]">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-white/70" />
        </div>
      ) : null}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
