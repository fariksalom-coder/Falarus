import test from 'node:test';
import assert from 'node:assert/strict';
import { PcmResampler } from '../src/utils/pcmResampler';

for (const rate of [16000, 24000, 44100, 48000]) {
  test(`PCM keeps exact duration across irregular blocks at ${rate} Hz`, () => {
    const input = Float32Array.from({ length: rate }, (_, i) => Math.sin(i * 2 * Math.PI * 440 / rate) * .5);
    const render = (block: number) => {
      const result: number[] = [];
      const resampler = new PcmResampler(rate);
      for (let i = 0; i < input.length; i += block) resampler.push(input.subarray(i, i + block), pcm => result.push(...pcm));
      return result;
    };
    const output = render(128);
    assert.equal(output.length, 16000);
    assert.deepEqual(output, render(4096));
    assert.deepEqual(output, render(137));
    assert.ok(Math.max(...output) <= 16384);
  });
}
test('PCM saturates instead of wrapping loud input and preserves silence', () => {
  const resampler = new PcmResampler(16000, 4);
  let output: Int16Array | undefined;
  resampler.push(new Float32Array([-2, 2, 0, .5]), pcm => { output = pcm; });
  assert.deepEqual([...output!], [-32768, 32767, 0, 16384]);
});
