import type { WordSwipeEntry } from '../../../shared/wordSwipeUtils';
import { normalizeWordRu, wordEntryIdKey } from '../../../shared/wordSwipeUtils';

type WordSwipeAnswerListProps = {
  words: WordSwipeEntry[];
  foundIds: Set<string>;
  /** Map of wordEntryIdKey → how many leading letters have been revealed via hint. */
  hintCounts: Record<string, number>;
  className?: string;
};

export default function WordSwipeAnswerList({
  words,
  foundIds,
  hintCounts,
  className = '',
}: WordSwipeAnswerListProps) {
  const foundCount = words.filter((w) => foundIds.has(wordEntryIdKey(w.id))).length;

  return (
    <div className={`flex min-h-0 w-full flex-col overflow-hidden ${className}`}>
      {/* Header: "TOPILADIGAN SO'ZLAR" caption + counter pill */}
      <div className="flex shrink-0 items-center justify-between px-1 pb-2 pt-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/80">
          Topiladigan so'zlar
        </p>
        <span className="rounded-full bg-white/16 px-2.5 py-0.5 text-[11px] font-bold text-white ring-1 ring-white/20">
          {foundCount}/{words.length}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain pr-0.5 sm:gap-2.5 sm:pr-1">
        {words.map((word) => {
          const idKey = wordEntryIdKey(word.id);
          const found = foundIds.has(idKey);
          const revealedCount = hintCounts[idKey] ?? 0;
          const hinted = !found && revealedCount > 0;
          const ru = normalizeWordRu(word.ru);
          const letters = found ? [...ru] : [];

          return (
            <div
              key={idKey}
              className={`flex items-center gap-2 rounded-full px-3.5 py-2 transition-colors duration-300 ring-1 sm:gap-2.5 sm:px-4 sm:py-2.5 ${
                found
                  ? 'ring-[#4CE3B2]/60'
                  : hinted
                    ? 'ring-[#FFD873]/50'
                    : 'ring-white/20'
              }`}
              style={{
                background: found
                  ? 'linear-gradient(90deg, rgba(76,227,178,0.25) 0%, rgba(37,209,154,0.18) 100%)'
                  : hinted
                    ? 'linear-gradient(90deg, rgba(255,216,115,0.20) 0%, rgba(255,197,61,0.14) 100%)'
                    : 'rgba(255,255,255,0.10)',
              }}
            >
              <p
                className={`min-w-0 flex-1 truncate text-[13px] font-bold uppercase tracking-[0.14em] sm:text-[14px] ${
                  found ? 'text-white' : hinted ? 'text-[#FFE9B0]' : 'text-white/90'
                }`}
              >
                {word.uz}
              </p>

              <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
                {Array.from({ length: ru.length }).map((_, idx) => {
                  const isRevealed = !found && idx < revealedCount;
                  const cellLetter = found ? letters[idx] : isRevealed ? ru[idx] : null;

                  return (
                    <span
                      key={`${idKey}-${idx}`}
                      className={`flex h-7 w-7 items-center justify-center rounded-[8px] text-[12px] font-bold sm:h-8 sm:w-8 sm:text-[13px] ${
                        found
                          ? 'text-white shadow-[0_3px_8px_-2px_rgba(37,209,154,0.5)]'
                          : isRevealed
                            ? 'text-[#22306B] shadow-[0_3px_8px_-2px_rgba(255,197,61,0.5)]'
                            : 'text-white/50 ring-1 ring-white/25'
                      }`}
                      style={
                        found
                          ? { background: 'linear-gradient(150deg, #4CE3B2 0%, #25D19A 100%)' }
                          : isRevealed
                            ? { background: 'linear-gradient(150deg, #FFE9B0 0%, #FFC53D 100%)' }
                            : { backgroundColor: 'rgba(255,255,255,0.08)' }
                      }
                    >
                      {cellLetter ?? ''}
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
