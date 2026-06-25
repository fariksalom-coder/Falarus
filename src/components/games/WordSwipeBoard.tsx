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
      className={`relative w-full select-none touch-none rounded-[18px] border border-white/20 bg-white/10 p-2 shadow-[0_16px_40px_rgba(15,23,42,0.2)] backdrop-blur-md transition-[box-shadow] sm:rounded-[26px] sm:p-3 ${
        flash === 'ok' ? 'ring-2 ring-emerald-300/80' : flash === 'miss' ? 'ring-2 ring-rose-300/70' : ''
      } ${className}`}
    >
      <div
        ref={gridRef}
        className="relative grid w-full place-items-center gap-2.5 sm:gap-3"
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
            <polyline
              points={linePoints}
              fill="none"
              stroke="rgba(255,255,255,0.95)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
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
                  className={`pointer-events-none relative z-20 flex aspect-square h-[68%] w-[68%] items-center justify-center rounded-[8px] border text-[clamp(0.65rem,2.8vw,1.05rem)] font-extrabold leading-none transition-[transform,background-color,border-color,box-shadow] sm:h-[72%] sm:w-[72%] sm:rounded-xl ${
                    active
                      ? 'border-blue-400 bg-[#2563EB] text-white shadow-[0_6px_16px_rgba(37,99,235,0.4)]'
                      : found
                        ? 'border-emerald-400 bg-emerald-500 text-white shadow-[0_4px_12px_rgba(34,197,94,0.35)]'
                        : 'border-slate-200/80 bg-white text-slate-800 shadow-[0_2px_8px_rgba(15,23,42,0.06)]'
                  } ${isSelecting && active ? 'scale-[0.96]' : ''}`}
                >
                  {letter}
                </span>
              </div>
            );
          }),
        )}
      </div>

      {path.length > 0 ? (
        <p className="mt-2 text-center text-xs font-bold tracking-[0.2em] text-white sm:text-sm">
          {lettersFromPath(path, grid)}
        </p>
      ) : null}
    </div>
  );
}
