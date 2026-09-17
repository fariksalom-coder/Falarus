/**
 * Obunasiz foydalanuvchi uchun bosh sahifa: video + oxirgi 1:10 da tariflar.
 *
 * Video: `public/videos/paywall-intro.mp4`. Tezlatish tugmasi video ostida.
 * Oldinga o‘tkazish taqiqlangan (faqat orqaga).
 * 3 oy tarifi oxirgi 50 soniyada yashil bo‘ladi.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Gauge, Play, Volume2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { openRahmatCheckout } from '../api/rahmat';
import {
  formatRubAmount,
  formatRussianTariffUzsMing,
  RUSSIAN_TARIFF_PLANS_RUB,
  type RussianTariffCode,
} from '../../shared/russianTariffs';

/** Tariflar shu qolgan vaqtda chiqadi (1 daqiqa 10 soniya). */
const TARIFF_REMAINING_SEC = 70;

/** 3 oylik tarif shu qolgan vaqtda yashil bo‘ladi (1 soniya oldinga — 51 → 50). */
const THREE_MONTH_GREEN_REMAINING_SEC = 50;

/** Asosiy paywall video — fayl `public/videos/paywall-intro.mp4` ga qo‘yiladi. */
export const PAYWALL_VIDEO_SRC = '/videos/paywall-intro.mp4';

/**
 * Video hali tayyor emas — bo‘sh pleer ko‘rsatiladi.
 * Fayl qo‘yilgach `true` qiling.
 */
export const PAYWALL_VIDEO_READY = true;

const SPEED_STEPS = [1, 1.5, 2, 2.5] as const;
type SpeedStep = (typeof SPEED_STEPS)[number];
const BG = '#0B1220';

function formatSpeed(rate: SpeedStep): string {
  return rate === 1 ? '1×' : rate === 1.5 ? '1.5×' : rate === 2 ? '2×' : '2.5×';
}

export default function UnpaidHomePaywall() {
  const { token } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showTariffs, setShowTariffs] = useState(!PAYWALL_VIDEO_READY);
  const [highlightThreeMonth, setHighlightThreeMonth] = useState(false);
  const [needsGesture, setNeedsGesture] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [buying, setBuying] = useState<RussianTariffCode | null>(null);
  const [speed, setSpeed] = useState<SpeedStep>(1);
  const speedRef = useRef(speed);
  speedRef.current = speed;
  /** Bitta marta start — StrictMode / canplay qayta chaqiruvlarini oldini oladi. */
  const playAttemptedRef = useRef(false);
  /** Eng uzoq ko‘rilgan nuqta — oldinga seek qilishni bloklash uchun. */
  const maxPlayedRef = useRef(0);
  const seekingClampRef = useRef(false);

  const syncFromPlayback = useCallback(() => {
    const el = videoRef.current;
    if (!el || !Number.isFinite(el.duration) || el.duration <= 0) return;
    const remaining = el.duration - el.currentTime;
    if (remaining <= TARIFF_REMAINING_SEC) setShowTariffs(true);
    setHighlightThreeMonth(remaining <= THREE_MONTH_GREEN_REMAINING_SEC);
  }, []);

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
    if (!PAYWALL_VIDEO_READY) return;
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
  }, []);

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
  }, [tryAutoplay]);

  useEffect(() => {
    if (!PAYWALL_VIDEO_READY) return;
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
  }, [syncFromPlayback, tryAutoplay]);

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
              Videoni <span className="underline decoration-2 underline-offset-2">OXIRIGACHA</span>{' '}
              ko‘rish shart!
            </p>
          </div>
        </div>

        <div
          className="relative aspect-video w-full overflow-hidden"
          style={{ background: BG }}
        >
          {PAYWALL_VIDEO_READY ? (
            <>
              <video
                ref={videoRef}
                className="h-full w-full object-contain"
                style={{ background: BG }}
                src={`${PAYWALL_VIDEO_SRC}?v=5`}
                playsInline
                controls
                controlsList="nodownload noplaybackrate"
                disablePictureInPicture
                preload="metadata"
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
                <p className="text-center text-[15px] font-bold text-white/90">Video</p>
              </div>
            </div>
          )}
        </div>

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

        <AnimatePresence>
          {showTariffs ? (
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

              {buyError ? (
                <p className="rounded-2xl bg-red-50 px-3 py-2 text-center text-[13px] font-semibold text-red-600">
                  {buyError}
                </p>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
