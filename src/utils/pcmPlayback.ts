/** Keep interpolation history across network chunks when 24 kHz playback is unavailable. */
export class PcmPlaybackResampler {
  private consumed = 0;
  private emitted = 0;
  private previous: number | null = null;
  constructor(private outputRate: number) {}

  convert(pcm: Int16Array): Float32Array {
    if (this.outputRate === 24000) return Float32Array.from(pcm, sample => sample / 32768);
    if (!pcm.length) return new Float32Array();
    const start = this.consumed - (this.previous === null ? 0 : 1);
    const end = this.consumed + pcm.length - 1;
    const step = 24000 / this.outputRate;
    const samples: number[] = [];
    const at = (index: number) => this.previous === null ? pcm[index] : index === 0 ? this.previous : pcm[index - 1];
    while (this.emitted * step < end) {
      const position = this.emitted * step - start;
      const left = Math.floor(position);
      samples.push((at(left) + (at(left + 1) - at(left)) * (position - left)) / 32768);
      this.emitted++;
    }
    this.consumed += pcm.length;
    this.previous = pcm[pcm.length - 1];
    return Float32Array.from(samples);
  }
}
