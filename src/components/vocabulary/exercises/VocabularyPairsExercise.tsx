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
      <div className="mx-auto max-w-[720px]" style={{ backgroundColor: '#F8FAFC' }}>
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
        <p className="text-center text-sm font-medium" style={{ color: '#64748B' }}>
          Guruh {pairGroupIndex + 1} / {pairGroups.length}
        </p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${pairGroups.length > 0 ? ((pairGroupIndex + 1) / pairGroups.length) * 100 : 0}%`,
              backgroundColor: '#6366F1',
            }}
          />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="space-y-3">
            {current.left.map((left) => {
              const done = matched.includes(left.id);
              const selected = pairSelectedLeft === left.id;
              const isWrong = wrongPairIds?.includes(left.id);
              const cardCls = `w-full rounded-[14px] border-2 px-4 py-4 text-left text-base font-medium shadow-sm transition-all duration-200 ${done ? 'border-[#22C55E] bg-[#F0FDF4] text-[#166534] cursor-default' : isWrong ? 'border-[#EF4444] bg-[#FEF2F2] text-[#B91C1C] pair-shake' : selected ? 'border-[#6366F1] bg-[#EEF2FF] text-[#0F172A]' : 'border-[#E2E8F0] bg-white text-[#0F172A] hover:border-[#6366F1] hover:bg-[#EEF2FF] hover:shadow-md'}`;
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
          <div className="space-y-3">
            {current.right.map((right) => {
              const done = matched.includes(right.id);
              const isWrong = wrongPairIds?.includes(right.id);
              const cardCls = `w-full rounded-[14px] border-2 px-4 py-4 text-left text-base font-medium shadow-sm transition-all duration-200 ${done ? 'border-[#22C55E] bg-[#F0FDF4] text-[#166534] cursor-default' : isWrong ? 'border-[#EF4444] bg-[#FEF2F2] text-[#B91C1C] pair-shake' : 'border-[#E2E8F0] bg-white text-[#0F172A] hover:border-[#6366F1] hover:bg-[#EEF2FF] hover:shadow-md'}`;
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

        {pairMessage ? (
          <p
            className="mt-4 text-center text-sm font-medium"
            style={{ color: pairMessage.includes("To'g'ri") ? '#166534' : '#B91C1C' }}
          >
            {pairMessage}
          </p>
        ) : null}

        {isGroupDone ? (
          <div className="mt-8">
            <p className="text-center text-xl font-semibold" style={{ color: '#0F172A' }}>
              Ajoyib!
            </p>
            <button
              type="button"
              onClick={pairGroupIndex + 1 === pairGroups.length ? onFinish : onNextGroup}
              className="mt-4 w-full rounded-[14px] py-4 text-lg font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              style={{ backgroundColor: '#6366F1' }}
            >
              {pairGroupIndex + 1 === pairGroups.length ? 'Tugatish' : 'Keyingi guruh →'}
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[720px]" style={{ backgroundColor: '#F8FAFC' }}>
      <div className="rounded-[20px] border bg-white p-12 text-center shadow-sm" style={{ borderColor: '#E2E8F0' }}>
        <p className="text-xl font-semibold" style={{ color: '#0F172A' }}>
          Juftliklar tugallandi
        </p>
        {pointsEarnedMessage != null && pointsEarnedMessage > 0 ? (
          <p className="mt-3 text-base font-semibold text-emerald-600">
            Siz {pointsEarnedMessage} ball oldingiz! Barakalla!
          </p>
        ) : null}
        <button
          type="button"
          onClick={onFinish}
          className="mt-6 w-full rounded-xl bg-indigo-600 px-5 py-3.5 text-base font-semibold text-white shadow-md transition-colors hover:bg-indigo-700"
        >
          Vazifalar ro‘yxatiga qaytish
        </button>
      </div>
    </div>
  );
}
