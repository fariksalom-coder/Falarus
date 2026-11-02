import { PcmResampler } from './pcmResampler';
declare const sampleRate: number;
declare class AudioWorkletProcessor { readonly port: MessagePort; }
declare function registerProcessor(name: string, processor: typeof AudioWorkletProcessor): void;

class LiveCapture extends AudioWorkletProcessor {
  private resampler = new PcmResampler(sampleRate);
  process(inputs: Float32Array[][]): boolean {
    const input = inputs[0]?.[0];
    if (input) this.resampler.push(input, pcm => {
      let peak = 0;
      for (const value of pcm) peak = Math.max(peak, Math.abs(value) / 32768);
      this.port.postMessage({ pcm, peak }, [pcm.buffer]);
    });
    // Output stays silent; never feed microphone audio back to the speaker.
    return true;
  }
}
registerProcessor('falarus-live-capture', LiveCapture);
