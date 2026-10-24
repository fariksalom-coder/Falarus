import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Bell, Pause, Play, X } from 'lucide-react';
import { resolveAssetUrl } from '../../api';
import { getNotifications, markNotification, type AppNotification } from '../../api/notifications';
import { startNativePush } from '../../native/pushNotifications';
import { useAuth } from '../../context/AuthContext';
import { appMainBottomOffsetCss } from '../../constants/appLayout';

/**
 * OVOZLI BILDIRISHNOMA — ilova bo'ylab, pastki menyu ustida.
 *
 * Ko'rilmagan xabar (oxirgi 3 kun) bo'lsa kartochka chiqadi va ovozi o'zi
 * o'ynaydi. Brauzer avtomatik ovozni bloklasa (foydalanuvchi hali sahifaga
 * tegmagan) — «Tinglash» tugmasi qoladi. Push bosilib ilova ochilganda ham
 * shu karta chiqadi: ovoz shu yerda eshitiladi.
 *
 * Qachon tekshiriladi: kirganda, ilovaga qaytganda, sahifa almashganda
 * (20 soniyada ko'pi bilan bir marta) va service worker «bildirishnoma»
 * xabarini yuborganda.
 */
const RECENT_MS = 3 * 86_400_000;
const THROTTLE_MS = 20_000;

export default function VoiceNotificationCard() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [item, setItem] = useState<AppNotification | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastFetch = useRef(0);
  const shownId = useRef<number | null>(null);

  const load = useCallback(async (force = false) => {
    if (!token) return;
    if (!force && Date.now() - lastFetch.current < THROTTLE_MS) return;
    lastFetch.current = Date.now();
    try {
      const { items } = await getNotifications(token);
      const next = items.find((n) => !n.seen_at && Date.now() - Date.parse(n.created_at) < RECENT_MS) ?? null;
      setItem((cur) => (cur && next && cur.id === next.id ? cur : next));
    } catch {
      /* fon ishi — jim */
    }
  }, [token]);

  // Mobil ilova: nativ push plagini bo'lsa token yoziladi (hozirgi versiyada jim o'tadi).
  useEffect(() => {
    if (token) void startNativePush(token, (url) => navigate(url));
  }, [token, navigate]);

  useEffect(() => { void load(true); }, [load]);
  useEffect(() => { void load(); }, [pathname, load]);
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') void load(true); };
    const onSw = (e: MessageEvent) => { if (e.data?.turi === 'bildirishnoma') void load(true); };
    document.addEventListener('visibilitychange', onVisible);
    navigator.serviceWorker?.addEventListener('message', onSw);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      navigator.serviceWorker?.removeEventListener('message', onSw);
    };
  }, [load]);

  // Yangi xabar — ovozni tayyorlab, avtomatik chalishga urinamiz.
  useEffect(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlaying(false);
    setProgress(0);
    if (!item || shownId.current === item.id) return;
    shownId.current = item.id;
    const src = resolveAssetUrl(item.audio_url);
    if (!src) return;
    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.onplay = () => setPlaying(true);
    audio.onpause = () => setPlaying(false);
    audio.onended = () => { setPlaying(false); setProgress(1); };
    audio.ontimeupdate = () => setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
    audioRef.current = audio;
    void audio.play().catch(() => setPlaying(false));
    return () => audio.pause();
  }, [item]);

  if (!token) return null;

  const close = () => {
    if (!item) return;
    audioRef.current?.pause();
    void markNotification(token, item.id, 'seen');
    setItem(null);
  };
  const open = () => {
    if (!item) return;
    void markNotification(token, item.id, 'opened');
    const url = item.url.startsWith('/') ? item.url : '/';
    setItem(null);
    audioRef.current?.pause();
    if (url !== pathname) navigate(url);
  };
  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) { if (a.ended) a.currentTime = 0; void a.play().catch(() => undefined); } else a.pause();
  };

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          key={item.id}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className="fixed inset-x-3 z-[60] mx-auto max-w-md"
          style={{ bottom: `calc(${appMainBottomOffsetCss()} + 12px)` }}
        >
          <div className="rounded-[24px] border border-blue-100 bg-white p-4 shadow-[0_18px_44px_rgba(37,99,235,0.22)]">
            <div className="flex items-start gap-3">
              {item.audio_url ? (
                <button
                  type="button"
                  onClick={toggle}
                  aria-label={playing ? 'To‘xtatish' : 'Tinglash'}
                  className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-white transition active:scale-95"
                >
                  <svg className="absolute inset-0 -rotate-90" viewBox="0 0 48 48" aria-hidden>
                    <circle cx="24" cy="24" r="22" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="3" />
                    <circle cx="24" cy="24" r="22" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 22} strokeDashoffset={2 * Math.PI * 22 * (1 - progress)} />
                  </svg>
                  {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
                </button>
              ) : (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#2563EB]"><Bell className="h-5 w-5" /></span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold leading-snug text-[#0F172A]">{item.title}</p>
                <p className="mt-0.5 text-sm leading-snug text-[#64748B]">{item.body}</p>
              </div>
              <button type="button" onClick={close} aria-label="Yopish" className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#94A3B8] transition hover:bg-slate-100 active:scale-95">
                <X className="h-5 w-5" />
              </button>
            </div>
            <button type="button" onClick={open} className="mt-3 h-11 w-full rounded-2xl bg-[#2563EB] text-sm font-bold text-white transition hover:bg-[#1D4ED8] active:scale-[0.98]">
              Ochish
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
