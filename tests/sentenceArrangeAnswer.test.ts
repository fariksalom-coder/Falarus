import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normSentenceArrangeAnswer } from '../shared/sentenceArrangeAnswer';

describe('normSentenceArrangeAnswer', () => {
  it('ignores commas and case', () => {
    const built = normSentenceArrangeAnswer('Она врач работает в больнице');
    const expected = normSentenceArrangeAnswer('Она врач, работает в больнице');
    assert.strictEqual(built, expected);
  });

  it('ignores question marks when attached to words', () => {
    assert.strictEqual(normSentenceArrangeAnswer('Кто вы по профессии?'), normSentenceArrangeAnswer('Кто вы по профессии'),);
  });
});
