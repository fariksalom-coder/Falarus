/**
 * LifeScenes.tsx — "Hayot yo'li" sahnalari (1-10 kun).
 *
 * Har sahna KADR kabi qurilgan:
 *   orqa fon (blur, chuqurlik) → muhit (nur, zarrachalar) → personaj → old
 *   qatlam (bokeh, vinyetka), ustidan sekin kamera harakati.
 *
 * Umumiy qismlar `SceneKit.tsx` da — teri gradienti, nafas, ko'z pirpirashi,
 * soya, vinyetka, kamera. Shu sababli sahnalar bir uslubda ko'rinadi.
 */
import type { ReactElement } from 'react';
import { motion } from 'motion/react';
import type { LifeSceneId } from '../../data/lifeJourney';
import {
  Alive,
  BabyBody,
  BabyHead,
  Bokeh,
  Camera,
  GroundShadow,
  LightShafts,
  SceneDefs,
  SKIN,
  SKIN_LIGHT,
  SKIN_SHADOW,
} from './SceneKit';

type SceneProps = { uid: string; accent: string };

// ─────────────────────────────────────────────────────────────────────────────
// 1-kun — tug'ilish
// ─────────────────────────────────────────────────────────────────────────────
function BirthScene({ uid, accent }: SceneProps) {
  return (
    <>
      {/* ona qorni — qatlamli, tirik pulsatsiya bilan */}
      <motion.g
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.03, 1.42], opacity: [1, 1, 0] }}
        transition={{ duration: 5.2, times: [0, 0.5, 1], ease: 'easeInOut' }}
        style={{ transformOrigin: '160px 165px' }}
      >
        <ellipse cx={160} cy={165} rx={146} ry={150} fill="#2B0F3D" />
        <ellipse cx={160} cy={168} rx={124} ry={128} fill="#43184F" />
        <ellipse cx={160} cy={172} rx={100} ry={104} fill="#5B2159" opacity={0.85} filter={`url(#${uid}-soft)`} />
        {/* tomirlar */}
        {[
          'M 40 120 q 46 34 26 92',
          'M 280 130 q -44 30 -22 96',
          'M 150 24 q 24 44 -8 78',
        ].map((d, i) => (
          <motion.path
            key={d}
            d={d}
            stroke="#8A3A6E"
            strokeWidth="3"
            fill="none"
            opacity={0.5}
            animate={{ opacity: [0.28, 0.6, 0.28] }}
            transition={{ duration: 3.4, repeat: Infinity, delay: i * 0.7, ease: 'easeInOut' }}
          />
        ))}
        {/* suyuqlik pufakchalari */}
        {Array.from({ length: 7 }).map((_, i) => (
          <motion.circle
            key={i}
            cx={92 + i * 24}
            cy={250}
            r={2.6 + (i % 3)}
            fill="#E5B8FF"
            opacity={0.5}
            animate={{ y: [0, -150], opacity: [0, 0.55, 0] }}
            transition={{ duration: 5 + (i % 3), repeat: Infinity, delay: i * 0.6, ease: 'easeOut' }}
          />
        ))}
      </motion.g>

      {/* yorug'lik yorib kiradi */}
      <motion.circle
        cx={160}
        cy={158}
        r={168}
        fill={`url(#${uid}-glow)`}
        initial={{ opacity: 0, scale: 0.15 }}
        animate={{ opacity: [0, 0.3, 0.95], scale: [0.15, 0.7, 1.2] }}
        transition={{ duration: 5.4, ease: 'easeOut' }}
      />
      <motion.g initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 0.5] }} transition={{ duration: 5.4 }}>
        <LightShafts uid={uid} color={accent} opacity={0.3} />
      </motion.g>

      {/* chaqaloq: g'ujanakdan yoziladi */}
      <Camera from={1.5} to={1.02} duration={5.6}>
        <motion.g
          initial={{ scale: 0.5, rotate: -26, y: 30 }}
          animate={{ scale: [0.5, 0.68, 1], rotate: [-26, -10, 0], y: [30, 14, 0] }}
          transition={{ duration: 5.4, ease: [0.22, 0.9, 0.3, 1] }}
          style={{ transformOrigin: '160px 190px' }}
        >
          <GroundShadow uid={uid} cy={262} rx={56} opacity={0.22} />
          <Alive amount={1.2}>
            <BabyBody uid={uid} />
            <BabyHead uid={uid} pose={{ eyes: 'closed' }} />
          </Alive>
        </motion.g>
      </Camera>

      <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.6, duration: 1.4 }}>
        <Bokeh uid={uid} color={accent} count={10} seed={3} />
      </motion.g>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2-kun — ilk nafas
