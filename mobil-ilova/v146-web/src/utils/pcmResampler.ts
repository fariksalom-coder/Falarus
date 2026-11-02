/** Streaming box filter: retain fractional samples across capture blocks. */
export class PcmResampler {
  private remaining: number;
  private sum = 0;
  private output: number[] = [];
  private ratio: number;
  constructor(inputRate: number, private chunkSize = 1600) {
    this.ratio = inputRate / 16000;
    this.remaining = this.ratio;
  }
  push(input: Float32Array, emit: (pcm: Int16Array) => void): void {
    for (const sample of input) {
      let available = 1;
      while (available > 1e-9) {
        const weight = Math.min(available, this.remaining);
        this.sum += sample * weight;
        this.remaining -= weight;
        available -= weight;
        if (this.remaining < 1e-9) {
          const value = Math.max(-1, Math.min(1, this.sum / this.ratio));
          this.output.push(Math.round(value * (value < 0 ? 32768 : 32767)));
          this.sum = 0;
          this.remaining = this.ratio;
          if (this.output.length === this.chunkSize) {
            emit(Int16Array.from(this.output));
            this.output = [];
          }
        }
      }
    }
  }
}
