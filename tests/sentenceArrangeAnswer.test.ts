import { describe, expect, it } from 'vitest';
import { normSentenceArrangeAnswer } from '../shared/sentenceArrangeAnswer';

describe('normSentenceArrangeAnswer', () => {
  it('ignores commas and case', () => {
    const built = normSentenceArrangeAnswer('Она врач работает в больнице');
    const expected = normSentenceArrangeAnswer('Она врач, работает в больнице');
    expect(built).toBe(expected);
  });

  it('ignores question marks when attached to words', () => {
    expect(normSentenceArrangeAnswer('Кто вы по профессии?')).toBe(
      normSentenceArrangeAnswer('Кто вы по профессии'),
    );
  });
});
