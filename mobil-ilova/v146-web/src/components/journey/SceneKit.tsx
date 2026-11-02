/**
 * SceneKit.tsx — "Hayot yo'li" sahnalarining umumiy qurilish bloklari.
 *
 * MAQSAD: sahnalar tekis rasm emas, KADR kabi ko'rinsin. Buning uchun uch narsa
 * kerak bo'ladi va uchalasi ham shu faylda:
 *   1. HAJM — gradientli teri/mato, ichki soya, rim-light (chetdagi yorug'lik);
 *   2. MUHIT — chuqurlik qatlamlari, nur ustunlari, bokeh zarrachalar, vinyetka;
 *   3. TIRIKLIK — nafas, ko'z pirpirashi, ikkilamchi harakat (bosh tanadan
 *      kechikib qimirlaydi), kamera sekin yaqinlashadi.
 *
 * Hammasi SVG + transform bilan qilingan: `filter` ni animatsiya qilish mobil
 * qurilmada sekin, `transform`/`opacity` esa GPU da yuradi.
 */
import { motion } from 'motion/react';
import type { ReactNode } from 'react';

export const SKIN = '#F6C6A4';
export const SKIN_SHADOW = '#D9997A';
export const SKIN_LIGHT = '#FFE3CE';
export const HAIR = '#4A2C1A';
export const CLOTH = '#FFF6EA';
export const CLOTH_SHADOW = '#E8D6C2';

/**
 * Sahna uchun umumiy `<defs>` — gradientlar va filtrlar.
 * `uid` bilan noyoblashtiriladi: bir sahifada ikki sahna bo'lsa id to'qnashmasin.
 */
export function SceneDefs({ uid, accent }: { uid: string; accent: string }) {
  return (
    <defs>
      {/* Teri: yuqoridan yorug', pastda iliq soya */}
      <radialGradient id={`${uid}-skin`} cx="38%" cy="30%" r="78%">
        <stop offset="0%" stopColor={SKIN_LIGHT} />
        <stop offset="55%" stopColor={SKIN} />
        <stop offset="100%" stopColor={SKIN_SHADOW} />
      </radialGradient>
      {/* Mato/yo'rgak */}
      <radialGradient id={`${uid}-cloth`} cx="35%" cy="28%" r="80%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="60%" stopColor={CLOTH} />
        <stop offset="100%" stopColor={CLOTH_SHADOW} />
      </radialGradient>
      {/* Yumshoq nur — glow */}
      <radialGradient id={`${uid}-glow`}>
        <stop offset="0%" stopColor={accent} stopOpacity="0.9" />
        <stop offset="45%" stopColor={accent} stopOpacity="0.25" />
        <stop offset="100%" stopColor={accent} stopOpacity="0" />
      </radialGradient>
      {/* Vinyetka — chetlarni qoraytiradi, e'tibor markazga tortiladi */}
      <radialGradient id={`${uid}-vignette`} cx="50%" cy="46%" r="72%">
        <stop offset="55%" stopColor="#000" stopOpacity="0" />
        <stop offset="100%" stopColor="#000" stopOpacity="0.45" />
      </radialGradient>
      {/* Yumshatuvchi blur — orqa qatlamlar uchun (chuqurlik hissi) */}
      <filter id={`${uid}-soft`} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="6" />
      </filter>
      <filter id={`${uid}-softer`} x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="14" />
      </filter>
      {/* Personaj ostidagi soya uchun */}
      <filter id={`${uid}-shadow`} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="7" />
      </filter>
    </defs>
  );
}

/**
 * Kamera — butun sahnani sekin yaqinlashtiradi/suradi (Ken Burns).
 * Statik rasmni ham "suratga olingan" qilib ko'rsatadi.
 */
export function Camera({
  children,
  from = 1.0,
  to = 1.12,
  x = 0,
  y = 0,
  duration = 7,
}: {
  children: ReactNode;
  from?: number;
  to?: number;
  x?: number;
  y?: number;
  duration?: number;
}) {
  return (
    <motion.g
      initial={{ scale: from, x: 0, y: 0 }}
      animate={{ scale: to, x, y }}
      transition={{ duration, ease: 'easeOut' }}
      style={{ transformOrigin: '160px 160px' }}
    >
      {children}
    </motion.g>
  );
}

