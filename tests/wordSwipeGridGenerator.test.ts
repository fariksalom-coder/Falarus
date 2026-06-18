import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateWordSwipeGrid } from '../shared/wordSwipeGridGenerator';
import { areAdjacent, lettersFromPath, normalizeWordRu } from '../shared/wordSwipeUtils';

const SEED_STAGE_WORDS: Record<number, Array<{ id: number; uz: string; ru: string }>> = {
  1: [
    { id: 1, uz: 'ism', ru: 'ИМЯ' },
    { id: 2, uz: 'yosh', ru: 'ВОЗРАСТ' },
    { id: 3, uz: 'telefon', ru: 'ТЕЛЕФОН' },
    { id: 4, uz: 'manzil', ru: 'АДРЕС' },
    { id: 5, uz: 'pochta', ru: 'ПОЧТА' },
  ],
  2: [
    { id: 1, uz: 'ona', ru: 'МАМА' },
    { id: 2, uz: 'ota', ru: 'ПАПА' },
    { id: 3, uz: 'uy', ru: 'ДОМ' },
    { id: 4, uz: "o'g'il", ru: 'СЫН' },
    { id: 5, uz: 'qiz', ru: 'ДОЧЬ' },
  ],
  3: [
    { id: 1, uz: 'non', ru: 'ХЛЕБ' },
    { id: 2, uz: 'suv', ru: 'ВОДА' },
    { id: 3, uz: 'choy', ru: 'ЧАЙ' },
    { id: 4, uz: 'sut', ru: 'МОЛОКО' },
    { id: 5, uz: "go'sht", ru: 'МЯСО' },
  ],
  4: [
    { id: 1, uz: 'dars', ru: 'УРОК' },
    { id: 2, uz: 'kitob', ru: 'КНИГА' },
    { id: 3, uz: 'ruchka', ru: 'РУЧКА' },
    { id: 4, uz: 'stol', ru: 'СТОЛ' },
    { id: 5, uz: 'klass', ru: 'КЛАСС' },
  ],
  5: [
    { id: 1, uz: 'qizil', ru: 'КРАСНЫЙ' },
    { id: 2, uz: "ko'k", ru: 'СИНИЙ' },
    { id: 3, uz: 'oq', ru: 'БЕЛЫЙ' },
    { id: 4, uz: 'qora', ru: 'ЧЕРНЫЙ' },
    { id: 5, uz: 'yashil', ru: 'ЗЕЛЕНЫЙ' },
  ],
};

function assertStagePlacement(
  stageNumber: number,
  words: Array<{ id: number; uz: string; ru: string }>,
) {
  const result = generateWordSwipeGrid({
    words,
    rows: 5,
    cols: 6,
    seed: `word-swipe-1-${stageNumber}`,
  });

  assert.equal(result.grid.length, 5);
  assert.equal(result.grid[0]?.length, 6);

  for (const word of words) {
    const key = normalizeWordRu(word.ru);
    const path = result.solutionPaths[key];
    assert.ok(path, `stage ${stageNumber}: missing path for ${key}`);

    const letters = lettersFromPath(path!, result.grid);
    assert.equal(letters, key);

    const coords = new Set(path!.map((p) => `${p.row},${p.col}`));
    assert.equal(coords.size, path!.length);

    for (let i = 1; i < path!.length; i++) {
      assert.equal(areAdjacent(path![i - 1], path![i]), true);
    }
  }
}

describe('wordSwipeGridGenerator', () => {
  it('places stage 1 words with valid adjacent paths', () => {
    assertStagePlacement(1, SEED_STAGE_WORDS[1]);
  });

  it('places seeded stages 1-5 words', () => {
    for (const stageNumber of [1, 2, 3, 4, 5]) {
      assertStagePlacement(stageNumber, SEED_STAGE_WORDS[stageNumber]);
    }
  });

  it('is stable for the same seed', () => {
    const words = SEED_STAGE_WORDS[1];
    const a = generateWordSwipeGrid({
      words,
      rows: 5,
      cols: 6,
      seed: 'word-swipe-1-1',
    });
    const b = generateWordSwipeGrid({
      words,
      rows: 5,
      cols: 6,
      seed: 'word-swipe-1-1',
    });

    assert.deepEqual(a.grid, b.grid);
    assert.deepEqual(a.solutionPaths, b.solutionPaths);
  });
});
