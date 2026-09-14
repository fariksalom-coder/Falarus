import captureWorkletUrl from './liveCapture.worklet?worker&url';
import { PcmResampler } from './pcmResampler';
import { PcmPlaybackResampler } from './pcmPlayback';

const CHIQISH_HZ = 24_000;
/** Legacy capture block; both capture paths send 100 ms PCM packets. */
const BOLAK = 4096;

function base64ga(pcm: Int16Array): string {
  const bayt = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let s = '';
  // Katta massivni bir yo'la `String.fromCharCode` ga bermaymiz — uzun
  // argument ro'yxati ba'zi brauzerlarda stekni to'ldiradi.
  for (let i = 0; i < bayt.length; i += 0x8000) {
    s += String.fromCharCode(...bayt.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

/**
 * Mikrofonni ochib, ovozni 16 kHz PCM bo'laklari sifatida uzatadi.
 *
 * Aks-sado bostirish YOQILGAN va bu majburiy: ustozning ovozi karnaydan
 * chiqib mikrofonga qaytadi, aks holda ustoz o'z gapiga javob berib,
 * cheksiz aylanaga tushib qoladi.
 */
export class MikrofonOqimi {
  private ctx: AudioContext | null = null;
  private oqim: MediaStream | null = null;
  private ishlovchi: ScriptProcessorNode | AudioWorkletNode | null = null;
  private manba: MediaStreamAudioSourceNode | null = null;
  private ovozBor = 0;
  private ownsContext = true;
  private generation = 0;

  get daraja(): number { return this.ovozBor; }

  async boshla(bolak: (base64: string) => void, sharedContext?: AudioContext): Promise<void> {
    this.toxtat();
    const generation = this.generation;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: {
      echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1,
    } });
    if (generation !== this.generation) { stream.getTracks().forEach(t => t.stop()); return; }
    this.oqim = stream;
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = sharedContext ?? new Ctx({ latencyHint: 'interactive' });
      this.ownsContext = !sharedContext;
      this.ctx = ctx;
      if (ctx.state === 'suspended') await ctx.resume();
      if (generation !== this.generation) return;
      this.manba = ctx.createMediaStreamSource(stream);
      const send = (pcm: Int16Array, peak: number) => {
        if (generation !== this.generation) return;
        this.ovozBor = peak;
        bolak(base64ga(pcm));
      };
      if (ctx.audioWorklet) {
        try {
          await ctx.audioWorklet.addModule(captureWorkletUrl);
          if (generation !== this.generation) return;
          const node = new AudioWorkletNode(ctx, 'falarus-live-capture');
          node.port.onmessage = e => send(e.data.pcm, e.data.peak);
          this.ishlovchi = node;
        } catch { /* Older browsers keep a compatible capture path below. */ }
      }
      if (generation !== this.generation) return;
      if (!this.ishlovchi) {
        const node = ctx.createScriptProcessor(BOLAK, 1, 1);
        const resampler = new PcmResampler(ctx.sampleRate);
        node.onaudioprocess = e => resampler.push(e.inputBuffer.getChannelData(0), pcm => {
          let peak = 0;
          for (const value of pcm) peak = Math.max(peak, Math.abs(value) / 32768);
          send(pcm, peak);
        });
        this.ishlovchi = node;
      }
      const silent = ctx.createGain();
      silent.gain.value = 0;
      this.manba.connect(this.ishlovchi);
      this.ishlovchi.connect(silent);
      silent.connect(ctx.destination);
    } catch (error) {
      if (generation === this.generation) this.toxtat();
      throw error;
    }
  }

  toxtat(): void {
    this.generation++;
    if (this.ishlovchi && 'port' in this.ishlovchi) {
      this.ishlovchi.port.onmessage = null;
      this.ishlovchi.port.close();
    } else if (this.ishlovchi && 'onaudioprocess' in this.ishlovchi) this.ishlovchi.onaudioprocess = null;
    try { this.ishlovchi?.disconnect(); } catch { /* already closed */ }
    try { this.manba?.disconnect(); } catch { /* already closed */ }
    this.oqim?.getTracks().forEach(t => t.stop());
    if (this.ownsContext) void this.ctx?.close().catch(() => {});
    this.ownsContext = true;
    this.ishlovchi = null; this.manba = null; this.oqim = null; this.ctx = null; this.ovozBor = 0;
  }
}

