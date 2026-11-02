/**
 * LifeSceneOverlay — kun ochilishidan oldin to'liq ekranda o'ynaydigan sahna.
 *
 * "Video kabi" tuyulishi uchun: fon gradienti, markazdagi jonli SVG, matn
 * bosqichma-bosqich chiqadi, tepada progress chizig'i yuradi, oxirida o'zi
 * yopiladi va kun ochiladi.
 *
 * O'quvchi kutib qolmasligi uchun HAR DOIM "O'tkazib yuborish" tugmasi bor va
 * ekranning istalgan joyiga bosish ham sahnani tugatadi.
 *
 * `prefers-reduced-motion` yoqilgan bo'lsa animatsiya qisqartiriladi — bu
 * qulaylik talabi, ba'zi foydalanuvchilarda harakat bosh aylanishiga sabab.
 */
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SkipForward } from 'lucide-react';
import type { LifeScene } from '../../data/lifeJourney';
import LifeSceneArt from './LifeScenes';

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const on = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

export default function LifeSceneOverlay({
  scene,
  onDone,
}: {
  scene: LifeScene;
  onDone: () => void;
}) {
  const reduced = usePrefersReducedMotion();
  const duration = reduced ? 1600 : scene.durationMs;
  const [closing, setClosing] = useState(false);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setClosing(true);
    // Yopilish animatsiyasi tugagach chaqiramiz.
    window.setTimeout(onDone, 260);
  };

  useEffect(() => {
    const t = window.setTimeout(finish, duration);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') finish();
    };
    window.addEventListener('keydown', onKey);
    // Sahna ochilganda orqa fon aylanmasin.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  const [g1, g2, g3] = scene.bg;

  return (
    <AnimatePresence>
      {!closing ? (
        <motion.div
          key="life-scene"
          className="fixed inset-0 z-[100] flex flex-col overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
          style={{ background: `linear-gradient(165deg, ${g1} 0%, ${g2} 52%, ${g3} 100%)` }}
          onClick={finish}
          role="dialog"
          aria-label={`${scene.day}-kun: ${scene.title}`}
        >
          {/* Progress — "video" tuyg'usini beradi */}
          <div className="absolute left-0 right-0 top-0 z-[5] h-[3px] bg-white/15">
            <motion.div
              className="h-full bg-white/85"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: duration / 1000, ease: 'linear' }}
            />
          </div>

          {/* Yumshoq nur dog'lari */}
          <div
            aria-hidden
            className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full blur-3xl"
            style={{ background: `${scene.accent}22` }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full blur-3xl"
            style={{ background: `${scene.accent}18` }}
          />

          {/* Kun raqami */}
          <motion.div
            className="relative z-[4] px-6 pt-[max(1.75rem,env(safe-area-inset-top))]"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6 }}
          >
            <p className="text-[11px] font-black uppercase tracking-[0.34em] text-white/70">
              {scene.day}-kun
            </p>
          </motion.div>

          {/*
            Sahna. Kadr kabi tuyulishi uchun tasvir ekranni to'ldiradi va
            sekin yaqinlashadi — statik ramkadagi rasm emas, "olib borilayotgan"
            kadr hissi paydo bo'ladi.
          */}
          <motion.div
            className="absolute inset-0 z-[1] flex items-center justify-center"
            initial={{ scale: reduced ? 1 : 1.08, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: reduced ? 0.3 : 1.4, ease: 'easeOut' }}
          >
            <div className="aspect-square w-[min(100vw,440px)] -translate-y-[15%]">
              <LifeSceneArt id={scene.id} accent={scene.accent} />
            </div>
          </motion.div>

          {/* Butun ekran vinyetkasi — e'tiborni markazga tortadi */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[2]"
            style={{
              background:
                'radial-gradient(circle at 50% 40%, rgba(0,0,0,0) 42%, rgba(6,4,16,0.30) 74%, rgba(6,4,16,0.62) 100%)',
            }}
          />

          {/*
            Film donadorligi — juda past shaffoflikda. Raqamli gradientlar
            "yassi" ko'rinadi, mayda shovqin esa ularga plyonka fakturasini
            beradi. SVG ichida (CSP data: URI ga ruxsat bermaydi).
          */}
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[3] h-full w-full opacity-[0.07] mix-blend-overlay"
          >
            <filter id="grain">
              <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#grain)" />
          </svg>

          {/*
            Matn ostidagi qorong'u parda. Fon gradientlari har xil yorqinlikda
            (10-kun oltin, 7-kun och yashil) — pardasiz oq matn o'qilmay qolardi.
            Video subtitrlarida ishlatiladigan usul: matn ortiga yumshoq scrim.
          */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-[54%]"
            style={{
              background:
                'linear-gradient(to top, rgba(8,6,20,0.80) 0%, rgba(8,6,20,0.52) 38%, rgba(8,6,20,0) 100%)',
            }}
          />

          {/* Matn */}
          <div className="relative z-[4] mt-auto px-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
            <motion.h2
              className="text-[30px] font-black leading-[1.05] tracking-[-0.02em] text-white"
              initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ delay: reduced ? 0.1 : 1.1, duration: 0.9, ease: 'easeOut' }}
            >
              {scene.title}
            </motion.h2>
            <motion.div
              className="mt-3 h-[3px] w-14 rounded-full"
              style={{ background: scene.accent }}
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: reduced ? 0.2 : 1.3, duration: 0.5 }}
            />
            <motion.p
              className="mt-3.5 max-w-[34ch] text-[15px] font-semibold leading-snug text-white/90"
              initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ delay: reduced ? 0.25 : 1.8, duration: 0.8 }}
            >
              {scene.subtitle}
            </motion.p>
            {/*
              "Dars" satri — chapdan urg'u chizig'i bilan. Rang o'rniga chiziq
              ishlatiladi: och accent ranglar (masalan 10-kunda oq) matn sifatida
              o'qilmasdi, chiziq sifatida esa yaxshi ko'rinadi.
            */}
            <motion.p
              className="mt-3.5 max-w-[34ch] border-l-[3px] pl-3 text-[13.5px] font-bold leading-snug text-white/95"
              style={{ borderColor: scene.accent }}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduced ? 0.35 : 2.6, duration: 0.7 }}
            >
              {scene.lesson}
            </motion.p>

            <motion.button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                finish();
              }}
              className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-white/14 px-4 text-[14px] font-black text-white ring-1 ring-white/25 backdrop-blur transition active:scale-95"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reduced ? 0.4 : 1.8, duration: 0.5 }}
            >
              Darsga o'tish <SkipForward className="h-4 w-4" strokeWidth={2.6} />
            </motion.button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
