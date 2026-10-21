/**
 * Obunasiz foydalanuvchi uchun har kirishda video ketma-ketligi va bonus.
 *
 * Videolar: kirish, tariflar, bonus. Tezlatish tugmasi video ostida.
 * Oldinga o‘tkazish taqiqlangan (faqat orqaga).
 * 3 oy tarifi oxirgi 52.5 soniyada yashil bo‘ladi.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Gift, Play, Sparkles, Volume2 } from 'lucide-react';
import './paywallOffers.css';
import { useAuth } from '../context/AuthContext';
import { openRahmatCheckout } from '../api/rahmat';
import { completeWelcomeVideo, beginWelcomeVideoVisit, type WelcomeVideoOfferState } from '../api/welcomeVideoOffer';
import {
  formatRubAmount,
  RUSSIAN_TARIFF_PLANS_RUB,
  type RussianTariffCode,
  type RussianTariffRubPlan,
} from '../../shared/russianTariffs';
import { formatUzsAmount } from '../../shared/rubUzs';

/** Tariflar shu qolgan vaqtda chiqadi (1 daqiqa 10 soniya). */
const TARIFF_REMAINING_SEC = 70;

/** 3 oylik tarif shu qolgan vaqtda yashil bo‘ladi (52.5 s). */
const THREE_MONTH_GREEN_REMAINING_SEC = 52.5;

/** Each visit replays intro, tariffs, then the bonus explanation. */
const WELCOME_VIDEO_SOURCES = ['/videos/welcome-intro.mp4', '/videos/welcome-tariffs.mp4', '/videos/welcome-bonus.mp4'] as const;
// Actual asset durations; the active clip uses its loaded media metadata.
const WELCOME_VIDEO_DURATIONS_SECONDS = [17.019002, 221.238005, 60.486009] as const;
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