// ─────────────────────────────────────────────────────────────────────────────
function FirstBreathScene({ uid, accent }: SceneProps) {
  return (
    <>
      <LightShafts uid={uid} color={accent} opacity={0.22} />
      <Bokeh uid={uid} color={accent} count={7} seed={2} />

      {/* ovoz to'lqinlari — yig'i */}
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          cx={160}
          cy={162}
          r={62}
          fill="none"
          stroke={accent}
          strokeWidth={3 - i * 0.6}
          initial={{ scale: 0.55, opacity: 0 }}
          animate={{ scale: [0.55, 2.1], opacity: [0.7, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.9, ease: 'easeOut' }}
        />
      ))}

      <Camera from={1.14} to={1.0} duration={6}>
        <GroundShadow uid={uid} cy={264} rx={62} opacity={0.24} />
        {/* ko'krak ko'tarilib-tushadi — nafas */}
        <motion.g
          animate={{ scaleY: [1, 1.09, 1], scaleX: [1, 1.03, 1] }}
          transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '160px 250px' }}
        >
          <BabyBody uid={uid} />
        </motion.g>
        <Alive amount={0.8} delay={0.25}>
          <BabyHead uid={uid} pose={{ eyes: 'closed', mouthOpen: true }} />
        </Alive>
      </Camera>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3-kun — ona quchog'i
