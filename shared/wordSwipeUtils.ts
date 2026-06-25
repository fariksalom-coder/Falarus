export type GridCoord = { row: number; col: number };

export type WordSwipeEntry = {
  id: string | number;
  uz: string;
  ru: string;
};

export function normalizeWordRu(ru: string): string {
  return ru.toUpperCase().replace(/Ё/g, 'Е').replace(/[\s-]/g, '').trim();
}

export function coordKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function areAdjacent(a: GridCoord, b: GridCoord): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return dr <= 1 && dc <= 1 && !(dr === 0 && dc === 0);
}

const SWIPE_DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], // E
  [1, 1], // SE
  [1, 0], // S
  [1, -1], // SW
  [0, -1], // W
  [-1, -1], // NW
  [-1, 0], // N
  [-1, 1], // NE
];

function cellCenter(
  coord: GridCoord,
  gridRect: DOMRect,
  rows: number,
  cols: number,
): { x: number; y: number } {
  const cellW = gridRect.width / cols;
  const cellH = gridRect.height / rows;
  return {
    x: gridRect.left + (coord.col + 0.5) * cellW,
    y: gridRect.top + (coord.row + 0.5) * cellH,
  };
}

function cellSize(gridRect: DOMRect, rows: number, cols: number): number {
  return Math.min(gridRect.width / cols, gridRect.height / rows);
}

/** Closest letter cell to the pointer — used only to start a swipe. */
export function closestCellAtPointer(
  clientX: number,
  clientY: number,
  gridRect: DOMRect,
  rows: number,
  cols: number,
): GridCoord | null {
  const pickRadius = cellSize(gridRect, rows, cols) * 0.4;
  let best: GridCoord | null = null;
  let bestDistSq = pickRadius * pickRadius;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const center = cellCenter({ row, col }, gridRect, rows, cols);
      const dx = clientX - center.x;
      const dy = clientY - center.y;
      const distSq = dx * dx + dy * dy;
      if (distSq <= bestDistSq) {
        bestDistSq = distSq;
        best = { row, col };
      }
    }
  }

  return best;
}

/** Next neighbor in the swipe direction (8-way, angle-snapped). */
export function neighborTowardPointer(
  last: GridCoord,
  clientX: number,
  clientY: number,
  gridRect: DOMRect,
  rows: number,
  cols: number,
): GridCoord | null {
  const size = cellSize(gridRect, rows, cols);
  const center = cellCenter(last, gridRect, rows, cols);
  const dx = clientX - center.x;
  const dy = clientY - center.y;
  const minDist = size * 0.42;
  if (Math.hypot(dx, dy) < minDist) return null;

  const octant = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
  const [dr, dc] = SWIPE_DIRECTIONS[((octant % 8) + 8) % 8];

  const row = last.row + dr;
  const col = last.col + dc;
  if (row < 0 || row >= rows || col < 0 || col >= cols) return null;
  return { row, col };
}

/** If the finger moves back toward the previous cell, drop the last selection. */
export function backtrackPath(
  path: GridCoord[],
  clientX: number,
  clientY: number,
  gridRect: DOMRect,
  rows: number,
  cols: number,
): GridCoord[] {
  if (path.length < 2) return path;

  const last = path[path.length - 1];
  const prev = path[path.length - 2];
  const lastCenter = cellCenter(last, gridRect, rows, cols);
  const prevCenter = cellCenter(prev, gridRect, rows, cols);
  const size = cellSize(gridRect, rows, cols);
  const backtrackRadius = size * 0.36;

  const distToLast = Math.hypot(clientX - lastCenter.x, clientY - lastCenter.y);
  const distToPrev = Math.hypot(clientX - prevCenter.x, clientY - prevCenter.y);

  if (distToPrev < distToLast && distToPrev < backtrackRadius) {
    return path.slice(0, -1);
  }

  return path;
}

export function lettersFromPath(path: GridCoord[], grid: string[][]): string {
  return path.map(({ row, col }) => grid[row]?.[col] ?? '').join('');
}

export function matchWordFromLetters(
  letters: string,
  words: WordSwipeEntry[],
): WordSwipeEntry | null {
  const normalized = normalizeWordRu(letters);
  return words.find((w) => normalizeWordRu(w.ru) === normalized) ?? null;
}

export function wordEntryIdKey(id: string | number): string {
  return String(id);
}
