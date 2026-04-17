import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { apiUrl } from '../api';

type Tariff = {
  id: '1_oy' | '3_oy' | '12_oy';
  label: string;
  price: string;
};

type ModalStep = 'closed' | 'tariff' | 'payment' | 'success';

const TARIFS: Tariff[] = [
  { id: '1_oy', label: "1 oy", price: "99 000 so'm" },
  { id: '3_oy', label: "3 oy", price: "199 000 so'm" },
  { id: '12_oy', label: "12 oy", price: "299 000 so'm" },
];

const YOUTUBE_VIDEO_ID = '-pCrTpNtfBU';
const REGISTRATION_URL = 'https://www.falarus.uz/register';
const ADMIN_TELEGRAM_URL = 'https://t.me/farmon_creator';
const COUNTDOWN_SECONDS = 20 * 60;
// 16:30 from video start = 990 seconds.
const CTA_REVEAL_AT_SECONDS = 16 * 60 + 30;
const STORAGE_DEADLINE_KEY = 'fossils_offer_deadline';
const STORAGE_WATCH_KEY = 'fossils_watch_seconds';

type YoutubePlayer = {
  getCurrentTime: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        options: {
          events?: {
            onReady?: () => void;
            onStateChange?: (event: { data: number }) => void;
          };
        }
      ) => YoutubePlayer;
      PlayerState?: {
        PLAYING: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

function formatCountdown(secondsLeft: number): string {
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function FossilsLandingPage() {
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [watchSeconds, setWatchSeconds] = useState(0);
  const [modalStep, setModalStep] = useState<ModalStep>('closed');
  const [selectedTariff, setSelectedTariff] = useState<Tariff | null>(null);
  const [phone, setPhone] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [playerReady, setPlayerReady] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);
  const playerRef = useRef<YoutubePlayer | null>(null);
  const maxWatchedRef = useRef(0);
  const ctaFiredRef = useRef(false);
  const trackingTimerRef = useRef<number | null>(null);

  // Persist countdown deadline so page refresh does not reset urgency timer.
  useEffect(() => {
    const now = Date.now();
    const savedDeadline = Number(localStorage.getItem(STORAGE_DEADLINE_KEY) ?? 0);
    const deadline = savedDeadline > now ? savedDeadline : now + COUNTDOWN_SECONDS * 1000;
    localStorage.setItem(STORAGE_DEADLINE_KEY, String(deadline));

    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(left);
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Restore watch progress so refresh does not reset purchase progress.
  useEffect(() => {
    const savedWatch = Number(localStorage.getItem(STORAGE_WATCH_KEY) ?? 0);
    if (Number.isFinite(savedWatch) && savedWatch > 0) {
      setWatchSeconds(savedWatch);
      maxWatchedRef.current = savedWatch;
      if (savedWatch >= CTA_REVEAL_AT_SECONDS) {
        ctaFiredRef.current = true;
        setCtaVisible(true);
      }
    }
  }, []);

  // YouTube API guard: users can press seek, but we snap them back to watched point.
  useEffect(() => {
    const loadApi = () =>
      new Promise<void>((resolve) => {
        if (window.YT?.Player) return resolve();
        const existing = document.getElementById('youtube-iframe-api');
        if (!existing) {
          const script = document.createElement('script');
          script.id = 'youtube-iframe-api';
          script.src = 'https://www.youtube.com/iframe_api';
          document.body.appendChild(script);
        }
        const prevReady = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          prevReady?.();
          resolve();
        };
      });

    const startTracking = () => {
      if (trackingTimerRef.current != null) window.clearInterval(trackingTimerRef.current);
      trackingTimerRef.current = window.setInterval(() => {
        const player = playerRef.current;
        if (!player) return;
        const current = Math.floor(player.getCurrentTime());
        const allowed = maxWatchedRef.current + 2;

        // Fire once at 16:30 or later (including direct jump to 16:30).
        if (!ctaFiredRef.current && current >= CTA_REVEAL_AT_SECONDS) {
          ctaFiredRef.current = true;
          setCtaVisible(true);
        }

        if (current > allowed) {
          player.seekTo(maxWatchedRef.current, true);
          return;
        }

        if (current > maxWatchedRef.current) {
          maxWatchedRef.current = current;
          setWatchSeconds(current);
          localStorage.setItem(STORAGE_WATCH_KEY, String(current));
        }
      }, 600);
    };

    const stopTracking = () => {
      if (trackingTimerRef.current != null) {
        window.clearInterval(trackingTimerRef.current);
        trackingTimerRef.current = null;
      }
    };

    let unmounted = false;
    void loadApi().then(() => {
      if (unmounted || !window.YT?.Player) return;
      playerRef.current = new window.YT.Player('fossils-youtube-player', {
        events: {
          onReady: () => setPlayerReady(true),
          onStateChange: (event) => {
            const playing = window.YT?.PlayerState?.PLAYING;
            if (typeof playing === 'number' && event.data === playing) {
              startTracking();
            } else {
              stopTracking();
            }
          },
        },
      });
    });

    return () => {
      unmounted = true;
      stopTracking();
    };
  }, []);

  const canShowPurchaseButton = ctaVisible;
  const timerLabel = useMemo(() => formatCountdown(secondsLeft), [secondsLeft]);

  const openTariffModal = () => {
    window.location.href = '/fossils/checkout';
  };

  const closeModal = () => {
    setError('');
    setPhone('');
    setReceipt(null);
    setIsSubmitting(false);
    setModalStep('closed');
  };

  const handleSubmitPayment = async () => {
    if (!selectedTariff) {
      setError('Tarif tanlanmagan');
      return;
    }
    if (!phone.trim()) {
      setError('Telefon raqamini kiriting');
      return;
    }
    if (!receipt) {
      setError('Chek rasmini yuklang');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('phone', phone.trim());
      formData.append('tariff', selectedTariff.label);
      formData.append('receipt', receipt);

      const response = await fetch(apiUrl('/api/payment'), {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? 'To‘lov yuborishda xatolik');
      }

      setModalStep('success');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Xatolik yuz berdi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-5xl px-4 pb-14 pt-8 sm:px-6 sm:pt-12">
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-3xl font-extrabold leading-tight sm:text-5xl"
        >
          Rus tilida tez gapirishni boshlash sirlari
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mt-8 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-[0_20px_54px_rgba(15,23,42,0.65)]"
        >
          {/* Responsive 16:9 video block for mobile and desktop. */}
          <div className="relative aspect-video w-full">
            <iframe
              id="fossils-youtube-player"
              src={`https://www.youtube-nocookie.com/embed/${YOUTUBE_VIDEO_ID}?enablejsapi=1&rel=0&modestbranding=1&playsinline=1&controls=1&disablekb=1`}
              title="FalaRus video presentation"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        </motion.div>

        {!playerReady && (
          <p className="mt-3 text-center text-xs text-slate-400">Video yuklanmoqda...</p>
        )}

        {!canShowPurchaseButton && (
          <p className="mt-4 text-center text-sm font-semibold text-slate-300 sm:text-base">
            Videoni oxirigacha ko'rsangiz tarqatma materiallarni BEPUL olasiz
          </p>
        )}

        <div className="mt-8 flex justify-center">
          {!canShowPurchaseButton ? (
            <div className="h-[52px]" />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={openTariffModal}
                className="rounded-2xl bg-blue-600 px-8 py-4 text-lg font-bold text-white shadow-[0_16px_34px_rgba(37,99,235,0.42)] transition hover:bg-blue-500"
              >
                Kursni sotib olish
              </motion.button>
              <a
                href={ADMIN_TELEGRAM_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl border border-slate-600 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
              >
                Administrator bilan bog'lanish
              </a>
            </div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="mx-auto mt-7 max-w-md rounded-2xl border border-slate-700/40 bg-slate-900/45 px-4 py-2.5 text-center"
        >
          <div className="text-xl font-bold tracking-tight text-blue-300/85">{timerLabel}</div>
          <p className="mt-1 text-xs font-medium text-slate-400 sm:text-sm">
            daqiqadan so'ng videoni ko'ra olmaysiz
          </p>
        </motion.div>
      </div>

      <AnimatePresence>
        {modalStep !== 'closed' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              className="relative w-full max-w-lg rounded-3xl border border-slate-700 bg-white p-6 text-slate-900 shadow-2xl"
            >
              <button
                type="button"
                onClick={closeModal}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-xl font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Yopish"
              >
                ×
              </button>

              {modalStep === 'tariff' && (
                <>
                  <h2 className="text-2xl font-extrabold">Tarifni tanlang</h2>
                  <p className="mt-1 text-sm text-slate-500">O‘zingizga mos rejani tanlab davom eting</p>
                  <div className="mt-5 space-y-3">
                    {TARIFS.map((tariff) => (
                      <button
                        key={tariff.id}
                        type="button"
                        onClick={() => setSelectedTariff(tariff)}
                        className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                          selectedTariff?.id === tariff.id
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className="font-semibold">{tariff.label}</span>
                        <span className="font-bold text-blue-700">{tariff.price}</span>
                      </button>
                    ))}
                  </div>
                  {selectedTariff && (
                    <p className="mt-4 rounded-xl bg-slate-100 px-3 py-2 text-sm">
                      Tanlangan tarif: <strong>{selectedTariff.label}</strong> —{' '}
                      <strong>{selectedTariff.price}</strong>
                    </p>
                  )}
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() => selectedTariff && setModalStep('payment')}
                      className="w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={!selectedTariff}
                    >
                      Sotib olish
                    </button>
                  </div>
                </>
              )}

              {modalStep === 'payment' && (
                <>
                  <h2 className="text-2xl font-extrabold">To‘lov ma’lumotlari</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Karta raqami: <span className="font-bold text-slate-900">8600 1234 5678 9012</span>
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Tarif summasini o‘tkazing, so‘ng chekning rasmini yuklang.
                  </p>

                  <div className="mt-4 rounded-xl bg-blue-50 px-3 py-2 text-sm">
                    Tanlangan: <strong>{selectedTariff?.label}</strong> —{' '}
                    <strong>{selectedTariff?.price}</strong>
                  </div>

                  <label className="mt-4 block text-sm font-semibold">Telefon raqami</label>
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+998 __ ___ __ __"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500"
                  />

                  <label className="mt-4 block text-sm font-semibold">Chek (rasm)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => setReceipt(event.target.files?.[0] ?? null)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />

                  {error && (
                    <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{error}</p>
                  )}

                  <div className="mt-6 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setModalStep('tariff')}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 font-semibold"
                    >
                      Orqaga
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitPayment}
                      disabled={isSubmitting}
                      className="w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmitting ? 'Yuborilmoqda...' : 'Yuborish'}
                    </button>
                  </div>
                </>
              )}

              {modalStep === 'success' && (
                <div className="text-center">
                  <h2 className="text-2xl font-extrabold">To‘lovingiz tekshirilmoqda</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Tez orada siz bilan bog‘lanamiz
                  </p>
                  <a
                    href={REGISTRATION_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 font-bold text-white"
                  >
                    Platformaga kirish
                  </a>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-semibold"
                  >
                    Yopish
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
