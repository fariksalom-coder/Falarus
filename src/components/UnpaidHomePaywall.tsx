/**
 * Obunasiz foydalanuvchi uchun bosh sahifa: video + oxirgi 1:10 da tariflar.
 *
 * Video: `public/videos/paywall-intro.mp4`. Tezlatish tugmasi video ostida.
 * Oldinga o‘tkazish taqiqlangan (faqat orqaga).
 * 3 oy tarifi oxirgi 52.5 soniyada yashil bo‘ladi.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Gauge, Gift, Play, Sparkles, Volume2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { openRahmatCheckout } from '../api/rahmat';
import { completeWelcomeVideo, getWelcomeVideoOffer, type WelcomeVideoOfferState } from '../api/welcomeVideoOffer';
import { WELCOME_VIDEO_BONUS_REVEAL_SECONDS, WELCOME_VIDEO_OFFER_MS } from '../../shared/welcomeVideoOffer';
import {
  formatRubAmount,
  formatRussianTariffUzsMing,
  RUSSIAN_TARIFF_PLANS_RUB,
  type RussianTariffCode,
} from '../../shared/russianTariffs';

/** Tariflar shu qolgan vaqtda chiqadi (1 daqiqa 10 soniya). */
const TARIFF_REMAINING_SEC = 70;

/** 3 oylik tarif shu qolgan vaqtda yashil bo‘ladi (52.5 s). */
const THREE_MONTH_GREEN_REMAINING_SEC = 52.5;

/** Registration sequence assets: intro, tariffs, then the one-time bonus explanation. */
const WELCOME_VIDEO_SOURCES = ['/videos/welcome-intro.mp4', '/videos/welcome-tariffs.mp4', '/videos/welcome-bonus.mp4'] as const;
// Rounded-up durations keep the promise visible even while the next clip is buffering.
const WELCOME_VIDEO_DURATIONS_SECONDS = [18, 222, 61] as const;
export const PAYWALL_VIDEO_SRC = WELCOME_VIDEO_SOURCES[1];

/**
 * Video hali tayyor emas — bo‘sh pleer ko‘rsatiladi.
 * Fayl qo‘yilgach `true` qiling.
 */
export const PAYWALL_VIDEO_READY = true;

const SPEED_STEPS = [1, 1.5, 2, 2.5] as const;
type SpeedStep = (typeof SPEED_STEPS)[number];
const BG = '#0B1220';
const THREE_MONTH_PLAN = RUSSIAN_TARIFF_PLANS_RUB.find((plan) => plan.code === 'three_month')!;

function formatSpeed(rate: SpeedStep): string {
  return rate === 1 ? '1×' : rate === 1.5 ? '1.5×' : rate === 2 ? '2×' : '2.5×';
}

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

