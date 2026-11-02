import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isSentenceArrangeCorrect, normSentenceArrangeAnswer } from '../shared/sentenceArrangeAnswer';

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

describe('isSentenceArrangeCorrect', () => {
  it('accepts the key and any listed alternative word order', () => {
    assert.ok(isSentenceArrangeCorrect('извините где метро', 'Извините, где метро?', ['Где метро, извините?']));
    assert.ok(isSentenceArrangeCorrect('где метро извините', 'Извините, где метро?', ['Где метро, извините?']));
    assert.ok(!isSentenceArrangeCorrect('метро где извините', 'Извините, где метро?', ['Где метро, извините?']));
    assert.ok(!isSentenceArrangeCorrect('', 'Извините, где метро?', ['']));
  });
});