/** Fokusdan tashqaridagi yorug' dog'lar — chuqurlik va "obyektiv" hissi. */
export function Bokeh({ uid, color, count = 9, seed = 1 }: { uid: string; color: string; count?: number; seed?: number }) {
  return (
    <g filter={`url(#${uid}-softer)`} opacity={0.55}>
      {Array.from({ length: count }).map((_, i) => {
        const a = (i * 97 + seed * 53) % 360;
        const rad = (a * Math.PI) / 180;
        const dist = 70 + ((i * 41 + seed * 17) % 90);
        const cx = 160 + Math.cos(rad) * dist;
        const cy = 150 + Math.sin(rad) * dist * 0.8;
        const r = 8 + ((i * 13 + seed) % 16);
        return (
          <motion.circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill={color}
            initial={{ opacity: 0.15 }}
            animate={{ opacity: [0.15, 0.5, 0.15], y: [0, -12, 0] }}
            transition={{ duration: 5 + (i % 4), repeat: Infinity, delay: (i % 5) * 0.6, ease: 'easeInOut' }}
          />
        );
      })}
    </g>
  );
}

/** Yuqoridan tushayotgan nur ustunlari. */
export function LightShafts({ uid, color, opacity = 0.28 }: { uid: string; color: string; opacity?: number }) {
  return (
    <g filter={`url(#${uid}-soft)`} opacity={opacity}>
      {[
        { x: 96, w: 26, d: 0 },
        { x: 150, w: 40, d: 0.8 },
        { x: 208, w: 22, d: 1.5 },
      ].map((s) => (
        <motion.path
          key={s.x}
          d={`M ${s.x} -20 L ${s.x + s.w} -20 L ${s.x + s.w + 34} 320 L ${s.x + 34} 320 Z`}
          fill={color}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.25, 0.6, 0.25] }}
          transition={{ duration: 5.5, repeat: Infinity, delay: s.d, ease: 'easeInOut' }}
        />
      ))}
    </g>
  );
}

