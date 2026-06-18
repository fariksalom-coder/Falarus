import type { WordSwipeEntry } from '../../../shared/wordSwipeUtils';
import { normalizeWordRu, wordEntryIdKey } from '../../../shared/wordSwipeUtils';

type WordSwipeAnswerListProps = {
  words: WordSwipeEntry[];
  foundIds: Set<string>;
  hintedId: string | null;
  className?: string;
};

export default function WordSwipeAnswerList({
  words,
  foundIds,
  hintedId,
  className = '',
}: WordSwipeAnswerListProps) {
  return (
    <div
      className={`flex max-h-full w-full flex-col rounded-[22px] border border-white/20 bg-white/12 p-2.5 backdrop-blur-md sm:rounded-[26px] sm:p-3 ${className}`}
    >
      <div className="flex min-h-0 flex-col gap-2 overflow-y-auto pr-1">
        {words.map((word) => {
          const idKey = wordEntryIdKey(word.id);
          const found = foundIds.has(idKey);
          const hinted = hintedId === idKey;
          const ru = normalizeWordRu(word.ru);
          const letters = found ? [...ru] : [];

          return (
            <div
              key={idKey}
              className={`rounded-2xl px-3 py-3 transition-colors duration-300 ${
                found ? 'bg-emerald-100' : hinted ? 'bg-amber-50' : 'bg-white/92'
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <p
                  className={`min-w-0 truncate text-[12px] font-extrabold uppercase tracking-[0.12em] ${
                    found ? 'text-emerald-700' : hinted ? 'text-amber-700' : 'text-slate-600'
                  }`}
                >
                  {word.uz}
                </p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${
                    found ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {ru.length}
                </span>
              </div>

              <div className="flex min-w-0 flex-wrap gap-1.5">
                {Array.from({ length: ru.length }).map((_, idx) => {
                  const cellLetter = found ? letters[idx] : hinted && idx === 0 ? ru[idx] : null;

                  return (
                    <span
                      key={`${idKey}-${idx}`}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-[13px] font-black sm:h-9 sm:w-9 ${
                        found
                          ? 'bg-emerald-500 text-white'
                          : hinted && idx === 0
                            ? 'bg-amber-400 text-white'
                            : 'border border-slate-200 bg-white text-slate-300'
                      }`}
                    >
                      {cellLetter ?? '·'}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