// ─────────────────────────────────────────────────────────────────────────────
function MotherEmbraceScene({ uid, accent }: SceneProps) {
  return (
    <>
      <Bokeh uid={uid} color={accent} count={8} seed={5} />
      <Camera from={1.16} to={1.02} duration={6.4}>
        {/*
          Ona silueti. Bir butun shakl sifatida chiziladi: soch boshni yopib,
          yelkaga tushadi — avval soch alohida yarim oy bo'lib "qalpoq" kabi
          ko'rinib qolgandi.
        */}
        <motion.g
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        >
          {/* gavda va yelkalar */}
          <path d="M -10 320 q 10 -128 126 -128 q 118 0 128 128 z" fill="#5A1B3B" />
          {/* bo'yin */}
          <rect x={94} y={124} width={40} height={54} rx={18} fill="#7B2B50" />
          {/* bosh */}
          <ellipse cx={114} cy={104} rx={42} ry={46} fill="#7B2B50" />
          {/* soch — bosh ustidan yelkagacha tushadi */}
          <path
            d="M 70 112 q -4 -62 46 -64 q 50 2 46 64 q -6 -34 -16 -40 q -22 12 -50 4 q -18 4 -26 36 z"
            fill="#38122A"
          />
          <path d="M 68 108 q -12 60 4 96 q -22 -34 -14 -96 z" fill="#38122A" />
          <path d="M 160 108 q 12 60 -4 96 q 22 -34 14 -96 z" fill="#38122A" />
          {/* quchoq — chaqaloqni ushlab turgan qo'l */}
          <motion.path
            d="M 96 226 q 62 40 132 -6"
            stroke="#8E3559"
            strokeWidth="30"
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: 0.5, duration: 1.3, ease: 'easeOut' }}
          />
        </motion.g>

        {/* chaqaloq — quchoq ichida, onaga suyanib */}
        <motion.g
          initial={{ y: 36, opacity: 0, scale: 0.86, rotate: 8 }}
          animate={{ y: 0, opacity: 1, scale: 1, rotate: 12 }}
          transition={{ duration: 1.7, delay: 0.35, ease: 'easeOut' }}
          style={{ transformOrigin: '196px 200px' }}
        >
          <Alive amount={0.9} origin="196px 214px">
            <BabyBody uid={uid} x={198} y={198} rx={38} ry={31} />
            <BabyHead uid={uid} x={198} y={146} r={35} pose={{ eyes: 'closed', smile: true }} />
          </Alive>
        </motion.g>
      </Camera>

      {/* yuraklar */}
      {[0, 1, 2, 3].map((i) => (
        <motion.g
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.95, 0], y: [0, -96], scale: [0.4, 1, 0.8] }}
          transition={{ duration: 3.6, repeat: Infinity, delay: i * 0.85, ease: 'easeOut' }}
        >
          <path
            d="M 0 0 q -7 -9 -13 -2 q -5 6 1 12 l 12 12 l 12 -12 q 6 -6 1 -12 q -6 -7 -13 2 z"
            fill={accent}
            transform={`translate(${104 + i * 34}, 150)`}
          />
        </motion.g>
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4-kun — ilk tabassum (yaqin plan)
// ─────────────────────────────────────────────────────────────────────────────
function FirstSmileScene({ uid, accent }: SceneProps) {
  return (
    <>
      <LightShafts uid={uid} color={accent} opacity={0.26} />
      <Bokeh uid={uid} color={accent} count={9} seed={7} />
      <Camera from={1.0} to={1.16} duration={6}>
        <GroundShadow uid={uid} cy={276} rx={70} opacity={0.22} />
        <Alive amount={0.7}>
          <BabyBody uid={uid} y={244} rx={48} ry={34} />
          {/* yaqin plan — kattaroq bosh */}
          <BabyHead uid={uid} y={150} r={56} pose={{ eyes: 'happy', smile: false }} />
          {/* tabassum chizilib chiqadi */}
          <motion.path
            d="M 130 172 q 30 32 60 0"
            stroke="#A9563A"
            strokeWidth="4.4"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 1, duration: 1.2, ease: 'easeOut' }}
          />
        </Alive>
      </Camera>
      {/* quvonch uchqunlari */}
      {Array.from({ length: 10 }).map((_, i) => {
        const a = (i * 36 * Math.PI) / 180;
        return (
          <motion.circle
            key={i}
            cx={160 + Math.cos(a) * 92}
            cy={150 + Math.sin(a) * 88}
            r={3}
            fill={accent}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1.4, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, delay: 1.4 + i * 0.12 }}
          />
        );
      })}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5-kun — ovozlarni tanish
