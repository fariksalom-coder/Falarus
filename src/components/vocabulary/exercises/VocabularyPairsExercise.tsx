import { AnimatePresence, motion } from 'motion/react';
import type { VocabularyEntry } from '../../../data/vocabularyContent';
import { shuffle } from '../vocabExerciseUtils';

export type PairGroupView = {
  id: number;
  pairs: VocabularyEntry[];
  left: { id: string; pairId: number; text: string }[];
  right: { id: string; pairId: number; text: string }[];
};

type Props = {
  pairGroups: PairGroupView[];
  pairGroupIndex: number;
  pairSelectedLeft: string | null;
  matched: string[];
  pairMessage: string;
  wrongPairIds: string[] | null;
  pointsEarnedMessage: number | null;
  onPickLeft: (id: string) => void;
  onPickRight: (id: string) => void;
  onNextGroup: () => void;
  onFinish: () => void;
};

export function buildPairGroups(groups: VocabularyEntry[][]): PairGroupView[] {
  return groups.map((group, idx) => ({
    id: idx,
    pairs: group,
    left: shuffle(group.map((p, i) => ({ id: `${idx}-l-${i}`, pairId: i, text: p.russian }))),
    right: shuffle(group.map((p, i) => ({ id: `${idx}-r-${i}`, pairId: i, text: p.uzbek }))),
  }));
}

