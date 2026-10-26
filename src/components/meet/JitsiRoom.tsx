import { useEffect, useRef, useState, type MutableRefObject } from 'react';

/**
 * Platforma ichidagi video xona (Jitsi external API).
 * Kutubxona qo'shilmaydi — skript kerak bo'lganda dinamik yuklanadi.
 */

type JitsiApi = {
  dispose: () => void;
  addEventListener: (event: string, handler: (...args: any[]) => void) => void;
  executeCommand: (command: string, ...args: unknown[]) => void;
  isAudioMuted: () => Promise<boolean>;
  isVideoMuted: () => Promise<boolean>;
};

/** Tashqaridan boshqarish (dars xonasining o'z tugmalari — video kichik oynada bo'lganda). */
export type JitsiControls = { toggleAudio: () => void; toggleVideo: () => void; toggleChat: () => void };
/** `chatOpen`, `unread` — Jitsi chati (unda so'rovnomalar ham bor). */
export type JitsiMediaState = { joined: boolean; audioMuted: boolean; videoMuted: boolean; chatOpen: boolean; unread: number };
export const INITIAL_MEDIA: JitsiMediaState = { joined: false, audioMuted: true, videoMuted: false, chatOpen: false, unread: 0 };

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
  /**
   * Kichik oyna rejimi (darsda material ochiq, telefon): Jitsi'ning o'z tugmalari va o'z
   * kichik oynasi yashiriladi — mikrofon/kamerani xona o'z tugmalari bilan boshqaradi.
   */
  compact?: boolean;
  /**
   * Xona paroli (faqat dars ishtirokchilariga beriladi). Moderator bo'lgan tomon xonani shu bilan
   * qulflaydi, kech kirgan tomondan Jitsi so'raganda avtomatik kiritiladi.
   */
  roomPassword?: string | null;
  controlsRef?: MutableRefObject<JitsiControls | null>;
  onMediaState?: (state: JitsiMediaState) => void;
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
  compact = false,
  roomPassword = null,
  controlsRef,
  onMediaState,
}: JitsiRoomProps) {
  const viewer = mode === 'viewer';
  const containerRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<JitsiApi | null>(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [joined, setJoined] = useState(false);
  const filmstripVisible = useRef(true);
  const media = useRef<JitsiMediaState>(INITIAL_MEDIA);
  const mediaCb = useRef(onMediaState);
  mediaCb.current = onMediaState;
  const toolbar = viewer ? VIEWER_TOOLBAR : MEET_TOOLBAR;

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
            toolbarButtons: viewer ? VIEWER_TOOLBAR : MEET_TOOLBAR,
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
        const report = (patch: Partial<JitsiMediaState>) => {
          media.current = { ...media.current, ...patch };
          mediaCb.current?.(media.current);
        };
        let myId = '';
        const lock = () => { if (roomPassword) api.executeCommand('password', roomPassword); };
        api.addEventListener('passwordRequired', lock);
        api.addEventListener('participantRoleChanged', (e: { id: string; role: string }) => {
          if (e?.role === 'moderator' && (!myId || e.id === myId)) lock();
        });
        api.addEventListener('videoConferenceJoined', (e: { id?: string }) => {
          myId = String(e?.id ?? '');
          setJoined(true);
          void Promise.all([api.isAudioMuted(), api.isVideoMuted()])
            .then(([audioMuted, videoMuted]) => report({ joined: true, audioMuted, videoMuted }))
            .catch(() => report({ joined: true }));
        });
        api.addEventListener('audioMuteStatusChanged', (e: { muted: boolean }) => report({ audioMuted: Boolean(e?.muted) }));
        api.addEventListener('videoMuteStatusChanged', (e: { muted: boolean }) => report({ videoMuted: Boolean(e?.muted) }));
        api.addEventListener('chatUpdated', (e: { isOpen?: boolean; unreadCount?: number }) => {
          report({ chatOpen: Boolean(e?.isOpen), unread: Math.max(0, Number(e?.unreadCount) || 0) });
        });
        api.addEventListener('filmstripDisplayChanged', (e: { visible: boolean }) => { filmstripVisible.current = Boolean(e?.visible); });
        if (controlsRef) {
          controlsRef.current = {
            toggleAudio: () => api.executeCommand('toggleAudio'),
            toggleVideo: () => api.executeCommand('toggleVideo'),
            toggleChat: () => api.executeCommand('toggleChat'),
          };
        }
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
      if (controlsRef) controlsRef.current = null;
      setJoined(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain, roomName, viewer]);

  // Kichik oynada Jitsi tugmalari va o'z kichik oynasi (o'zingizning kamerangiz) xalaqit beradi.
  useEffect(() => {
    const api = apiRef.current;
    if (!api || !joined || viewer) return;
    api.executeCommand('overwriteConfig', { toolbarButtons: compact ? [] : toolbar });
    if (compact === filmstripVisible.current) {
      api.executeCommand('toggleFilmStrip');
      filmstripVisible.current = !compact;
    }
  }, [compact, joined, viewer, toolbar]);

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
