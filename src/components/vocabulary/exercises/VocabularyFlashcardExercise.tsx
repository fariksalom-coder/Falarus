import { AnimatePresence, motion } from 'motion/react';
import type { VocabularyEntry } from '../../../data/vocabularyContent';

type Props = {
  entries: VocabularyEntry[];
  cardIndex: number;
  cardFlipped: boolean;
  onToggleFlip: () => void;
  knownCount: number;
  unknownCount: number;
  step1SaveError: string | null;
  onKnow: () => void;
  onUnknown: () => void;
  onContinueToTest: () => void;
};

export function VocabularyFlashcardExercise({
  entries,
  cardIndex,
  cardFlipped,
  onToggleFlip,
  knownCount,
  unknownCount,
  step1SaveError,
  onKnow,
  onUnknown,
  onContinueToTest,
}: Props) {
  const current = entries[cardIndex];
  const total = entries.length;

  if (current) {
    return (
      <div className="mx-auto max-w-[720px]">
        {/* Purple gradient progress bar */}
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#DDD7F5]">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${((cardIndex + 1) / total) * 100}%`,
                background: 'linear-gradient(90deg, #8B7AF7, #5B4CE0)',
              }}
            />
          </div>
          <span className="grammar-heading text-[13px] text-[#5B4CE0]">
            {cardIndex + 1}/{total}
          </span>
        </div>

        <p className="mt-3 text-[11px] font-black uppercase tracking-[0.16em] text-[#8B7FAB]">
          VAZIFA 1 · TANISHISH
        </p>

        {/* Counters — mint + rose pill cards */}
        <div className="mt-3 flex gap-2.5">
          <div className="flex-1 rounded-[16px] border-[1.5px] border-[#82E5B8] bg-[#DCFCE7] p-3 text-center shadow-[0_6px_14px_-8px_rgba(34,197,94,0.25)]">
            <p className="text-[10.5px] font-black uppercase tracking-[0.14em] text-[#0F7C3A]">BILAMAN</p>
            <p className="grammar-heading mt-0.5 text-[24px] leading-none text-[#0F7C3A]">{knownCount}</p>
          </div>
          <div className="flex-1 rounded-[16px] border-[1.5px] border-[#F5B5B5] bg-[#FEEBEB] p-3 text-center shadow-[0_6px_14px_-8px_rgba(180,40,46,0.20)]">
            <p className="text-[10.5px] font-black uppercase tracking-[0.14em] text-[#B4282E]">BILMAYMAN</p>
            <p className="grammar-heading mt-0.5 text-[24px] leading-none text-[#B4282E]">{unknownCount}</p>
          </div>
        </div>

        {/* Purple flashcard — slide-in on new word, flip on tap */}
        <div className="relative mt-4 h-[300px]" style={{ perspective: '1400px' }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.button
              key={cardIndex}
              type="button"
              onClick={onToggleFlip}
              className="absolute inset-0 w-full cursor-pointer overflow-hidden rounded-[28px]"
              style={{ transformStyle: 'preserve-3d' }}
              initial={{ x: 90, opacity: 0, rotateY: -14, scale: 0.94 }}
              animate={{ x: 0, opacity: 1, rotateY: 0, scale: 1 }}
              exit={{ x: -90, opacity: 0, rotateY: 14, scale: 0.94 }}
              transition={{ duration: 0.42, ease: [0.32, 0.72, 0, 1] }}
            >
            {/* Front face — purple gradient (Ruscha) */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-[28px] p-8 text-white transition-transform duration-500 ease-out"
              style={{
                background: 'linear-gradient(155deg, #7B6BEE 0%, #5B4CE0 60%, #4C3EC7 100%)',
                boxShadow: '0 24px 44px -14px rgba(91, 76, 224, 0.55)',
                transform: cardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                backfaceVisibility: 'hidden',
              }}
            >
              <div
                className="pointer-events-none absolute -right-10 -top-10 h-[140px] w-[140px] rounded-full"
                style={{ background: 'rgba(255,255,255,0.14)' }}
              />
              <div
                className="pointer-events-none absolute -left-6 -bottom-6 h-[100px] w-[100px] rounded-full"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              />
              <span className="text-[11px] font-black uppercase tracking-[0.28em] text-white/75">
                RUSCHA
              </span>
              <p className="grammar-heading mt-3 text-center text-[44px] leading-none tracking-[-0.02em]">
                {current.russian}
              </p>
              <span className="absolute bottom-4 text-[12px] font-bold text-white/70">
                👆 aylantirish uchun bosing
              </span>
            </div>
            {/* Back face — white card (O'zbekcha) */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center rounded-[28px] border-[1.5px] border-[#DDD7F5] bg-white p-8 transition-transform duration-500 ease-out"
              style={{
                boxShadow: '0 24px 44px -14px rgba(45,27,105,0.14)',
                transform: cardFlipped ? 'rotateY(0deg)' : 'rotateY(-180deg)',
                backfaceVisibility: 'hidden',
              }}
            >
              <span className="text-[11px] font-black uppercase tracking-[0.28em] text-[#8B7FAB]">
                O'ZBEKCHA
              </span>
              <p className="grammar-heading mt-3 text-center text-[36px] leading-tight text-[#2D1B69]">
                {current.uzbek}
              </p>
              <span className="absolute bottom-4 text-[12px] font-bold text-[#8B7FAB]">
                👆 orqaga aylantirish
              </span>
            </div>
            </motion.button>
          </AnimatePresence>
        </div>

        {/* Buttons — rose outline + mint solid */}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onUnknown}
            className="grammar-heading flex-1 rounded-full border-[1.5px] border-[#F5B5B5] bg-[#FEEBEB] py-4 text-[16px] text-[#B4282E] shadow-[0_12px_24px_-10px_rgba(180,40,46,0.35)] transition-transform active:scale-[0.98]"
          >
            Bilmayman
          </button>
          <button
            type="button"
            onClick={onKnow}
            className="grammar-heading flex-1 rounded-full bg-[#22C55E] py-4 text-[16px] text-white shadow-[0_14px_28px_-10px_rgba(34,197,94,0.55)] transition-transform active:scale-[0.98]"
          >
            Bilaman
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[720px]">
      <div className="rounded-[24px] border-[1.5px] border-[#DDD7F5] bg-white p-8 text-center shadow-[0_10px_28px_-14px_rgba(45,27,105,0.14)]">
        <p className="grammar-heading text-[22px] text-[#2D1B69]">Tanishish yakunlandi 🎉</p>
        <p className="mt-2 text-sm font-black text-[#8B7FAB]">
          Natija saqlandi. Keyingi bosqich — test.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#DCFCE7] px-4 py-2 text-sm font-black text-[#0F7C3A]">
            ✓ Biladi: {knownCount}
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#FEEBEB] px-4 py-2 text-sm font-black text-[#B4282E]">
            ✕ Bilmaydi: {unknownCount}
          </div>
          {step1SaveError ? (
            <p className="max-w-sm text-center text-sm text-[#B4282E]">
              {step1SaveError}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onContinueToTest}
          className="grammar-heading mt-6 w-full rounded-full bg-[#5B4CE0] px-5 py-3.5 text-[15px] text-white shadow-[0_14px_28px_-12px_rgba(91,76,224,0.55)]"
        >
          2-bosqichga o'tish (test) →
        </button>
      </div>
    </div>
  );
}