export function VocabularyPairsExercise({
  pairGroups,
  pairGroupIndex,
  pairSelectedLeft,
  matched,
  pairMessage,
  wrongPairIds,
  pointsEarnedMessage,
  onPickLeft,
  onPickRight,
  onNextGroup,
  onFinish,
}: Props) {
  const current = pairGroups[pairGroupIndex];
  const isGroupDone = current ? matched.length === current.pairs.length * 2 : false;

  if (current) {
    return (
      <div className="mx-auto max-w-[720px]">
        <style>{`
          @keyframes pair-shake {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(-6px); }
            40% { transform: translateX(6px); }
            60% { transform: translateX(-4px); }
            80% { transform: translateX(4px); }
          }
          .pair-shake { animation: pair-shake 0.5s ease-in-out; }
        `}</style>

        {/* Purple gradient progress bar */}
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#DDD7F5]">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${pairGroups.length > 0 ? ((pairGroupIndex + 1) / pairGroups.length) * 100 : 0}%`,
                background: 'linear-gradient(90deg, #8B7AF7, #5B4CE0)',
              }}
            />
          </div>
          <span className="grammar-heading text-[13px] text-[#5B4CE0]">
            Guruh {pairGroupIndex + 1}/{pairGroups.length}
          </span>
        </div>

        {/* Caption + heading */}
        <div className="mt-4">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8B7FAB]">
            VAZIFA 3 · JUFTINI TOPING
          </p>
          <p className="grammar-heading mt-1 text-[22px] leading-tight text-[#2D1B69]">Mos juftni tanlang</p>
          <p className="mt-0.5 text-[13px] font-bold text-[#8B7FAB]">
            Ruscha so'zni o'zbekchasiga ulang
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-[11px]">
            {current.left.map((left) => {
              const done = matched.includes(left.id);
              const selected = pairSelectedLeft === left.id;
              const isWrong = wrongPairIds?.includes(left.id);
              let cardCls =
                'grammar-heading flex min-h-[54px] w-full items-center justify-center rounded-full border-[1.5px] border-[#DDD7F5] bg-white px-4 py-3 text-center text-[15px] text-[#2D1B69] shadow-[0_6px_14px_-8px_rgba(45,27,105,0.12)] transition-all';
              if (done) {
                cardCls =
                  'grammar-heading flex min-h-[54px] w-full items-center justify-center rounded-full border-[1.5px] border-[#82E5B8] bg-[#DCFCE7] px-4 py-3 text-center text-[15px] text-[#0F7C3A] cursor-default shadow-[0_6px_14px_-8px_rgba(34,197,94,0.35)]';
              } else if (isWrong) {
                cardCls =
                  'grammar-heading flex min-h-[54px] w-full items-center justify-center rounded-full border-[1.5px] border-[#F5B5B5] bg-[#FEEBEB] px-4 py-3 text-center text-[15px] text-[#B4282E] pair-shake';
              } else if (selected) {
                cardCls =
                  'grammar-heading flex min-h-[54px] w-full items-center justify-center rounded-full border-2 border-[#5B4CE0] bg-[#EDE9FB] px-4 py-3 text-center text-[15px] text-[#2D1B69] shadow-[0_0_0_4px_rgba(91,76,224,0.14)]';
              }
              return (
                <button
                  key={left.id}
                  type="button"
                  disabled={done}
                  onClick={() => onPickLeft(left.id)}
                  className={cardCls}
                >
                  {left.text}
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-[11px]">
            {current.right.map((right) => {
              const done = matched.includes(right.id);
              const isWrong = wrongPairIds?.includes(right.id);
              let cardCls =
                'grammar-heading flex min-h-[54px] w-full items-center justify-center rounded-full border-[1.5px] border-[#DDD7F5] bg-white px-4 py-3 text-center text-[15px] text-[#2D1B69] shadow-[0_6px_14px_-8px_rgba(45,27,105,0.12)] transition-all';
              if (done) {
                cardCls =
                  'grammar-heading flex min-h-[54px] w-full items-center justify-center rounded-full border-[1.5px] border-[#82E5B8] bg-[#DCFCE7] px-4 py-3 text-center text-[15px] text-[#0F7C3A] cursor-default shadow-[0_6px_14px_-8px_rgba(34,197,94,0.35)]';
              } else if (isWrong) {
                cardCls =
                  'grammar-heading flex min-h-[54px] w-full items-center justify-center rounded-full border-[1.5px] border-[#F5B5B5] bg-[#FEEBEB] px-4 py-3 text-center text-[15px] text-[#B4282E] pair-shake';
              }
              return (
                <button
                  key={right.id}
                  type="button"
                  disabled={done}
                  onClick={() => onPickRight(right.id)}
                  className={cardCls}
                >
                  {right.text}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex min-h-[40px] justify-center">
          <AnimatePresence mode="wait">
            {pairMessage ? (
              <motion.span
                key={`pm-${pairGroupIndex}-${pairMessage}`}
                initial={{ opacity: 0, y: 6, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.94 }}
                transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                className={`${pairMessage.includes("To'g'ri") ? 'bg-[#DCFCE7] text-[#0F7C3A] shadow-[0_6px_14px_-8px_rgba(34,197,94,0.35)]' : 'msg-shake bg-[#FEEBEB] text-[#B4282E] shadow-[0_6px_14px_-8px_rgba(180,40,46,0.35)]'} inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-black`}
              >
                <span aria-hidden>{pairMessage.includes("To'g'ri") ? '🎉' : '✕'}</span>
                <span>{pairMessage}</span>
              </motion.span>
            ) : null}
          </AnimatePresence>
        </div>

        {isGroupDone ? (
          <div className="mt-6">
            <p className="grammar-heading text-center text-[20px] text-[#2D1B69]">Ajoyib! 🎉</p>
            <button
              type="button"
              onClick={pairGroupIndex + 1 === pairGroups.length ? onFinish : onNextGroup}
              className="grammar-heading mt-4 h-[54px] w-full rounded-full bg-[#22C55E] text-[16px] text-white shadow-[0_14px_26px_-12px_rgba(34,197,94,0.55)] active:scale-[0.99]"
            >
              {pairGroupIndex + 1 === pairGroups.length ? 'Tugatish 🎯' : 'Keyingi guruh →'}
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[720px]">
      <div className="rounded-[24px] border border-[#EAEFF7] bg-white p-8 text-center shadow-[0_8px_20px_rgba(23,34,74,0.06)]">
        <p className="text-[19px] font-extrabold text-app-text">Juftliklar tugallandi</p>
        {pointsEarnedMessage != null && pointsEarnedMessage > 0 ? (
          <p className="mt-3 text-base font-black text-[#12813F]">
            Siz {pointsEarnedMessage} ball oldingiz! Barakalla!
          </p>
        ) : null}
        <button
          type="button"
          onClick={onFinish}
          className="mt-6 h-[54px] w-full rounded-[16px] bg-[#0B2A6B] px-5 text-[16px] font-extrabold text-white shadow-[0_14px_28px_-10px_rgba(11,42,107,0.5)]"
        >
          Vazifalar ro'yxatiga qaytish
        </button>
      </div>
    </div>
  );
}
