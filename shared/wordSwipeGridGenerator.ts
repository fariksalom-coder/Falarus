import {
  areAdjacent,
  coordKey,
  normalizeWordRu,
  type GridCoord,
  type WordSwipeEntry,
} from './wordSwipeUtils';

export type GenerateWordSwipeGridInput = {
  words: WordSwipeEntry[];
  rows: number;
  cols: number;
  seed: string;
  maxAttempts?: number;
};

export type GenerateWordSwipeGridResult = {
  grid: string[][];
  solutionPaths: Record<string, GridCoord[]>;
  rows: number;
  cols: number;
};

const FILLER_LETTERS = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЫЭЮЯ';

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createRng(seed: string): () => number {
  let s = hashSeed(seed) || 1;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function allCoords(rows: number, cols: number): GridCoord[] {
  const coords: GridCoord[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) coords.push({ row, col });
  }
  return coords;
}

function neighbors(row: number, col: number, rows: number, cols: number): GridCoord[] {
  const out: GridCoord[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < rows && c >= 0 && c < cols) out.push({ row: r, col: c });
    }
  }
  return out;
}

function cloneGrid(grid: (string | null)[][]): (string | null)[][] {
  return grid.map((row) => [...row]);
}

function placeWordOnGrid(
  grid: (string | null)[][],
  letters: string[],
): GridCoord[] | null {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  function search(index: number, path: GridCoord[], used: Set<string>): GridCoord[] | null {
    if (index === letters.length) return [...path];

    const letter = letters[index];
    const candidates =
      index === 0
        ? allCoords(rows, cols)
        : neighbors(path[index - 1].row, path[index - 1].col, rows, cols);

    for (const coord of candidates) {
      if (index > 0 && !areAdjacent(path[index - 1], coord)) continue;
      const key = coordKey(coord.row, coord.col);
      if (used.has(key)) continue;

      const existing = grid[coord.row][coord.col];
      if (existing !== null && existing !== letter) continue;

      const previous = grid[coord.row][coord.col];
      grid[coord.row][coord.col] = letter;
      path.push(coord);
      used.add(key);

      const result = search(index + 1, path, used);
      if (result) return result;

      used.delete(key);
      path.pop();
      grid[coord.row][coord.col] = previous;
    }

    return null;
  }

  return search(0, [], new Set());
}

function shuffleWithRng<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function fillEmptyCells(grid: (string | null)[][], rng: () => number): string[][] {
  return grid.map((row) =>
    row.map((cell) => {
      if (cell) return cell;
      const idx = Math.floor(rng() * FILLER_LETTERS.length);
      return FILLER_LETTERS[idx] ?? 'А';
    }),
  );
}

function tryPlaceAllWords(
  words: WordSwipeEntry[],
  rows: number,
  cols: number,
  rng: () => number,
): { grid: string[][]; solutionPaths: Record<string, GridCoord[]> } | null {
  const grid = Array.from({ length: rows }, () => Array<string | null>(cols).fill(null));
  const solutionPaths: Record<string, GridCoord[]> = {};

  const sorted = shuffleWithRng(
    [...words].sort((a, b) => normalizeWordRu(b.ru).length - normalizeWordRu(a.ru).length),
    rng,
  );

  for (const word of sorted) {
    const letters = [...normalizeWordRu(word.ru)];
    if (letters.length === 0) return null;
    const working = cloneGrid(grid);
    const path = placeWordOnGrid(working, letters);
    if (!path) return null;

    for (let i = 0; i < path.length; i++) {
      const { row, col } = path[i];
      grid[row][col] = letters[i];
    }
    solutionPaths[normalizeWordRu(word.ru)] = path;
  }

  return { grid: fillEmptyCells(grid, rng), solutionPaths };
}

export class WordSwipeGridGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WordSwipeGridGenerationError';
  }
}

export function generateWordSwipeGrid(
  input: GenerateWordSwipeGridInput,
): GenerateWordSwipeGridResult {
  const activeWords = input.words
    .map((w) => ({ ...w, ru: normalizeWordRu(w.ru) }))
    .filter((w) => w.ru.length > 0);

  if (activeWords.length === 0) {
    throw new WordSwipeGridGenerationError('No words to place');
  }

  const maxAttempts = input.maxAttempts ?? 300;
  const sizeCandidates: Array<{ rows: number; cols: number }> = [
    { rows: input.rows, cols: input.cols },
    { rows: Math.max(input.rows, 6), cols: Math.max(input.cols, 6) },
  ];

  for (const size of sizeCandidates) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const rng = createRng(`${input.seed}:${size.rows}x${size.cols}:${attempt}`);
      const placed = tryPlaceAllWords(activeWords, size.rows, size.cols, rng);
      if (placed) {
        return {
          grid: placed.grid,
          solutionPaths: placed.solutionPaths,
          rows: size.rows,
          cols: size.cols,
        };
      }
    }
  }

  throw new WordSwipeGridGenerationError(
    `Failed to generate grid for seed "${input.seed}" after ${maxAttempts} attempts`,
  );
}
