import { useCallback, useMemo, useRef, useState } from 'react';
import {
  areAdjacent,
  coordKey,
  lettersFromPath,
  matchWordFromLetters,
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

  const tryAddCell = useCallback((row: number, col: number) => {
    setPath((prev) => {
      if (pathHasCoord(prev, row, col)) return prev;
      if (prev.length === 0) return [{ row, col }];
      const last = prev[prev.length - 1];
      if (!areAdjacent(last, { row, col })) return prev;
      return [...prev, { row, col }];
    });
  }, []);

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

  const handlePointerDown = (row: number, col: number, e: React.PointerEvent) => {
    e.preventDefault();
    gridRef.current?.setPointerCapture(e.pointerId);
    setIsSelecting(true);
    setPath([{ row, col }]);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isSelecting) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const cell = el?.closest<HTMLElement>('[data-ws-cell]');
    if (!cell) return;
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    if (!Number.isFinite(row) || !Number.isFinite(col)) return;
    tryAddCell(row, col);
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
        className="relative grid w-full gap-1 sm:gap-1.5"
        style={{
          aspectRatio: `${gridCols} / ${gridRows}`,
          gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${gridRows}, minmax(0, 1fr))`,
        }}
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
              <button
                key={key}
                type="button"
                data-ws-cell
                data-row={rowIdx}
                data-col={colIdx}
                onPointerDown={(e) => handlePointerDown(rowIdx, colIdx, e)}
                className={`relative z-20 flex aspect-square min-h-0 min-w-0 items-center justify-center rounded-[8px] border text-[clamp(0.7rem,3.2vw,1.15rem)] font-extrabold leading-none transition-[transform,background-color,border-color,box-shadow] active:scale-[0.96] sm:rounded-xl ${
                  active
                    ? 'border-blue-400 bg-[#2563EB] text-white shadow-[0_6px_16px_rgba(37,99,235,0.4)]'
                    : found
                      ? 'border-emerald-400 bg-emerald-500 text-white shadow-[0_4px_12px_rgba(34,197,94,0.35)]'
                      : 'border-slate-200/80 bg-white text-slate-800 shadow-[0_2px_8px_rgba(15,23,42,0.06)]'
                }`}
              >
                {letter}
              </button>
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