// ─────────────────────────────────────────────────────────────────────────────
function HearingScene({ uid, accent }: SceneProps) {
  return (
    <>
      {/* orqada — ovoz manbai: onaning xira silueti */}
      <g filter={`url(#${uid}-softer)`} opacity={0.4}>
        <circle cx={48} cy={128} r={30} fill="#0B3A46" />
        <path d="M 4 250 q 4 -78 44 -78 q 40 0 44 78 z" fill="#0B3A46" />
      </g>
      <Bokeh uid={uid} color={accent} count={7} seed={11} />

      {/* tovush yoylari */}
      {[38, 62, 86, 110].map((r, i) => {
        const rad = (54 * Math.PI) / 180;
        const x = 52 + r * Math.cos(rad);
        const y1 = 156 - r * Math.sin(rad);
        const y2 = 156 + r * Math.sin(rad);
        return (
          <motion.path
            key={r}
            d={`M ${x.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 0 1 ${x.toFixed(1)} ${y2.toFixed(1)}`}
            stroke={accent}
            strokeWidth={3.6 - i * 0.5}
            fill="none"
            strokeLinecap="round"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.9, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.3, ease: 'easeOut' }}
          />
        );
      })}

      <Camera from={1.05} to={1.14} x={-8} duration={6.4}>
        <GroundShadow uid={uid} cx={196} cy={270} rx={58} opacity={0.24} />
        {/* bosh ovoz tomon buriladi */}
        <motion.g
          initial={{ rotate: 10 }}
          animate={{ rotate: [10, -6, -3] }}
          transition={{ duration: 3.2, ease: 'easeInOut', times: [0, 0.6, 1] }}
          style={{ transformOrigin: '196px 210px' }}
        >
          <Alive amount={0.8} origin="196px 240px">
            <BabyBody uid={uid} x={196} y={224} rx={42} ry={34} />
            <BabyHead uid={uid} x={196} y={160} r={40} pose={{ eyes: 'open', smile: true }} />
            {/* quloq urg'usi */}
            <motion.circle
              cx={156}
              cy={164}
              r={11}
              fill={accent}
              opacity={0.35}
              animate={{ scale: [1, 1.5, 1], opacity: [0.25, 0.6, 0.25] }}
              transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
            />
          </Alive>
        </motion.g>
      </Camera>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6-kun — dunyo rangga to'ladi
// ─────────────────────────────────────────────────────────────────────────────
function ColorsScene({ uid, accent }: SceneProps) {
  const orbs = [
    { c: '#FF6B6B', x: 66, y: 92, r: 26, d: 0 },
    { c: '#4ECDC4', x: 250, y: 104, r: 22, d: 0.4 },
    { c: '#FFD166', x: 58, y: 226, r: 20, d: 0.8 },
    { c: '#8E7BE8', x: 258, y: 224, r: 26, d: 1.2 },
    { c: '#6BCB77', x: 160, y: 56, r: 18, d: 1.6 },
  ];
  return (
    <>
      {/* xira rangsiz dunyo -> rang */}
      <g filter={`url(#${uid}-softer)`}>
        {orbs.map((o) => (
          <motion.circle
            key={`bg-${o.c}`}
            cx={o.x}
            cy={o.y}
            r={o.r * 2.1}
            fill={o.c}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.35, 0.22] }}
            transition={{ duration: 3, delay: o.d, ease: 'easeOut' }}
          />
        ))}
      </g>
      {orbs.map((o) => (
        <motion.circle
          key={o.c}
          cx={o.x}
          cy={o.y}
          r={o.r}
          fill={o.c}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.2, 1], opacity: 1, y: [0, -8, 0] }}
          transition={{
            scale: { duration: 1, delay: o.d, ease: 'backOut' },
            opacity: { duration: 0.6, delay: o.d },
            y: { duration: 3.4, repeat: Infinity, ease: 'easeInOut', delay: o.d },
          }}
        />
      ))}
      <Camera from={1.0} to={1.1} duration={6.4}>
        <GroundShadow uid={uid} cy={272} rx={64} opacity={0.2} />
        <Alive amount={0.9}>
          <BabyBody uid={uid} y={232} ry={34} />
          <BabyHead uid={uid} y={152} r={46} pose={{ eyes: 'open', smile: true }} />
        </Alive>
      </Camera>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7-kun — birinchi tovushlar
