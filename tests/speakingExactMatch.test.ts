import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeRuAnswer,
  tryExactTranslationMatch,
} from '../server/lib/openai';

describe('speaking exact match', () => {
  it('normalizes punctuation and case', () => {
    assert.equal(normalizeRuAnswer('Откуда вы?'), 'откуда вы');
    assert.equal(normalizeRuAnswer('  Я из Узбекистана. '), 'я из узбекистана');
  });

  it('accepts exact reference for kunlik day 3 prompt 1', () => {
    const result = tryExactTranslationMatch('Откуда вы?', 'откуда вы');
    assert.equal(result?.status, 'correct');
  });

  it('returns null when answers differ', () => {
    assert.equal(tryExactTranslationMatch('Откуда вы?', 'Где вы?'), null);
  });
});