/** Personaj ostidagi yumshoq soya. */
export function GroundShadow({ uid, cx = 160, cy = 268, rx = 74, opacity = 0.3 }: { uid: string; cx?: number; cy?: number; rx?: number; opacity?: number }) {
  return (
    <motion.ellipse
      cx={cx}
      cy={cy}
      rx={rx}
      ry={12}
      fill="#000"
      opacity={opacity}
      filter={`url(#${uid}-shadow)`}
      animate={{ rx: [rx, rx * 0.94, rx], opacity: [opacity, opacity * 0.85, opacity] }}
      transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

export type BabyPose = {
  /** Ko'z holati. */
  eyes?: 'open' | 'closed' | 'happy';
  smile?: boolean;
  /** Og'iz ochiqmi (yig'i / tovush chiqarish). */
  mouthOpen?: boolean;
  /** Yonoqdagi qizillik. */
  blush?: boolean;
};

/**
 * Chaqaloq boshi — hajmli.
 *
 * Tekis doira o'rniga: gradientli teri, ichki soya (pastda), rim-light (o'ng
 * chetda ingichka yorug'lik), yumshoq soch va porloq ko'zlar. Ko'z pirpirashi
 * tasodifiy emas, 4.2 soniyalik siklda — real chaqaloq kabi.
 */
export function BabyHead({
  uid,
  x = 160,
  y = 148,
  r = 42,
  pose = {},
}: {
  uid: string;
  x?: number;
  y?: number;
  r?: number;
  pose?: BabyPose;
}) {
  const { eyes = 'open', smile = false, mouthOpen = false, blush = true } = pose;
  const eyeY = y - r * 0.1;
  const eyeDx = r * 0.34;
  return (
    <g>
      {/* soch */}
      <path
        d={`M ${x - 10} ${y - r + 4} q 8 -18 20 -6 q -8 -3 -12 8`}
        fill={HAIR}
        opacity={0.92}
      />
      {/* bosh */}
      <circle cx={x} cy={y} r={r} fill={`url(#${uid}-skin)`} />
      {/* rim-light — o'ng chetdagi yorug' yoy */}
      <path
        d={`M ${x + r * 0.62} ${y - r * 0.72} A ${r} ${r} 0 0 1 ${x + r * 0.5} ${y + r * 0.82}`}
        stroke={SKIN_LIGHT}
        strokeWidth={r * 0.13}
        fill="none"
        opacity={0.55}
        strokeLinecap="round"
      />
      {/* quloqlar */}
      <ellipse cx={x - r} cy={y + r * 0.08} rx={r * 0.16} ry={r * 0.22} fill={SKIN} />
      <ellipse cx={x + r} cy={y + r * 0.08} rx={r * 0.16} ry={r * 0.22} fill={SKIN} />
      {blush ? (
        <>
          <ellipse cx={x - r * 0.56} cy={y + r * 0.26} rx={r * 0.22} ry={r * 0.15} fill="#F09A87" opacity={0.42} />
          <ellipse cx={x + r * 0.56} cy={y + r * 0.26} rx={r * 0.22} ry={r * 0.15} fill="#F09A87" opacity={0.42} />
        </>
      ) : null}

      {/* ko'zlar */}
      {eyes === 'closed' ? (
        <>
          <path d={`M ${x - eyeDx - 9} ${eyeY} q 9 8 18 0`} stroke="#3A2A22" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d={`M ${x + eyeDx - 9} ${eyeY} q 9 8 18 0`} stroke="#3A2A22" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      ) : eyes === 'happy' ? (
        <>
          <path d={`M ${x - eyeDx - 9} ${eyeY + 2} q 9 -11 18 0`} stroke="#3A2A22" strokeWidth="3.4" fill="none" strokeLinecap="round" />
          <path d={`M ${x + eyeDx - 9} ${eyeY + 2} q 9 -11 18 0`} stroke="#3A2A22" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          {[-1, 1].map((s) => (
            <g key={s}>
              <ellipse cx={x + s * eyeDx} cy={eyeY} rx={5.4} ry={5.8} fill="#2E2018" />
              <circle cx={x + s * eyeDx + 1.9} cy={eyeY - 2} r={1.9} fill="#fff" opacity={0.95} />
              <circle cx={x + s * eyeDx - 1.6} cy={eyeY + 2.2} r={0.9} fill="#fff" opacity={0.5} />
              {/* qovoq — pirpirash */}
              <motion.rect
                x={x + s * eyeDx - 7}
                y={eyeY - 8}
                width={14}
                height={13}
                fill={`url(#${uid}-skin)`}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: [0, 0, 1, 0, 0] }}
                transition={{ duration: 4.2, repeat: Infinity, times: [0, 0.9, 0.94, 0.98, 1], ease: 'easeInOut' }}
                style={{ transformOrigin: `${x + s * eyeDx}px ${eyeY - 8}px` }}
              />
            </g>
          ))}
        </>
      )}

      {/* og'iz */}
      {mouthOpen ? (
        <motion.ellipse
          cx={x}
          cy={y + r * 0.46}
          rx={r * 0.2}
          ry={r * 0.24}
          fill="#A2402C"
          animate={{ ry: [r * 0.18, r * 0.3, r * 0.18] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      ) : smile ? (
        <path d={`M ${x - r * 0.3} ${y + r * 0.38} q ${r * 0.3} ${r * 0.3} ${r * 0.6} 0`} stroke="#A9563A" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      ) : (
        <ellipse cx={x} cy={y + r * 0.44} rx={r * 0.11} ry={r * 0.09} fill="#A9563A" opacity={0.85} />
      )}
    </g>
  );
}

/** Yo'rgakdagi tana — hajmli, yumshoq soyali. */
export function BabyBody({
  uid,
  x = 160,
  y = 216,
  rx = 46,
  ry = 38,
}: {
  uid: string;
  x?: number;
  y?: number;
  rx?: number;
  ry?: number;
}) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={`url(#${uid}-cloth)`} />
      {/* mato burmasi */}
      <path
        d={`M ${x - rx * 0.6} ${y + ry * 0.2} q ${rx * 0.6} ${ry * 0.4} ${rx * 1.2} 0`}
        stroke={CLOTH_SHADOW}
        strokeWidth="2.4"
        fill="none"
        opacity={0.7}
      />
    </g>
  );
}

/**
 * Tirik personaj o'ramasi: nafas + ikkilamchi harakat.
 * `delay` bilan bosh tanadan biroz kechikib qimirlaydi — shu narsa
 * animatsiyani "chizilgan" emas, "tirik" qiladi.
 */
export function Alive({
  children,
  amount = 1,
  delay = 0,
  origin = '160px 240px',
}: {
  children: ReactNode;
  amount?: number;
  delay?: number;
  origin?: string;
}) {
  return (
    <motion.g
      animate={{
        y: [0, -2.6 * amount, 0],
        scaleY: [1, 1 + 0.018 * amount, 1],
        rotate: [-0.5 * amount, 0.5 * amount, -0.5 * amount],
      }}
      transition={{ duration: 3.1, repeat: Infinity, ease: 'easeInOut', delay }}
      style={{ transformOrigin: origin }}
    >
      {children}
    </motion.g>
  );
}
