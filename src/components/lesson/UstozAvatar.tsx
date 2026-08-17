import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';

/**
 * Ekranda dars o'tayotgan ustoz — tayyor jonlantirilgan video.
 *
 * Video 16:9 (1280x720) va chap tomonida bo'sh joy ko'p, shuning uchun
 * kartada 5:6 oynada `object-fit: cover` bilan qirqiladi: ustoz markazda
 * yiriroq ko'rinadi, o'ng pastdagi generator belgisi esa kadrdan chiqib ketadi.
 *
 * Ovoz chalinayotganda video yuradi, jim bo'lganda to'xtaydi — shunda ustoz
 * "gapirayotgani" ekranda ham seziladi.
 */
type Props = {
  /** Ovoz chalinyaptimi. */
  speaking: boolean;
  /**
   * Kichik ko'rinish — doska yonida turgan ustoz uchun: ramka ingichka,
   * ovoz to'lqini olib tashlanadi (doskada joy oz).
   */
  compact?: boolean;
};

const VIDEO = '/ustoz/ustoz-dars.mp4';
const POSTER = '/ustoz/ustoz-poster.webp';

const BAR_COUNT = 7;

export default function UstozAvatar({ speaking, compact = false }: Props) {
  const reduceMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const jonli = speaking && !reduceMotion;

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (jonli) {
      // Ovozsiz video uchun avtomatik ijroga ruxsat beriladi; taqiqlansa ham
      // poster ko'rinib turadi, shuning uchun xatoni jim o'tkazamiz.
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [jonli]);

  return (
    <div
      className={`relative select-none ${
        compact ? 'w-full' : 'mx-auto w-full max-w-[300px]'
      }`}
    >
      <div
        className={`relative overflow-hidden ${
          compact
            ? 'rounded-[16px] ring-2 ring-white/25 shadow-[0_10px_24px_rgba(0,0,0,0.28)]'
            : 'rounded-[20px] ring-1 ring-[#EDE9FB]'
        }`}
      >
        <video
          ref={videoRef}
          src={VIDEO}
          poster={POSTER}
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
          tabIndex={-1}
          className="block h-full w-full object-cover"
          style={{ aspectRatio: '5 / 6', objectPosition: '48% 50%' }}
        />

        {/* Gapirganda pastdan yumshoq binafsha nur — kadr "tirik" ko'rinadi. */}
        {jonli ? (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3"
            style={{
              background:
                'linear-gradient(to top, rgba(91,63,168,0.16) 0%, transparent 100%)',
            }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        ) : null}
      </div>

      {/* Ovoz to'lqini — gapirayotgani ovozsiz telefonda ham bilinadi. */}
      {compact ? null : (
      <div className="mt-2 flex h-6 items-center justify-center gap-[3px]" aria-hidden>
        {Array.from({ length: BAR_COUNT }).map((_, i) =>
          jonli ? (
            <motion.span
              key={i}
              className="w-[3px] rounded-full bg-[#5B3FA8]"
              animate={{ height: [7, 20, 10, 22, 7] }}
              transition={{
                duration: 0.95 + i * 0.07,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.05,
              }}
            />
          ) : (
            <span key={i} className="h-[3px] w-[3px] rounded-full bg-[#D8D0F0]" />
          )
        )}
      </div>
      )}
    </div>
  );
}
