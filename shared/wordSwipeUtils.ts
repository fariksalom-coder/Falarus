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
