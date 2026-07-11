import { useCallback, useMemo, useRef, useState } from 'react';
import {
  backtrackPath,
  coordKey,
  lettersFromPath,
  matchWordFromLetters,
  closestCellAtPointer,
  neighborTowardPointer,
  wordEntryIdKey,
  type GridCoord,
  type WordSwipeEntry,
} from '../../../shared/wordSwipeUtils';

type WordSwipeBoardProps = {
  grid: string[][];
  gridRows: number;
  gridCols: number;
  words: WordSwipeEntry[];
  foundIds: Set<string>;
  foundCellKeys: Set<string>;
  onWordFound: (word: WordSwipeEntry, path: GridCoord[]) => void;
  className?: string;
};

function pathHasCoord(path: GridCoord[], row: number, col: number): boolean {
  return path.some((p) => p.row === row && p.col === col);
}

export default function WordSwipeBoard({
  grid,
  gridRows,
  gridCols,
  words,
  foundIds,
  foundCellKeys,
  onWordFound,
  className = '',
}: WordSwipeBoardProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [path, setPath] = useState<GridCoord[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [flash, setFlash] = useState<'ok' | 'miss' | null>(null);

  const pathKeys = useMemo(() => new Set(path.map((p) => coordKey(p.row, p.col))), [path]);

  const resolveSelection = useCallback(
    (currentPath: GridCoord[]) => {
      if (currentPath.length === 0) return;
      const letters = lettersFromPath(currentPath, grid);
      const match = matchWordFromLetters(letters, words);
      if (match && !foundIds.has(wordEntryIdKey(match.id))) {
        onWordFound(match, currentPath);
        setFlash('ok');
      } else {
        setFlash('miss');
      }
      window.setTimeout(() => setFlash(null), 320);
    },
    [foundIds, grid, onWordFound, words],
  );

  const handleGridPointerDown = (e: React.PointerEvent) => {
    if (!gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const cell = closestCellAtPointer(e.clientX, e.clientY, rect, gridRows, gridCols);
    if (!cell) return;

    e.preventDefault();
    gridRef.current.setPointerCapture(e.pointerId);
    setIsSelecting(true);
    setPath([cell]);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isSelecting || !gridRef.current) return;

    setPath((prev) => {
      if (prev.length === 0) return prev;
      const rect = gridRef.current!.getBoundingClientRect();

      let next = backtrackPath(prev, e.clientX, e.clientY, rect, gridRows, gridCols);

      for (let step = 0; step < 3; step += 1) {
        const last = next[next.length - 1];
        const directed = neighborTowardPointer(last, e.clientX, e.clientY, rect, gridRows, gridCols);
        if (
          !directed ||
          pathHasCoord(next, directed.row, directed.col) ||
          (directed.row === last.row && directed.col === last.col)
        ) {
          break;
        }
        next = [...next, directed];
      }

      return next;
    });
  };

  const finishSelection = (e: React.PointerEvent) => {
    if (!isSelecting) return;
    if (gridRef.current?.hasPointerCapture(e.pointerId)) {
      gridRef.current.releasePointerCapture(e.pointerId);
    }
    setIsSelecting(false);
    setPath((current) => {
      resolveSelection(current);
      return [];
    });
  };

  const linePoints = useMemo(() => {
    if (path.length < 2 || !gridRef.current) return '';
    const rect = gridRef.current.getBoundingClientRect();
    const cellW = rect.width / gridCols;
    const cellH = rect.height / gridRows;
    return path
      .map(({ row, col }) => {
        const x = (col + 0.5) * cellW;
        const y = (row + 0.5) * cellH;
        return `${x},${y}`;
      })
      .join(' ');
  }, [gridCols, gridRows, path]);

  return (
    <div
      className={`relative w-full select-none touch-none rounded-[24px] p-3 shadow-[0_20px_50px_-16px_rgba(15,22,66,0.4)] backdrop-blur-md transition-[box-shadow] sm:rounded-[28px] sm:p-4 ${
        flash === 'ok' ? 'ring-2 ring-[#4CE3B2]/80' : flash === 'miss' ? 'ring-2 ring-rose-300/70' : 'ring-1 ring-white/22'
      } ${className}`}
      style={{
        background: 'linear-gradient(160deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.10) 100%)',
      }}
    >
      <div
        ref={gridRef}
        className="relative grid w-full place-items-center gap-2 sm:gap-2.5"
        style={{
          aspectRatio: `${gridCols} / ${gridRows}`,
          gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${gridRows}, minmax(0, 1fr))`,
        }}
        onPointerDown={handleGridPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishSelection}
        onPointerCancel={finishSelection}
      >
        {path.length >= 2 ? (
          <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full" aria-hidden>
            <defs>
              <linearGradient id="ws-line" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#4CE3B2" />
                <stop offset="1" stopColor="#25D19A" />
              </linearGradient>
            </defs>
            <polyline
              points={linePoints}
              fill="none"
              stroke="url(#ws-line)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.85"
            />
          </svg>
        ) : null}

        {grid.map((row, rowIdx) =>
          row.map((letter, colIdx) => {
            const key = coordKey(rowIdx, colIdx);
            const active = pathKeys.has(key);
            const found = foundCellKeys.has(key);
            return (
              <div
                key={key}
                data-ws-cell
                data-row={rowIdx}
                data-col={colIdx}
                className="flex h-full w-full items-center justify-center"
              >
                <span
                  className={`pointer-events-none relative z-20 flex aspect-square h-[86%] w-[86%] items-center justify-center rounded-[14px] text-[clamp(1rem,4vw,1.4rem)] font-bold leading-none transition-[transform,background-color,box-shadow] sm:h-[88%] sm:w-[88%] sm:rounded-[16px] ${
                    active
                      ? 'text-white shadow-[0_10px_22px_-6px_rgba(37,209,154,0.55)] scale-[0.94]'
                      : found
                        ? 'text-white shadow-[0_8px_18px_-6px_rgba(37,209,154,0.45)]'
                        : 'bg-white text-[#1B2456] shadow-[0_4px_10px_-3px_rgba(15,22,66,0.15)]'
                  }`}
                  style={
                    active
                      ? { background: 'linear-gradient(150deg, #4CE3B2 0%, #25D19A 55%, #1FC48C 100%)' }
                      : found
                        ? { background: 'linear-gradient(150deg, #4CE3B2 0%, #25D19A 55%, #1FC48C 100%)' }
                        : undefined
                  }
                >
                  {letter}
                </span>
              </div>
            );
          }),
        )}
      </div>

      {path.length > 0 ? (
        <p className="mt-2.5 text-center text-[13px] font-bold tracking-[0.24em] text-white sm:text-sm">
          {lettersFromPath(path, grid)}
        </p>
      ) : (
        <p className="mt-2.5 text-center text-[12px] font-semibold tracking-[0.02em] text-white/70">
          Harflarni ketma-ket bosing
        </p>
      )}
    </div>
  );
}