export default function UnpaidHomePaywall() {
  const { token } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showTariffs, setShowTariffs] = useState(false);
  const [flowReady, setFlowReady] = useState(false);
  const [flowMode, setFlowMode] = useState<WelcomeVideoOfferState['mode']>('standard');
  const [videoIndex, setVideoIndex] = useState(1);
  const [offerExpiresAt, setOfferExpiresAt] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [sequenceSecondsLeft, setSequenceSecondsLeft] = useState(0);
  const [bonusRevealed, setBonusRevealed] = useState(false);
  const [highlightThreeMonth, setHighlightThreeMonth] = useState(false);
  const [needsGesture, setNeedsGesture] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [buying, setBuying] = useState<RussianTariffCode | 'welcome_offer' | null>(null);
  const [speed, setSpeed] = useState<SpeedStep>(1);
  const speedRef = useRef(speed);
  speedRef.current = speed;
  /** Bitta marta start — StrictMode / canplay qayta chaqiruvlarini oldini oladi. */
  const playAttemptedRef = useRef(false);
  /** Eng uzoq ko‘rilgan nuqta — oldinga seek qilishni bloklash uchun. */
  const maxPlayedRef = useRef(0);
  const seekingClampRef = useRef(false);
  const sequenceRemainingRef = useRef<number | null>(null);
  const videoSource = flowMode === 'sequence' ? WELCOME_VIDEO_SOURCES[videoIndex] : flowMode === 'offer' ? WELCOME_VIDEO_SOURCES[2] : WELCOME_VIDEO_SOURCES[1];
  const bonusBeforeEnd = flowMode === 'sequence' && videoIndex === 2 && bonusRevealed;
  const showBonusOffer = bonusBeforeEnd || (flowMode === 'offer' && secondsLeft > 0);
  const displayedSeconds = bonusBeforeEnd ? WELCOME_VIDEO_OFFER_MS / 1000 : secondsLeft;

  const applyOfferState = (state: WelcomeVideoOfferState) => {
    setFlowMode(state.mode);
    setOfferExpiresAt(state.offerExpiresAt);
    if (state.offerExpiresAt) setSecondsLeft(Math.max(0, Math.ceil((Date.parse(state.offerExpiresAt) - Date.now()) / 1000)));
    if (state.mode === 'sequence' && state.nextVideoIndex != null) {
      setVideoIndex(state.nextVideoIndex);
      if (sequenceRemainingRef.current == null) {
        const remaining = WELCOME_VIDEO_DURATIONS_SECONDS.slice(state.nextVideoIndex).reduce((sum, value) => sum + value, 0);
        sequenceRemainingRef.current = remaining;
      }
    }
    else if (state.mode === 'offer') setVideoIndex(2);
    else setVideoIndex(1);
    if (state.mode === 'offer') setShowTariffs(true);
  };

  useEffect(() => {
    let cancelled = false;
    setBonusRevealed(false);
    if (!token) {
      setFlowMode('standard');
      setVideoIndex(1);
      setFlowReady(true);
      return;
    }
    void getWelcomeVideoOffer(token).then((state) => {
      if (!cancelled) applyOfferState(state);
    }).catch((error) => {
      console.error('[welcome-video-offer]', error);
      if (!cancelled) { setFlowMode('standard'); setVideoIndex(1); }
    }).finally(() => { if (!cancelled) setFlowReady(true); });
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    if (!offerExpiresAt || flowMode !== 'offer') return;
    const refresh = () => {
      const left = Math.max(0, Math.ceil((Date.parse(offerExpiresAt) - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) { setFlowMode('standard'); setOfferExpiresAt(null); }
    };
    refresh();
    const timer = window.setInterval(refresh, 1000);
    return () => window.clearInterval(timer);
  }, [offerExpiresAt, flowMode]);

  useEffect(() => {
    if (flowMode !== 'sequence') {
      setSequenceSecondsLeft(0);
      sequenceRemainingRef.current = null;
      return;
    }
    if (sequenceRemainingRef.current == null) {
      const remaining = WELCOME_VIDEO_DURATIONS_SECONDS.slice(videoIndex).reduce((sum, value) => sum + value, 0);
      sequenceRemainingRef.current = remaining;
    }
    let previous = performance.now();
    const refresh = () => {
      const now = performance.now();
      const elapsed = Math.max(0, (now - previous) / 1000);
      previous = now;
      const el = videoRef.current;
      // Playing consumes media time at the selected speed. Buffering or a
      // transition consumes wall-clock time so loading cannot add free time.
      const multiplier = el && !el.paused && !el.ended && el.readyState >= 2
        ? Math.max(0.25, el.playbackRate || speedRef.current)
        : 1;
      sequenceRemainingRef.current = Math.max(0, (sequenceRemainingRef.current ?? 0) - elapsed * multiplier);
      setSequenceSecondsLeft(Math.ceil(sequenceRemainingRef.current));
    };
    refresh();
    const timer = window.setInterval(refresh, 250);
    return () => window.clearInterval(timer);
  }, [flowMode, videoIndex]);

  const syncFromPlayback = useCallback(() => {
    const el = videoRef.current;
    if (!el || !Number.isFinite(el.duration) || el.duration <= 0) return;
    const remaining = el.duration - el.currentTime;
    if (flowMode === 'sequence' && videoIndex === 2 && el.currentTime >= WELCOME_VIDEO_BONUS_REVEAL_SECONDS) {
      setBonusRevealed(true);
    }
    const isTariffVideo = flowMode === 'standard' || (flowMode === 'sequence' && videoIndex === 1);
    if (isTariffVideo && remaining <= TARIFF_REMAINING_SEC) setShowTariffs(true);
    if (isTariffVideo) setHighlightThreeMonth(remaining <= THREE_MONTH_GREEN_REMAINING_SEC);
  }, [flowMode, videoIndex]);

  const setPlaybackSpeed = (next: SpeedStep) => {
    setSpeed(next);
    const el = videoRef.current;
    if (el) el.playbackRate = next;
  };

  /**
   * Kirishda avtomatik boshlash (faqat BIR marta):
   * 1) ovoz bilan play
   * 2) bloklansa — muted play, keyin unmute
   * 3) umuman bo‘lmasa — overlay
   */
  const tryAutoplay = useCallback(async () => {
    if (!PAYWALL_VIDEO_READY || !flowReady) return;
    const el = videoRef.current;
    if (!el) return;

    // Allaqachon ijro — qayta play() qilmaymiz (ikki ovoz chiqmasin).
    if (!el.paused && !el.ended) {
      setNeedsGesture(false);
      playAttemptedRef.current = true;
      return;
    }
    if (playAttemptedRef.current) return;
    playAttemptedRef.current = true;

    el.playbackRate = speedRef.current;
    try {
      el.muted = false;
      await el.play();
      setNeedsGesture(false);
      return;
    } catch {
      /* ovozli autoplay ko‘pincha bloklanadi */
    }
    try {
      el.muted = true;
      await el.play();
      setNeedsGesture(false);
      el.muted = false;
    } catch {
      // Keyingi urinishga ruxsat (overlay bosilganda).
      playAttemptedRef.current = false;
      setNeedsGesture(true);
    }
  }, [flowReady]);

  useEffect(() => {
    playAttemptedRef.current = false;
    maxPlayedRef.current = 0;
    const el = videoRef.current;
    void tryAutoplay();
    return () => {
      if (!el) return;
      try {
        el.pause();
      } catch {
        /* ignore */
      }
    };
  }, [tryAutoplay, flowReady]);

  useEffect(() => {
    if (!PAYWALL_VIDEO_READY || !flowReady) return;
    const el = videoRef.current;
    if (!el) return;
    let lockingRate = false;

    const clampForwardSeek = () => {
      if (seekingClampRef.current) return;
      const maxAllowed = maxPlayedRef.current;
      if (el.currentTime > maxAllowed + 0.35) {
        seekingClampRef.current = true;
        el.currentTime = maxAllowed;
        seekingClampRef.current = false;
      }
    };

    const onTime = () => {
      if (!el.seeking && !seekingClampRef.current) {
        maxPlayedRef.current = Math.max(maxPlayedRef.current, el.currentTime);
      }
      clampForwardSeek();
      syncFromPlayback();
    };
    const onSeeking = () => clampForwardSeek();
    const onSeeked = () => clampForwardSeek();
    const onMeta = () => {
      syncFromPlayback();
      void tryAutoplay();
    };
    const onCanPlay = () => {
      if (el.paused && !playAttemptedRef.current) void tryAutoplay();
    };
    const onEnded = () => {
      maxPlayedRef.current = Math.max(maxPlayedRef.current, el.duration || 0);
      if (flowMode === 'sequence' && token) {
        const finishedIndex = videoIndex;
        if (finishedIndex < 2) {
          maxPlayedRef.current = 0;
          playAttemptedRef.current = false;
          setNeedsGesture(false);
          setVideoIndex(finishedIndex + 1);
          if (finishedIndex === 1) { setShowTariffs(true); setHighlightThreeMonth(true); }
        }
        void completeWelcomeVideo(token, finishedIndex).then((state) => {
          if (finishedIndex === 2 || state.mode !== 'sequence') {
            applyOfferState(state);
            setShowTariffs(true);
            setHighlightThreeMonth(true);
          }
        }).catch((error) => {
          console.error('[welcome-video-offer/video-complete]', error);
          if (finishedIndex === 2) {
            setFlowMode('standard');
            setVideoIndex(1);
            setShowTariffs(true);
          }
        });
        return;
      }
      setShowTariffs(true);
      setHighlightThreeMonth(true);
    };
    // Brauzer playbackRate ni o‘zgartirib yubormasin.
    const onRate = () => {
      if (lockingRate) return;
      if (el.playbackRate !== speedRef.current) {
        lockingRate = true;
        el.playbackRate = speedRef.current;
        lockingRate = false;
      }
    };

    el.addEventListener('timeupdate', onTime);
    el.addEventListener('seeking', onSeeking);
    el.addEventListener('seeked', onSeeked);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('canplay', onCanPlay);
    el.addEventListener('ended', onEnded);
    el.addEventListener('ratechange', onRate);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('seeking', onSeeking);
      el.removeEventListener('seeked', onSeeked);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('canplay', onCanPlay);
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('ratechange', onRate);
    };
  }, [syncFromPlayback, tryAutoplay, flowReady, flowMode, videoIndex, token]);

  const startWithSound = async () => {
    const el = videoRef.current;
    if (!el) return;
    playAttemptedRef.current = true;
    el.muted = false;
    el.playbackRate = speedRef.current;
    try {
      await el.play();
      setNeedsGesture(false);
    } catch {
      playAttemptedRef.current = false;
      setNeedsGesture(true);
    }
  };

  const buy = async (tariffType: RussianTariffCode) => {
    if (!token || buying) return;
    setBuyError(null);
    setBuying(tariffType);
    try {
      await openRahmatCheckout({
        token,
        productCode: 'russian',
        tariffType,
      });
    } catch (e) {
      setBuyError(
        e instanceof Error
          ? e.message
          : "To‘lovni ochib bo‘lmadi. Qayta urinib ko‘ring.",
      );
    } finally {
      setBuying(null);
    }
  };

  const buyWelcomeOffer = async () => {
    if (!token || buying || !showBonusOffer) return;
    setBuyError(null);
    setBuying('welcome_offer');
    try {
      await openRahmatCheckout({
        token,
        productCode: 'russian',
        tariffType: 'three_month',
        welcomeOffer: true,
      });
    } catch (e) {
      setBuyError(e instanceof Error ? e.message : 'To‘lovni ochib bo‘lmadi. Qayta urinib ko‘ring.');
    } finally {
      setBuying(null);
    }
  };

  return (
    <div
      className="relative flex min-h-full w-full flex-1 flex-col"
      style={{ background: BG }}
    >
      <div
        className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col"
        style={{ background: BG }}
      >
        {/* Logo + platforma nomi — eng yuqorida */}
        <div className="flex items-center justify-center gap-2.5 px-4 pb-2 pt-4 sm:pt-5">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <img
              src="/landing/falarus-mark.svg"
              alt=""
              className="h-9 w-10 shrink-0 sm:h-10 sm:w-11"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
            <span className="text-[22px] font-extrabold leading-none tracking-tight text-white sm:text-[24px]">
              FalaRus
            </span>
          </Link>
        </div>

        {/* Ogohlantirish — logodan keyin */}
        <div className="px-3 pb-2 pt-1 sm:px-4" style={{ background: BG }}>
          {flowMode === 'sequence' ? (
            <div
              className="relative overflow-hidden rounded-[20px] border-2 border-yellow-200 px-3 py-3.5 text-center text-slate-950 sm:px-5 sm:py-4"
              style={{
                background: 'linear-gradient(120deg, #FBBF24 0%, #FEF08A 48%, #F59E0B 100%)',
                boxShadow: '0 0 28px rgba(251, 191, 36, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.65)',
              }}
            >
              <Sparkles aria-hidden="true" className="pointer-events-none absolute -right-2 -top-2 h-20 w-20 rotate-12 text-amber-600/15" />
              <div className="relative mb-2 inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1.5 text-yellow-300 shadow-sm">
                <Gift aria-hidden="true" className="h-5 w-5 shrink-0" strokeWidth={2.5} />
                <span className="text-[12px] font-black uppercase tracking-[0.1em] sm:text-[13px]">Siz uchun bonus</span>
              </div>
              <p className="relative text-[17px] font-extrabold leading-snug sm:text-[21px]">
                Bonusni olish uchun videoni
                <span className="mt-1.5 block">
                  <span className="inline-block rounded-lg bg-slate-950 px-2 py-0.5 font-black text-yellow-300">OXIRIGACHA</span>{' '}
                  ko‘ring!
                </span>
              </p>
              <div className="relative mt-3 rounded-2xl bg-slate-950 px-4 py-2.5 text-yellow-300 shadow-md" role="timer" aria-live="polite">
                <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-yellow-100/90 sm:text-xs">Bonusgacha qolgan vaqt</span>
                <span className="mt-0.5 block text-4xl font-black leading-none tabular-nums tracking-wide sm:text-5xl">{formatCountdown(sequenceSecondsLeft)}</span>
              </div>
            </div>
          ) : (
          <div
            className="rounded-[16px] px-3.5 py-3 text-center sm:rounded-[18px] sm:px-4 sm:py-3.5"
            style={{
              background: 'linear-gradient(135deg, #DC2626 0%, #EA580C 55%, #F59E0B 100%)',
              boxShadow: '0 12px 28px rgba(220, 38, 38, 0.35)',
            }}
          >
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/90">
              Muhim
            </p>
            <p className="mt-1 text-[16px] font-black leading-snug text-white sm:text-[18px]">
              Videoni <span className="underline decoration-2 underline-offset-2">OXIRIGACHA</span> ko‘rish shart!
            </p>
          </div>
          )}
        </div>

        <div
          className="relative aspect-video w-full overflow-hidden"
          style={{ background: BG }}
        >
          {PAYWALL_VIDEO_READY && flowReady ? (
            <>
              <video
                ref={videoRef}
                key={videoSource}
                className="h-full w-full object-contain"
                style={{ background: BG }}
                src={`${videoSource}?v=1`}
                playsInline
                controls
                controlsList="nodownload noplaybackrate"
                disablePictureInPicture
                preload="auto"
                onContextMenu={(e) => e.preventDefault()}
              />
              {needsGesture ? (
                <button
                  type="button"
                  onClick={() => void startWithSound()}
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-6 text-white"
                  style={{ background: `${BG}CC` }}
                >
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#2563EB] shadow-lg">
                    <Volume2 className="h-7 w-7" aria-hidden />
                  </span>
                  <span className="text-center text-[15px] font-bold">
                    Videoni ovoz bilan boshlash
                  </span>
                </button>
              ) : null}
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col" style={{ background: BG }}>
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
                  <Play className="h-7 w-7 text-white/80" fill="currentColor" aria-hidden />
                </span>
                <p className="text-center text-[15px] font-bold text-white/90">{flowReady ? 'Video' : 'Yuklanmoqda…'}</p>
              </div>
            </div>
          )}
        </div>

        {flowMode === 'sequence' && videoIndex < WELCOME_VIDEO_SOURCES.length - 1 ? (
          <video
            aria-hidden="true"
            tabIndex={-1}
            preload="auto"
            src={`${WELCOME_VIDEO_SOURCES[videoIndex + 1]}?v=1`}
            className="pointer-events-none absolute h-px w-px opacity-0"
          />
        ) : null}

        {/* Tezlik — video ostida, alohida tugmalar */}
        {PAYWALL_VIDEO_READY ? (
          <div
            className="flex flex-wrap items-center justify-center gap-2 px-4 pb-1 pt-3"
            style={{ background: BG }}
            role="group"
            aria-label="Video tezligi"
          >
            {SPEED_STEPS.map((step) => {
              const active = speed === step;
              return (
                <button
                  key={step}
                  type="button"
                  onClick={() => setPlaybackSpeed(step)}
                  aria-pressed={active}
                  className={`inline-flex min-h-[44px] min-w-[64px] items-center justify-center gap-1 rounded-2xl px-3.5 py-2 text-[14px] font-black transition active:scale-[0.97] ${
                    active
                      ? 'bg-[#2563EB] text-white ring-2 ring-[#93C5FD]'
                      : 'bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/16'
                  }`}
                >
                  {step === 1 ? <Gauge className="h-3.5 w-3.5" aria-hidden /> : null}
                  {formatSpeed(step)}
                </button>
              );
            })}
          </div>
        ) : null}

        {showBonusOffer ? (
          <div className="mx-4 mt-3 rounded-2xl border border-amber-300/40 bg-gradient-to-r from-amber-300 to-yellow-200 p-4 text-center text-slate-950 shadow-lg" role="status" aria-live="polite">
            <p className="text-sm font-bold">3 oy narxiga 6 oy o‘qing</p>
            <p className="mt-1 text-sm font-extrabold">{formatRubAmount(THREE_MONTH_PLAN.priceRub)} ₽ · {formatRussianTariffUzsMing(THREE_MONTH_PLAN.priceUzs)}</p>
            <p className="mt-2 text-xs font-semibold">Taklif tugashiga</p>
            <p className="my-1 text-3xl font-black tabular-nums">{String(Math.floor(displayedSeconds / 60)).padStart(2, '0')}:{String(displayedSeconds % 60).padStart(2, '0')}</p>
            <button type="button" disabled={Boolean(buying)} onClick={() => void buyWelcomeOffer()} className="mt-2 min-h-12 w-full rounded-xl bg-emerald-700 px-4 py-3 text-base font-black text-white transition hover:bg-emerald-800 disabled:opacity-60">
              {buying === 'welcome_offer' ? '…' : 'Taklifdan foydalanish'}
            </button>
          </div>
        ) : null}

        <AnimatePresence>
          {showTariffs && !showBonusOffer ? (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              className="relative z-20 flex-1 space-y-3 px-4 pb-8 pt-4"
              style={{ background: BG }}
            >
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {RUSSIAN_TARIFF_PLANS_RUB.map((plan) => {
                  const busy = buying === plan.code;
                  const monthsLabel =
                    plan.months === 1 ? '1 oy' : plan.months === 3 ? '3 oy' : '6 oy';
                  const isGreen =
                    plan.code === 'three_month' && highlightThreeMonth;
                  const showWas = plan.wasRub > plan.priceRub;
                  const uzsLabel = formatRussianTariffUzsMing(plan.priceUzs);

                  return (
                    <div
                      key={plan.code}
                      className={`flex flex-col rounded-[18px] p-2.5 shadow-[0_14px_34px_rgba(15,23,42,0.28)] transition sm:rounded-[22px] sm:p-3.5 ${
                        isGreen
                          ? 'border-[3px] border-[#16A34A] bg-[#ECFDF5] ring-4 ring-[#86EFAC]/70 shadow-[0_0_0_2px_rgba(22,163,74,0.35),0_18px_40px_rgba(22,163,74,0.28)] scale-[1.03]'
                          : 'border border-white/10 bg-white'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-1">
                        <p
                          className={`text-[10px] font-bold uppercase tracking-[0.12em] sm:text-[11px] ${
                            isGreen ? 'text-[#15803D]' : 'text-[#2563EB]'
                          }`}
                        >
                          {monthsLabel}
                        </p>
                        {plan.discountPercent > 0 ? (
                          <span className="rounded-md bg-[#16A34A] px-1.5 py-0.5 text-[10px] font-black text-white sm:text-[11px]">
                            −{plan.discountPercent}%
                          </span>
                        ) : null}
                      </div>

                      {/* 3/6 oy: to‘liq narx — joriy narxning yuqorisida */}
                      {showWas ? (
                        <p className="mt-1.5 text-[11px] font-semibold leading-snug text-slate-400 sm:text-[12px]">
                          <span className="line-through decoration-[#DC2626] decoration-2">
                            {formatRubAmount(plan.wasRub)} ₽
                          </span>
                        </p>
                      ) : (
                        <div className="mt-1.5 min-h-[1.1rem]" aria-hidden />
                      )}

                      <p
                        className={`text-[15px] font-black tabular-nums leading-tight sm:text-[18px] ${
                          isGreen ? 'text-[#14532D]' : 'text-slate-900'
                        }`}
                      >
                        {formatRubAmount(plan.priceRub)} ₽
                      </p>
                      <p
                        className={`mt-0.5 text-[10px] font-semibold leading-snug sm:text-[12px] ${
                          isGreen ? 'text-[#166534]' : 'text-slate-500'
                        }`}
                      >
                        {uzsLabel}
                      </p>

                      <button
                        type="button"
                        disabled={Boolean(buying)}
                        onClick={() => void buy(plan.code)}
                        className={`mt-auto flex min-h-[40px] w-full items-center justify-center rounded-xl px-1.5 py-2 text-center text-[11px] font-bold leading-tight text-white transition disabled:opacity-60 sm:min-h-[44px] sm:rounded-2xl sm:text-[12px] ${
                          isGreen
                            ? 'bg-[#16A34A] hover:bg-[#15803D]'
                            : 'bg-[#2563EB] hover:bg-[#1D4ED8]'
                        }`}
                      >
                        {busy ? '…' : `${monthsLabel}ga olish`}
                      </button>
                    </div>
                  );
                })}
              </div>

            </motion.div>
          ) : null}
        </AnimatePresence>
        {buyError ? (
          <p role="alert" className="mx-4 my-3 rounded-2xl bg-red-50 px-3 py-2 text-center text-[13px] font-semibold text-red-600">
            {buyError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
