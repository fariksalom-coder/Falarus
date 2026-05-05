import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { PLATFORM_TUTORIAL_VIDEOS, type PlatformTutorialVideo } from '../../data/platformTutorialVideos';

const GRADIENT_RING =
  'linear-gradient(135deg, #34d399 0%, #2dd4bf 42%, #22d3ee 100%)';

type ActiveTutorial = PlatformTutorialVideo | null;

export default function PlatformTutorialStrip({ className = '' }: { className?: string }) {
  const [active, setActive] = useState<ActiveTutorial>(null);

  const close = useCallback(() => setActive(null), []);

  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  return (
    <>
      <section className={`mb-0 w-full min-w-0 ${className}`} aria-label="Video qo‘llanmalar">
        <div className="w-full min-w-0 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-0 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max min-w-0 gap-3 py-0 pl-0.5 pr-3 sm:pr-4">
            {PLATFORM_TUTORIAL_VIDEOS.map((item, index) => (
              <TutorialCircle
                key={item.id}
                item={item}
                index={index}
                onOpen={() => setActive(item)}
              />
            ))}
          </div>
        </div>
      </section>

      <AnimatePresence>
        {active ? (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="platform-tutorial-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
            onClick={close}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
              className="relative w-full max-w-lg overflow-hidden rounded-[24px] bg-white shadow-[0_24px_64px_rgba(15,23,42,0.2)]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={close}
                className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100"
                aria-label="Yopish"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="border-b border-slate-100 px-5 pb-4 pt-5 pr-14">
                <h3
                  id="platform-tutorial-title"
                  className="text-[17px] font-bold leading-snug text-[#0F172A]"
                >
                  {active.titleUz}
                </h3>
              </div>

              <div className="p-5 pt-4">
                {active.youtubeId ? (
                  <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-slate-950">
                    <iframe
                      title={active.titleUz}
                      src={`https://www.youtube-nocookie.com/embed/${active.youtubeId}?rel=0&modestbranding=1&playsinline=1`}
                      className="absolute inset-0 h-full w-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center">
                    <p className="text-sm font-medium leading-relaxed text-[#475569]">
                      Video hali joylanmagan. Tez orada bu bo‘lim uchun qo‘llanma videosi
                      paydo bo‘ladi.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function TutorialCircle({
  item,
  index,
  onOpen,
}: {
  item: PlatformTutorialVideo;
  index: number;
  onOpen: () => void;
}) {
  const Icon = item.Icon;

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.04 * index, ease: [0.32, 0.72, 0, 1] }}
      whileTap={{ scale: 0.94 }}
      className="flex w-[76px] shrink-0 flex-col items-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      <span className="relative h-[56px] w-[56px] shrink-0 rounded-full p-[2px]" style={{ background: GRADIENT_RING }}>
        <span className="flex h-full w-full items-center justify-center rounded-full bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#2563EB] shadow-[0_8px_18px_rgba(37,99,235,0.35)]">
            <Icon className="h-[18px] w-[18px] text-white" aria-hidden strokeWidth={2.25} />
          </span>
        </span>
      </span>
      <span className="line-clamp-2 w-full text-center text-[10px] font-semibold leading-[1.25] text-[#475569]">
        {item.titleUz}
      </span>
    </motion.button>
  );
}
