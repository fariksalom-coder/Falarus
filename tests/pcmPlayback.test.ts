import test from 'node:test';
import assert from 'node:assert/strict';
import { PcmPlaybackResampler } from '../src/utils/pcmPlayback';
for (const rate of [24000, 44100, 48000]) {
  test(`playback is independent of packet boundaries at ${rate} Hz`, () => {
    const signal = Int16Array.from({length:24000},(_,i)=>Math.round(Math.sin(i*.173)*24000));
    const convert=(sizes:number[])=>{
      const stream=new PcmPlaybackResampler(rate);const out:number[]=[];
      for(let i=0,j=0;i<signal.length;j++) {const n=sizes[j%sizes.length];out.push(...stream.convert(signal.subarray(i,i+n)));i+=n;}
      return out;
    };
    const full=convert([24000]);
    assert.deepEqual(convert([1,3840,1920,2880,960,137]),full);
    assert.ok(full.every(Number.isFinite));
    assert.ok(Math.abs(full.length-rate)<=2);
  });
}
test('native PCM playback preserves samples exactly including tiny chunks',()=>{
 const r=new PcmPlaybackResampler(24000);
 assert.deepEqual([...r.convert(new Int16Array([-32768,0,32767]))],[-1,0,32767/32768]);
 assert.deepEqual([...r.convert(new Int16Array([16384]))],[.5]);
});
