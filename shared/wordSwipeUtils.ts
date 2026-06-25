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

/** Neighbor cell in the swipe direction from the last selected cell. */
export function neighborTowardPointer(
  last: GridCoord,
  clientX: number,
  clientY: number,
  gridRect: DOMRect,
  rows: number,
  cols: number,
): GridCoord | null {
  const cellW = gridRect.width / cols;
  const cellH = gridRect.height / rows;
  const cx = gridRect.left + (last.col + 0.5) * cellW;
  const cy = gridRect.top + (last.row + 0.5) * cellH;
  const dx = clientX - cx;
  const dy = clientY - cy;
  const threshold = Math.min(cellW, cellH) * 0.22;
  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return null;

  let dc = 0;
  let dr = 0;
  if (Math.abs(dx) > threshold) dc = dx > 0 ? 1 : -1;
  if (Math.abs(dy) > threshold) dr = dy > 0 ? 1 : -1;
  if (dc === 0 && dr === 0) return null;

  const row = last.row + dr;
  const col = last.col + dc;
  if (row < 0 || row >= rows || col < 0 || col >= cols) return null;
  return { row, col };
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
