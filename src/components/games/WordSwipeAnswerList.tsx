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
      className={`flex min-h-0 w-full flex-col overflow-hidden rounded-[18px] border border-white/20 bg-white/12 p-2 backdrop-blur-md sm:rounded-[26px] sm:p-3 ${className}`}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain pr-0.5 sm:gap-2 sm:pr-1">
        {words.map((word) => {
          const idKey = wordEntryIdKey(word.id);
          const found = foundIds.has(idKey);
          const hinted = hintedId === idKey;
          const ru = normalizeWordRu(word.ru);
          const letters = found ? [...ru] : [];

          return (
            <div
              key={idKey}
              className={`rounded-xl border px-2.5 py-2 transition-colors duration-300 sm:rounded-2xl sm:px-3 sm:py-3 ${
                found
                  ? 'border-emerald-200 bg-emerald-100'
                  : hinted
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-slate-200/90 bg-slate-100/95'
              }`}
            >
              <div className="mb-1.5 flex items-center justify-between gap-2 sm:mb-2 sm:gap-3">
                <p
                  className={`min-w-0 truncate text-[11px] font-extrabold uppercase tracking-[0.1em] sm:text-[12px] sm:tracking-[0.12em] ${
                    found ? 'text-emerald-700' : hinted ? 'text-amber-700' : 'text-slate-600'
                  }`}
                >
                  {word.uz}
                </p>
                <span
                  className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-black sm:px-2 sm:text-[10px] ${
                    found
                      ? 'bg-emerald-500 text-white'
                      : hinted
                        ? 'bg-amber-400 text-white'
                        : 'bg-white text-slate-500 shadow-sm'
                  }`}
                >
                  {ru.length}
                </span>
              </div>

              <div className="flex min-w-0 flex-wrap gap-1 sm:gap-1.5">
                {Array.from({ length: ru.length }).map((_, idx) => {
                  const cellLetter = found ? letters[idx] : hinted && idx === 0 ? ru[idx] : null;

                  return (
                    <span
                      key={`${idKey}-${idx}`}
                      className={`flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-black sm:h-9 sm:w-9 sm:rounded-lg sm:text-[13px] ${
                        found
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : hinted && idx === 0
                            ? 'bg-amber-400 text-white shadow-sm'
                            : 'border-2 border-slate-300 bg-white text-slate-400 shadow-[0_1px_3px_rgba(15,23,42,0.08)]'
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