// ─────────────────────────────────────────────────────────────────────────────
function FirstSoundsScene({ uid, accent }: SceneProps) {
  const bubbles = [
    { t: 'а', dx: -46, d: 0 },
    { t: 'гу', dx: 48, d: 0.9 },
    { t: 'ба', dx: -30, d: 1.8 },
    { t: 'ма', dx: 36, d: 2.7 },
  ];
  return (
    <>
      <Bokeh uid={uid} color={accent} count={7} seed={13} />
      {[0, 1].map((i) => (
        <motion.circle
          key={i}
          cx={160}
          cy={168}
          r={58}
          fill="none"
          stroke={accent}
          strokeWidth="2"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: [0.6, 1.7], opacity: [0.5, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: i * 1.2, ease: 'easeOut' }}
        />
      ))}
      <Camera from={1.02} to={1.12} duration={6.4}>
        <GroundShadow uid={uid} cy={272} rx={62} opacity={0.22} />
        <Alive amount={1}>
          <BabyBody uid={uid} y={232} ry={34} />
          <BabyHead uid={uid} y={156} r={44} pose={{ eyes: 'happy', mouthOpen: true }} />
        </Alive>
      </Camera>
      {bubbles.map((b) => (
        <motion.g
          key={b.t}
          initial={{ opacity: 0, y: 0, scale: 0.6 }}
          animate={{ opacity: [0, 1, 1, 0], y: [0, -104], scale: [0.6, 1, 1, 0.9], x: [0, b.dx] }}
          transition={{ duration: 3.6, repeat: Infinity, delay: b.d, ease: 'easeOut' }}
        >
          <circle cx={160} cy={128} r={21} fill={accent} opacity={0.95} />
          <circle cx={160} cy={128} r={21} fill="none" stroke="#fff" strokeWidth="1.4" opacity={0.5} />
          <text x={160} y={135} textAnchor="middle" fontSize="17" fontWeight="800" fill="#123020">
            {b.t}
          </text>
        </motion.g>
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8-kun — o'tirib oldi
// ─────────────────────────────────────────────────────────────────────────────
function SittingScene({ uid, accent }: SceneProps) {
  return (
    <>
      <LightShafts uid={uid} color={accent} opacity={0.2} />
      <Bokeh uid={uid} color={accent} count={6} seed={17} />
      {/* pol chizig'i — chuqurlik */}
      <ellipse cx={160} cy={286} rx={190} ry={40} fill="#000" opacity={0.14} filter={`url(#${uid}-soft)`} />
      <Camera from={1.1} to={1.0} duration={6}>
        <GroundShadow uid={uid} cy={272} rx={78} opacity={0.26} />
        {/* yotgan holatdan tik o'tiradi */}
        <motion.g
          initial={{ rotate: -74, y: 34 }}
          animate={{ rotate: [-74, 6, -2, 0], y: [34, 0, 0, 0] }}
          transition={{ duration: 2.4, ease: [0.3, 1.3, 0.5, 1], times: [0, 0.6, 0.82, 1] }}
          style={{ transformOrigin: '160px 266px' }}
        >
          {/* oyoqlar oldinda */}
          <ellipse cx={122} cy={256} rx={32} ry={14} fill={SKIN} />
          <ellipse cx={198} cy={256} rx={32} ry={14} fill={SKIN} />
          <ellipse cx={122} cy={252} rx={32} ry={10} fill={SKIN_LIGHT} opacity={0.5} />
          <Alive amount={0.7} origin="160px 250px">
            <BabyBody uid={uid} y={216} rx={46} ry={40} />
            <BabyHead uid={uid} y={148} r={42} pose={{ eyes: 'open', smile: true }} />
          </Alive>
        </motion.g>
      </Camera>
      {/* changcha — o'tirganda ko'tariladi */}
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.circle
          key={i}
          cx={108 + i * 22}
          cy={268}
          r={2.6}
          fill={accent}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.7, 0], y: [0, -26], x: [0, i % 2 ? 8 : -8] }}
          transition={{ duration: 1.6, delay: 1.6 + i * 0.08, ease: 'easeOut' }}
        />
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9-kun — emaklash
// ─────────────────────────────────────────────────────────────────────────────
function CrawlingScene({ uid, accent }: SceneProps) {
  return (
    <>
      <Bokeh uid={uid} color={accent} count={6} seed={19} />
      {/* pol perspektivasi */}
      <g opacity={0.18}>
        {[0, 1, 2, 3].map((i) => (
          <line key={i} x1={-40 + i * 90} y1={320} x2={90 + i * 46} y2={244} stroke={accent} strokeWidth="1.6" />
        ))}
        <line x1={0} y1={246} x2={320} y2={246} stroke={accent} strokeWidth="1.6" />
      </g>
      <ellipse cx={160} cy={288} rx={200} ry={44} fill="#000" opacity={0.16} filter={`url(#${uid}-soft)`} />

      <Camera from={1.06} to={1.0} duration={6.4}>
        <motion.g
          initial={{ x: -120 }}
          animate={{ x: [-120, 6, 16] }}
          transition={{ duration: 5.2, ease: 'easeInOut' }}
        >
          <GroundShadow uid={uid} cx={168} cy={270} rx={62} opacity={0.26} />
          {/* tana — emaklash tebranishi */}
          <motion.g
            animate={{ y: [0, -8, 0], rotate: [-2.4, 2.4, -2.4] }}
            transition={{ duration: 0.86, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: '168px 224px' }}
          >
            {/* qo'l-oyoqlar navbatma-navbat */}
            {[
              { cx: 124, cy: 252, d: 0 },
              { cx: 210, cy: 252, d: 0.43 },
            ].map((leg) => (
              <motion.ellipse
                key={leg.cx}
                cx={leg.cx}
                cy={leg.cy}
                rx={17}
                ry={12}
                fill={SKIN}
                animate={{ y: [0, -9, 0], x: [0, 7, 0] }}
                transition={{ duration: 0.86, repeat: Infinity, delay: leg.d, ease: 'easeInOut' }}
              />
            ))}
            <ellipse cx={166} cy={222} rx={56} ry={31} fill={`url(#${uid}-cloth)`} />
            <ellipse cx={166} cy={214} rx={44} ry={16} fill="#fff" opacity={0.35} />
            <BabyHead uid={uid} x={214} y={188} r={34} pose={{ eyes: 'open', smile: true }} />
          </motion.g>
        </motion.g>
      </Camera>

      {/* orqada qolgan izlar */}
      {[0, 1, 2, 3].map((i) => (
        <motion.ellipse
          key={i}
          cx={56 + i * 28}
          cy={266 + (i % 2 ? 7 : -7)}
          rx={7}
          ry={4.5}
          fill={accent}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.6, 0.18] }}
          transition={{ duration: 1, delay: 0.9 + i * 0.55 }}
        />
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 10-kun — ilk qadamlar
// ─────────────────────────────────────────────────────────────────────────────
function FirstStepsScene({ uid, accent }: SceneProps) {
  return (
    <>
      {/* ufq va quyosh — bayram kayfiyati */}
      <motion.circle
        cx={160}
        cy={150}
        r={92}
        fill={`url(#${uid}-glow)`}
        animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <LightShafts uid={uid} color={accent} opacity={0.3} />
      <Bokeh uid={uid} color={accent} count={8} seed={23} />
      <ellipse cx={160} cy={292} rx={210} ry={46} fill="#000" opacity={0.18} filter={`url(#${uid}-soft)`} />

      {/* orqada — ona qo'llari (chaqaloqni kutmoqda) */}
      <motion.g
        opacity={0.32}
        filter={`url(#${uid}-soft)`}
        animate={{ x: [0, 4, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path d="M 262 214 q 34 -16 46 8 q -22 -6 -46 6 z" fill="#3A2205" />
        <path d="M 258 236 q 36 -14 50 10 q -24 -8 -50 4 z" fill="#3A2205" />
      </motion.g>

      {/* oyoq izlari */}
      {[0, 1, 2, 3].map((i) => (
        <motion.ellipse
          key={i}
          cx={78 + i * 30}
          cy={272 + (i % 2 ? 9 : -9)}
          rx={9}
          ry={5.5}
          fill={accent}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: [0, 0.9, 0.35], scale: 1 }}
          transition={{ duration: 0.5, delay: 1.4 + i * 0.5 }}
        />
      ))}

      <Camera from={1.14} to={1.0} duration={7}>
        <motion.g
          initial={{ y: 40, scale: 0.84, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          transition={{ duration: 1.6, ease: [0.3, 1.4, 0.5, 1] }}
        >
          <GroundShadow uid={uid} cy={274} rx={52} opacity={0.3} />
          {/* muvozanatni saqlab qadam tashlaydi */}
          <motion.g
            animate={{ x: [0, 10, 0, -6, 0], rotate: [-3, 3, -2, 2, -3] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: '160px 272px' }}
          >
            {/* oyoqlar navbat bilan */}
            {/*
              DIQQAT: `motion` da `y` — bu ATRIBUT emas, TRANSFORM. Shuning uchun
              qadam harakati NISBIY (0 dan -8 gacha) beriladi; `y={220}` esa
              atribut sifatida qoladi. Aks holda oyoq 220px pastga surilib
              tanadan uzilib qolardi.
            */}
            {[
              { x: 138, d: 0 },
              { x: 166, d: 0.65 },
            ].map((leg) => (
              <motion.rect
                key={leg.x}
                x={leg.x}
                y={220}
                width={17}
                height={50}
                rx={8.5}
                fill={SKIN}
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 1.3, repeat: Infinity, delay: leg.d, ease: 'easeInOut' }}
              />
            ))}
            {/* qo'llar — muvozanat uchun tepada */}
            <motion.g
              animate={{ rotate: [-10, 10, -10] }}
              transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
              style={{ transformOrigin: '160px 192px' }}
            >
              <rect x={100} y={172} width={48} height={16} rx={8} fill={SKIN} transform="rotate(-26 124 180)" />
              <rect x={172} y={172} width={48} height={16} rx={8} fill={SKIN} transform="rotate(26 196 180)" />
            </motion.g>
            <ellipse cx={160} cy={200} rx={42} ry={38} fill={`url(#${uid}-cloth)`} />
            <path d="M 126 208 q 34 22 68 0" stroke={SKIN_SHADOW} strokeWidth="2" fill="none" opacity={0.4} />
            <BabyHead uid={uid} x={160} y={140} r={40} pose={{ eyes: 'happy', smile: true }} />
          </motion.g>
        </motion.g>
      </Camera>

      {/* konfetti */}
      {Array.from({ length: 18 }).map((_, i) => (
        <motion.rect
          key={i}
          x={26 + ((i * 41) % 270)}
          y={-14}
          width={6}
          height={11}
          rx={2}
          fill={['#FF6B6B', '#4ECDC4', '#FFD166', '#8E7BE8', '#6BCB77', '#FFFFFF'][i % 6]}
          initial={{ y: -20, opacity: 0, rotate: 0 }}
          animate={{ y: [-20, 330], opacity: [0, 1, 1, 0], rotate: [0, 260], x: [0, i % 2 ? 14 : -14] }}
          transition={{ duration: 3.6, repeat: Infinity, delay: 1.5 + (i % 9) * 0.26, ease: 'easeIn' }}
        />
      ))}
    </>
  );
}

const SCENES: Record<LifeSceneId, (p: SceneProps) => ReactElement> = {
  birth: BirthScene,
  firstBreath: FirstBreathScene,
  motherEmbrace: MotherEmbraceScene,
  firstSmile: FirstSmileScene,
  hearing: HearingScene,
  colors: ColorsScene,
  firstSounds: FirstSoundsScene,
  sitting: SittingScene,
  crawling: CrawlingScene,
  firstSteps: FirstStepsScene,
};

/** Sahna chizmasi. Ota komponent o'lchamni beradi. */
export default function LifeSceneArt({ id, accent }: { id: LifeSceneId; accent: string }) {
  const uid = `sc-${id}`;
  const Scene = SCENES[id];
  return (
    <svg viewBox="0 0 320 320" className="h-full w-full overflow-visible" role="img" aria-hidden>
      <SceneDefs uid={uid} accent={accent} />
      <Scene uid={uid} accent={accent} />
    </svg>
  );
}