function PaywallPriceCard({ plan, bonus = false, secondsLeft = 0, disabled, busy, recommended = false, onBuy }: {
  plan: RussianTariffRubPlan;
  bonus?: boolean;
  secondsLeft?: number;
  disabled: boolean;
  busy: boolean;
  recommended?: boolean;
  onBuy: () => void;
}) {
  const months = bonus ? 6 : plan.months;
  const wasRub = plan.wasRub / plan.months * months;
  const wasUzs = RUSSIAN_TARIFF_PLANS_RUB[0].priceUzs * months;
  const discountPercent = Math.round((1 - plan.priceRub / wasRub) * 100);
  const showWas = wasRub > plan.priceRub;
  return (
    <section className={`paywall-offer${bonus ? ' paywall-offer__bonus' : ''}${recommended ? ' paywall-offer--recommended' : ''}`} aria-label={bonus ? 'Maxsus bonus taklifi' : `${months} oylik tarif`}>
      <img src="/paywall/offer-decoration.webp" className="paywall-offer__decoration" alt="" aria-hidden="true" />
      <div className="paywall-offer__heading">
        <p className="paywall-offer__eyebrow">{bonus ? 'Maxsus taklif' : 'Rus tili kursi'}</p>
        <h2 className="paywall-offer__title">{bonus ? '+3 oy bepul' : `${months} oylik obuna`}</h2>
      </div>
      <span className="paywall-offer__badge">{discountPercent > 0 ? `−${discountPercent}%` : `${months} oy`}</span>
      <div className="paywall-offer__prices">
        <div className="paywall-offer__rub">
          <p className="paywall-offer__price">{formatRubAmount(plan.priceRub)} ₽</p>
          {showWas && <s className="paywall-offer__was">{formatRubAmount(wasRub)} ₽</s>}
        </div>
        <div className="paywall-offer__uzs">
          <span>{formatUzsAmount(plan.priceUzs)} so‘m</span>
          {showWas && <s className="paywall-offer__was">{formatUzsAmount(wasUzs)} so‘m</s>}
        </div>
        {bonus && <p className="paywall-offer__bonus-caption">3 oy narxiga 6 oy o‘qing</p>}
      </div>
      <div className="paywall-offer__summary">
        <span>{bonus ? 'Taklif tugashiga' : 'Kursga kirish'}</span>
        {bonus ? (
          <div className="paywall-offer__clock" role="timer" aria-label="Taklif tugashiga qolgan vaqt">
            <span>{String(Math.floor(secondsLeft / 60)).padStart(2, '0')}</span>
            <b aria-hidden="true">:</b>
            <span>{String(secondsLeft % 60).padStart(2, '0')}</span>
          </div>
        ) : <span className="paywall-offer__duration">{months} oy</span>}
      </div>
      <button type="button" className="paywall-offer__button" disabled={disabled} onClick={onBuy}>
        {busy ? 'Yuklanmoqda…' : bonus ? 'Taklifdan foydalanish' : `${months} oyga olish`}
        {!busy && <ArrowRight size={18} strokeWidth={2.5} aria-hidden="true" />}
      </button>
    </section>
  );
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
  const visitRequestRef = useRef<{ token: string; request: Promise<WelcomeVideoOfferState> } | null>(null);
  const videoSource = flowMode === 'sequence' ? WELCOME_VIDEO_SOURCES[videoIndex] : flowMode === 'offer' ? WELCOME_VIDEO_SOURCES[2] : WELCOME_VIDEO_SOURCES[1];
  const showBonusOffer = flowMode === 'offer' && secondsLeft > 0;
  const displayedSeconds = secondsLeft;

  const applyOfferState = (state: WelcomeVideoOfferState) => {
    setBuyError(null);
    setFlowMode(state.mode);
    setOfferExpiresAt(state.offerExpiresAt);
    if (state.offerExpiresAt) setSecondsLeft(Math.max(0, Math.ceil((Date.parse(state.offerExpiresAt) - Date.now()) / 1000)));
    if (state.mode === 'sequence' && state.nextVideoIndex != null) {
      setVideoIndex(state.nextVideoIndex);
      setSequenceSecondsLeft(Math.ceil(WELCOME_VIDEO_DURATIONS_SECONDS.slice(state.nextVideoIndex).reduce((sum, value) => sum + value, 0)));
    }
    else if (state.mode === 'offer') setVideoIndex(2);
    else setVideoIndex(1);
    if (state.mode === 'offer') setShowTariffs(true);
  };

  useEffect(() => {
    let cancelled = false;
    setFlowReady(false);
    setShowTariffs(false);
    setHighlightThreeMonth(false);
    setOfferExpiresAt(null);
    setSecondsLeft(0);
    if (!token) {
      visitRequestRef.current = null;
      setFlowMode('standard');
      setVideoIndex(1);
      setFlowReady(true);
      return;
    }
    // Share the request across StrictMode's effect replay; a real remount
    // creates a new ref and therefore starts a new visit.
    if (visitRequestRef.current?.token !== token) {
      visitRequestRef.current = { token, request: beginWelcomeVideoVisit(token) };
    }
    void visitRequestRef.current.request.then((state) => {
      if (!cancelled) applyOfferState(state);
    }).catch((error) => {
      console.error('[welcome-video-offer]', error);
      if (!cancelled) {
        setFlowMode('standard'); setVideoIndex(1);
        setBuyError('Bonusni yuklab bo‘lmadi. Sahifani yangilab qayta urinib ko‘ring.');
      }
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
      return;
    }
    const refresh = () => {
      const el = videoRef.current;
      // Media time already follows playback speed and stops during pauses
      // and buffering. Never spend bonus waiting time using the wall clock.
      const duration = el && Number.isFinite(el.duration) && el.duration > 0
        ? el.duration : WELCOME_VIDEO_DURATIONS_SECONDS[videoIndex];
      const laterVideos = WELCOME_VIDEO_DURATIONS_SECONDS.slice(videoIndex + 1).reduce((sum, value) => sum + value, 0);
      setSequenceSecondsLeft(Math.ceil(Math.max(0, duration - (el?.currentTime ?? 0)) + laterVideos));
    };
    refresh();
    const timer = window.setInterval(refresh, 250);
    return () => window.clearInterval(timer);
  }, [flowMode, videoIndex]);

  const syncFromPlayback = useCallback(() => {
    const el = videoRef.current;
    if (!el || !Number.isFinite(el.duration) || el.duration <= 0) return;
    const remaining = el.duration - el.currentTime;
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
        if (finishedIndex === 2) setSequenceSecondsLeft(0);
        void completeWelcomeVideo(token, finishedIndex).then((state) => {
          maxPlayedRef.current = 0;
          playAttemptedRef.current = false;
          setNeedsGesture(false);
          applyOfferState(state);
          if (finishedIndex >= 1 || state.mode !== 'sequence') {
            setShowTariffs(true);
            setHighlightThreeMonth(true);
          }
        }).catch((error) => {
          console.error('[welcome-video-offer/video-complete]', error);
          setBuyError('Keyingi video yoki bonusni yuklab bo‘lmadi. Sahifani yangilab qayta urinib ko‘ring.');
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

        {/* Rasmga mos tezlik tanlovi; video o‘lchami saqlanadi. */}
        {PAYWALL_VIDEO_READY ? (
          <div className="paywall-speed" role="group" aria-label="Video tezligi">
            {SPEED_STEPS.map((step) => (
              <button key={step} type="button" onClick={() => setPlaybackSpeed(step)} aria-pressed={speed === step}>
                {formatSpeed(step)}
              </button>
            ))}
          </div>
        ) : null}

        {showBonusOffer ? (
          <PaywallPriceCard
            plan={THREE_MONTH_PLAN}
            bonus
            secondsLeft={displayedSeconds}
            disabled={Boolean(buying)}
            busy={buying === 'welcome_offer'}
            onBuy={() => void buyWelcomeOffer()}
          />
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
              <div className="paywall-offer-grid">
                {RUSSIAN_TARIFF_PLANS_RUB.map((plan) => (
                  <PaywallPriceCard
                    key={plan.code}
                    plan={plan}
                    recommended={plan.code === 'three_month' && highlightThreeMonth}
                    disabled={Boolean(buying)}
                    busy={buying === plan.code}
                    onBuy={() => void buy(plan.code)}
                  />
                ))}
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