/** Schedule PCM continuously with 300 ms initial reserve, up to 600 ms after underruns. */
const ZAXIRA_S = 0.3;

export class OvozNavbati {
  private ctx: AudioContext | null = null;
  private keyingi = 0;
  private manbalar = new Set<AudioBufferSourceNode>();
  private ochiq = false;
  private trailingByte: number | null = null;
  private generation = 0;
  private reserve = ZAXIRA_S;
  private drained: (() => void) | null = null;
  private resampler: PcmPlaybackResampler | null = null;

  /** Capture and playback share one device clock for the whole live session. */
  get context(): AudioContext | undefined { return this.ctx ?? undefined; }

  whenDrained(callback: () => void): void {
    if (!this.manbalar.size) callback();
    else this.drained = callback;
  }

  /** Hozir ustoz gapiryaptimi. */
  get gapiryapti(): boolean {
    return this.ochiq;
  }

  async tayyorla(): Promise<void> {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    // Resampling each AudioBuffer separately creates boundary clicks. Match PCM
    // to the context, so the device resamples the continuous mixed output once.
    try { this.ctx = new Ctx({ sampleRate: CHIQISH_HZ, latencyHint: 'interactive' }); }
    catch { this.ctx = new Ctx({ latencyHint: 'interactive' }); }
    this.resampler = new PcmPlaybackResampler(this.ctx.sampleRate);
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }

  qosh(base64: string, tugadi?: () => void): void {
    if (!this.ctx) return;
    // Preserve a split PCM16 sample instead of shifting every following sample.
    const raw = atob(base64);
    const bytes = new Uint8Array(raw.length + (this.trailingByte === null ? 0 : 1));
    let offset = 0;
    if (this.trailingByte !== null) bytes[offset++] = this.trailingByte;
    for (let i = 0; i < raw.length; i++) bytes[offset + i] = raw.charCodeAt(i);
    this.trailingByte = bytes.length % 2 ? bytes[bytes.length - 1] : null;
    const pcm = new Int16Array(bytes.buffer, 0, Math.floor(bytes.length / 2));
    if (!pcm.length) return;

    const samples = this.resampler!.convert(pcm);
    if (!samples.length) return;
    const bufer = this.ctx.createBuffer(1, samples.length, this.ctx.sampleRate);
    bufer.getChannelData(0).set(samples);

    const manba = this.ctx.createBufferSource();
    manba.buffer = bufer;
    manba.connect(this.ctx.destination);

    /*
     * Navbat bo'shab qolgan bo'lsa (birinchi bo'lak yoki uzilish) —
     * zaxira bilan boshlaymiz. Aks holda ketma-ket, tirqishsiz ulanadi.
     */
    const hozir = this.ctx.currentTime;
    if (this.keyingi <= hozir) {
      if (this.keyingi > 0) this.reserve = Math.min(0.6, this.reserve + 0.05);
      this.keyingi = hozir + this.reserve;
    }
    const generation = this.generation;

    manba.start(this.keyingi);
    this.keyingi += bufer.duration;
    this.ochiq = true;

    this.manbalar.add(manba);
    manba.onended = () => {
      manba.disconnect();
      if (generation !== this.generation) return;
      this.manbalar.delete(manba);
      if (this.manbalar.size === 0) {
        this.ochiq = false;
        tugadi?.();
        const drained = this.drained;
        this.drained = null;
        drained?.();
      }
    };
  }

  /** Darhol jim bo'lish — o'quvchi ustozning gapini bo'lganda. */
  toxtat(): void {
    this.generation++;
    this.drained = null;
    this.trailingByte = null;
    this.reserve = ZAXIRA_S;
    this.resampler = this.ctx ? new PcmPlaybackResampler(this.ctx.sampleRate) : null;
    for (const m of this.manbalar) {
      m.onended = null;
      m.disconnect();
      try { m.stop(); } catch { /* allaqachon tugagan */ }
    }
    this.manbalar.clear();
    this.keyingi = 0;
    this.ochiq = false;
  }

  yop(): void {
    this.toxtat();
    void this.ctx?.close().catch(() => {});
    this.ctx = null;
  }
}
