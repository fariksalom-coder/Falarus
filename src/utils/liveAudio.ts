/**
 * liveAudio.ts — jonli suhbat uchun mikrofon va ovoz chiqishi.
 *
 * Gemini Live API ikki xil format kutadi va qaytaradi:
 *   kirish  — 16 kHz, 16 bitli PCM (mono)
 *   chiqish — 24 kHz, 16 bitli PCM (mono)
 * Brauzerning o'z tezligi odatda 44.1 yoki 48 kHz, shuning uchun kirish
 * qayta hisoblanadi, chiqish esa AudioBuffer orqali brauzerning o'ziga
 * moslashtiriladi.
 *
 * NIMA UCHUN ScriptProcessorNode: u eskirgan deb belgilangan, lekin AudioWorklet
 * alohida fayl va qo'shimcha yuklash talab qiladi, iOS Safari'da esa cheklovlar
 * bor. Foydalanuvchilarning aksariyati telefondan kiradi, shuning uchun hamma
 * joyda ishlaydigan yo'l tanlandi.
 */

const KIRISH_HZ = 16_000;
const CHIQISH_HZ = 24_000;
/** Bir bo'lakda ~256 ms ovoz — kechikish va so'rovlar soni orasidagi muvozanat. */
const BOLAK = 4096;

function base64dan(b64: string): Int16Array {
  const xom = atob(b64);
  const bayt = new Uint8Array(xom.length);
  for (let i = 0; i < xom.length; i += 1) bayt[i] = xom.charCodeAt(i);
  return new Int16Array(bayt.buffer);
}

function base64ga(pcm: Int16Array): string {
  const bayt = new Uint8Array(pcm.buffer);
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
  private ishlovchi: ScriptProcessorNode | null = null;
  private manba: MediaStreamAudioSourceNode | null = null;
  private ovozBor = 0;

  /** Oxirgi bo'lakdagi eng baland tovush (0..1) — jonli ko'rsatkich uchun. */
  get daraja(): number {
    return this.ovozBor;
  }

  async boshla(bolak: (base64: string) => void): Promise<void> {
    this.oqim = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    });

    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    if (this.ctx.state === 'suspended') await this.ctx.resume();

    this.manba = this.ctx.createMediaStreamSource(this.oqim);
    this.ishlovchi = this.ctx.createScriptProcessor(BOLAK, 1, 1);

    const manbaHz = this.ctx.sampleRate;

    this.ishlovchi.onaudioprocess = (e) => {
      const kirish = e.inputBuffer.getChannelData(0);

      let eng = 0;
      for (let i = 0; i < kirish.length; i += 1) {
        const v = Math.abs(kirish[i]);
        if (v > eng) eng = v;
      }
      this.ovozBor = eng;

      // 48 kHz -> 16 kHz: chiziqli interpolatsiya. Oddiy tashlab ketish
      // (decimation) yuqori chastotalarda "sim" tovushi berardi.
      const nisbat = manbaHz / KIRISH_HZ;
      const uzunlik = Math.floor(kirish.length / nisbat);
      const chiqish = new Int16Array(uzunlik);
      for (let i = 0; i < uzunlik; i += 1) {
        const joy = i * nisbat;
        const p = Math.floor(joy);
        const q = Math.min(p + 1, kirish.length - 1);
        const aralash = kirish[p] + (kirish[q] - kirish[p]) * (joy - p);
        const s = Math.max(-1, Math.min(1, aralash));
        chiqish[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      bolak(base64ga(chiqish));
    };

    this.manba.connect(this.ishlovchi);
    // ScriptProcessor faqat chiqishga ulangandagina ishlaydi. Ovozni qaytarib
    // chiqarmaslik uchun tovushi nolga tenglashtirilgan tugun orqali ulaymiz.
    const jim = this.ctx.createGain();
    jim.gain.value = 0;
    this.ishlovchi.connect(jim);
    jim.connect(this.ctx.destination);
  }

  toxtat(): void {
    try { this.ishlovchi?.disconnect(); } catch { /* allaqachon uzilgan */ }
    try { this.manba?.disconnect(); } catch { /* allaqachon uzilgan */ }
    this.oqim?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close().catch(() => {});
    this.ishlovchi = null;
    this.manba = null;
    this.oqim = null;
    this.ctx = null;
    this.ovozBor = 0;
  }
}

/**
 * Kelayotgan PCM bo'laklarini uzluksiz qilib chaladi.
 *
 * Bo'laklar tarmoqdan notekis keladi, shuning uchun har biri oldingisi
 * tugaydigan aniq vaqtga rejalashtiriladi — aks holda orada sanchiq va
 * uzilishlar eshitiladi.
 */
export class OvozNavbati {
  private ctx: AudioContext | null = null;
  private keyingi = 0;
  private manbalar = new Set<AudioBufferSourceNode>();
  private ochiq = false;

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
    this.ctx = new Ctx();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }

  qosh(base64: string, tugadi?: () => void): void {
    if (!this.ctx) return;
    const pcm = base64dan(base64);
    if (!pcm.length) return;

    const bufer = this.ctx.createBuffer(1, pcm.length, CHIQISH_HZ);
    const kanal = bufer.getChannelData(0);
    for (let i = 0; i < pcm.length; i += 1) kanal[i] = pcm[i] / 0x8000;

    const manba = this.ctx.createBufferSource();
    manba.buffer = bufer;
    manba.connect(this.ctx.destination);

    // Kechikib qolgan bo'lsak, navbatni hozirgi vaqtdan boshlaymiz.
    const hozir = this.ctx.currentTime;
    if (this.keyingi < hozir) this.keyingi = hozir + 0.04;

    manba.start(this.keyingi);
    this.keyingi += bufer.duration;
    this.ochiq = true;

    this.manbalar.add(manba);
    manba.onended = () => {
      this.manbalar.delete(manba);
      if (this.manbalar.size === 0) {
        this.ochiq = false;
        tugadi?.();
      }
    };
  }

  /** Darhol jim bo'lish — o'quvchi ustozning gapini bo'lganda. */
  toxtat(): void {
    for (const m of this.manbalar) {
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
