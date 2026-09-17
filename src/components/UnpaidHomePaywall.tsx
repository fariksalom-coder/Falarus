/**
 * Obunasiz foydalanuvchi uchun bosh sahifa: Rutube video + oxirgi 1:10 da tariflar.
 *
 * Video: Rutube private embed (CDN — tez yuklanadi).
 * 3 oy tarifi oxirgi 51 soniyada yashil bo‘ladi.
 *
 * Eslatma: Rutube iframe API da playbackRate yo‘q — tezlik tugmalari olib tashlangan.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Volume2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRubUzsRate } from '../hooks/useRubUzsRate';
import { openRahmatCheckout } from '../api/rahmat';
import {
  formatRubAmount,
  RUSSIAN_TARIFF_PLANS_RUB,
  type RussianTariffCode,
} from '../../shared/russianTariffs';
import { formatRubUzsPair } from '../../shared/rubUzs';

/** Tariflar shu qolgan vaqtda chiqadi (1 daqiqa 10 soniya). */
const TARIFF_REMAINING_SEC = 70;

/** 3 oylik tarif shu qolgan vaqtda yashil bo‘ladi. */
const THREE_MONTH_GREEN_REMAINING_SEC = 51;

/** Rutube private video id + access key (`?p=`). */
const RUTUBE_VIDEO_ID = 'f9cee4c403dd215dd760da9aac3b1d48';
const RUTUBE_PRIVATE_KEY = '2QthcCmOPieaIkmSQJatiQ';

/**
 * Private embed: ID + `/?p=key` (Rutube Studio docs).
 * autoplay + muted start — brauzer ovozli autoplayni bloklamasligi uchun.
 */
const RUTUBE_EMBED_SRC =
  `https://rutube.ru/play/embed/${RUTUBE_VIDEO_ID}/?p=${encodeURIComponent(RUTUBE_PRIVATE_KEY)}` +
  '&autoplay=true&autostartmute=true&skinColor=2563EB';

export const PAYWALL_VIDEO_READY = true;

const BG = '#0B1220';
const RUTUBE_ORIGIN = 'https://rutube.ru';

type RutubeMessage = {
  type?: string;
  data?: {
    time?: number;
    duration?: number;
    state?: string;
  };
};

function postToRutube(
  iframe: HTMLIFrameElement | null,
  type: string,
  data: Record<string, unknown> = {},
) {
  if (!iframe?.contentWindow) return;
  iframe.contentWindow.postMessage(JSON.stringify({ type, data }), RUTUBE_ORIGIN);
}

export default function UnpaidHomePaywall() {
  const { token } = useAuth();
  const { rate } = useRubUzsRate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const durationRef = useRef(0);
  const playAttemptedRef = useRef(false);
  const playingSeenRef = useRef(false);

  const [showTariffs, setShowTariffs] = useState(!PAYWALL_VIDEO_READY);
  const [highlightThreeMonth, setHighlightThreeMonth] = useState(false);
  const [needsGesture, setNeedsGesture] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [buying, setBuying] = useState<RussianTariffCode | null>(null);

  const syncFromTime = useCallback((currentTime: number) => {
    const duration = durationRef.current;
    if (!Number.isFinite(duration) || duration <= 0) return;
    const remaining = duration - currentTime;
    if (remaining <= TARIFF_REMAINING_SEC) setShowTariffs(true);
    setHighlightThreeMonth(remaining <= THREE_MONTH_GREEN_REMAINING_SEC);
  }, []);

  const tryPlay = useCallback((withSound: boolean) => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    if (withSound) {
      postToRutube(iframe, 'player:unMute');
      postToRutube(iframe, 'player:setVolume', { volume: 1 });
    } else {
      postToRutube(iframe, 'player:mute');
    }
    postToRutube(iframe, 'player:play');
  }, []);

  useEffect(() => {
    if (!PAYWALL_VIDEO_READY) return;

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== RUTUBE_ORIGIN) return;
      let message: RutubeMessage;
      try {
        message =
          typeof event.data === 'string'
            ? (JSON.parse(event.data) as RutubeMessage)
            : (event.data as RutubeMessage);
      } catch {
        return;
      }
      if (!message?.type) return;

      switch (message.type) {
        case 'player:ready': {
          if (!playAttemptedRef.current) {
            playAttemptedRef.current = true;
            // Avval muted — autoplay odatda o‘tadi; keyin unmute urinish.
            tryPlay(false);
            window.setTimeout(() => tryPlay(true), 400);
            // Agar play umuman boshlanmasa — overlay.
            window.setTimeout(() => {
              if (!playingSeenRef.current) setNeedsGesture(true);
            }, 2000);
          }
          break;
        }
        case 'player:durationChange': {
          const d = message.data?.duration;
          if (typeof d === 'number' && Number.isFinite(d) && d > 0) {
            durationRef.current = d;
          }
          break;
        }
        case 'player:currentTime': {
          const t = message.data?.time;
          if (typeof t === 'number' && Number.isFinite(t)) {
            syncFromTime(t);
          }
          break;
        }
        case 'player:changeState': {
          if (message.data?.state === 'playing') {
            playingSeenRef.current = true;
            setNeedsGesture(false);
          }
          break;
        }
        case 'player:playComplete': {
          setShowTariffs(true);
          setHighlightThreeMonth(true);
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [syncFromTime, tryPlay]);

  const startWithSound = () => {
    playAttemptedRef.current = true;
    tryPlay(true);
    setNeedsGesture(false);
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
              <iframe
                ref={iframeRef}
                title="FalaRus video"
                src={RUTUBE_EMBED_SRC}
                className="absolute inset-0 h-full w-full border-0"
                allow="clipboard-write; autoplay; encrypted-media; fullscreen; picture-in-picture"
                allowFullScreen
              />
              {needsGesture ? (
                <button
                  type="button"
                  onClick={startWithSound}
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
                  const uzsNow = formatRubUzsPair(plan.priceRub, rate);
                  const uzsWas =
                    plan.wasRub > plan.priceRub
                      ? formatRubUzsPair(plan.wasRub, rate)
                      : null;
                  const busy = buying === plan.code;
                  const monthsLabel =
                    plan.months === 1 ? '1 oy' : plan.months === 3 ? '3 oy' : '6 oy';
                  const isGreen =
                    plan.code === 'three_month' && highlightThreeMonth;

                  return (
                    <div
                      key={plan.code}
                      className={`flex flex-col rounded-[18px] p-2.5 shadow-[0_14px_34px_rgba(15,23,42,0.28)] transition sm:rounded-[22px] sm:p-3.5 ${
                        isGreen
                          ? 'border-2 border-[#16A34A] bg-[#ECFDF5] ring-2 ring-[#86EFAC]/60'
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

                      <p
                        className={`mt-1.5 text-[15px] font-black tabular-nums leading-tight sm:text-[18px] ${
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
                        ≈ {uzsNow.labelUzs}
                      </p>

                      {plan.wasRub > plan.priceRub ? (
                        <p className="mt-1 text-[10px] font-semibold leading-snug text-slate-400 sm:text-[11px]">
                          <span className="line-through decoration-[#DC2626]">
                            {formatRubAmount(plan.wasRub)} ₽
                          </span>
                          {uzsWas ? (
                            <span className="mt-0.5 block line-through">
                              ≈ {uzsWas.labelUzs}
                            </span>
                          ) : null}
                        </p>
                      ) : (
                        <div className="mt-1 min-h-[2.2rem]" aria-hidden />
                      )}

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
