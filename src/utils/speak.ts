/**
 * speak.ts — so'zni ovoz bilan o'qib berish.
 *
 * IKKI QATLAM:
 *  1. Server TTS (`/api/tts`) — sifatli va BARCHA qurilmalarda bir xil ovoz.
 *     Server har so'zni bir marta generatsiya qilib keshlaydi, shuning uchun
 *     ikkinchi marta darhol keladi.
 *  2. Brauzerning `speechSynthesis` zaxirasi — server javob bermasa ishlaydi.
 *     Uni asosiy qilib bo'lmaydi: ba'zi qurilmalarda ruscha ovoz umuman yo'q
 *     (masalan Linux'dagi ba'zi brauzerlarda ovozlar ro'yxati bo'sh).
 *
 * Bir vaqtda faqat BITTA ovoz chalinadi: yangi so'z boshlansa, oldingisi
 * to'xtatiladi — aks holda kartochkalar tez almashsa ovozlar ustma-ust tushardi.
 */
import { apiUrl } from '../api';

/** Bir marta yuklangan ovozlar — takroriy so'rov bo'lmasin. */
const blobCache = new Map<string, string>();
let current: HTMLAudioElement | null = null;

/**
 * OVOZ AVLODI.
 *
 * Muammo: `speakText` avval ovoz faylini serverdan yuklaydi (bu bir necha
 * soniya bo'lishi mumkin), keyin chaladi. Shu orada foydalanuvchi
 * "Keyingisi" ni bossa, `stopSpeaking()` faqat O'SHA PAYTDA chalinayotgan
 * ovozni to'xtatardi — yo'lda kelayotgani esa keyin chalinib, yangi matn
 * ustidan gapirardi (ikkita ovoz birga eshitilardi).
 *
 * Yechim: har to'xtatish va har yangi o'qish avlodni oshiradi. Fayl kelganда
 * avlod o'zgargan bo'lsa — chalinmaydi.
 */
let avlod = 0;

/**
 * PAUZA.
 *
 * `stopSpeaking()` ovozni butunlay tashlab yuboradi — davom ettirib bo'lmaydi.
 * Darsda esa o'quvchi to'xtatib, o'ylab, aynan SHU joydan davom etishi kerak.
 * Shuning uchun pauza alohida holat: chalinayotgan ovoz to'xtaydi, ammo joyi
 * saqlanadi; yo'lda kelayotgan bo'lak esa kelgach chalinmay kutib turadi
 * (aks holda pauza paytida keyingi bo'lak birdan gapirib yuborardi).
 */
let pauzada = false;

/**
 * Avtomatik ijro bloklanganda: foydalanuvchi ekranga birinchi marta
 * tekkanda AYNAN SHU ovozni chalamiz. Robot ovozga o'tmaymiz — dars
 * o'rtasida ovoz o'zgarib ketmasin.
 */
function tegishniKutibChal(audio: HTMLAudioElement, meniki: number): void {
  if (typeof window === 'undefined') return;
  const hodisalar = ['pointerdown', 'keydown', 'touchstart'] as const;
  const chal = () => {
    hodisalar.forEach((h) => window.removeEventListener(h, chal));
    if (meniki !== avlod) return;
    void audio.play().catch(() => undefined);
  };
  hodisalar.forEach((h) => window.addEventListener(h, chal, { once: true, passive: true }));
}

function stopCurrent(): void {
  if (!current) return;
  try {
    current.pause();
    current.currentTime = 0;
  } catch {
    /* brauzer ruxsat bermasa — e'tiborsiz */
  }
  current = null;
}

/** Brauzerning o'z sintezatori — server ishlamaganda. */
function browserFallback(text: string, lang: string, rate: number, onEnd?: () => void): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnd?.();
    return false;
  }
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = rate;
    u.onend = () => onEnd?.();
    u.onerror = () => onEnd?.();
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith('ru'));
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
    return true;
  } catch {
    onEnd?.();
    return false;
  }
}

export type SpeakOptions = {
  token: string | null;
  /** 1.0 — odatdagi tezlik; kichikroq — sekinroq va aniqroq. */
  speed?: number;
  lang?: string;
  /**
   * Ovoz TUGAGANDA chaqiriladi. Ketma-ket o'qish uchun kerak: doskada
   * tushuntirish bir necha bo'lakka bo'linadi va keyingisi oldingisi
   * tugagach boshlanadi. Berilmasa — hech narsa o'zgarmaydi.
   */
  onEnd?: () => void;
  /**
   * `ustoz` — doskadagi dars ovozi: muloyimroq va tiniqroq. Berilmasa lug'at
   * kartochkalarining odatdagi ovozi ishlatiladi.
   */
  ohang?: 'ustoz';
  /**
   * Server ovozi kelmasa brauzerning o'z sintezatori (ROBOT ovoz) ishlatilsinmi.
   *
   * Darsda `false`: dars o'rtasida ovoz robotga o'zgarib ketsa, o'quvchiga
   * boshqa odam gapirayotgandek tuyuladi. Jim o'tgan ma'qul — matn doskada
   * turadi va dars davom etadi.
   */
  zaxira?: boolean;
};

const cacheKey = (text: string, speed: number, ohang?: string) =>
  `${text}|${speed}|${ohang ?? ''}`;

/** Bir vaqtda bitta matn uchun bitta yuklash bo'lsin. */
const inFlight = new Map<string, Promise<string | null>>();

/** Ovozni yuklab keshga qo'yadi (chalmaydi). */
function loadAudio(
  clean: string,
  speed: number,
  token: string | null,
  ohang?: string,
): Promise<string | null> {
  const key = cacheKey(clean, speed, ohang);
  const cached = blobCache.get(key);
  if (cached) return Promise.resolve(cached);
  if (!token) return Promise.resolve(null);

  const existing = inFlight.get(key);
  if (existing) return existing;

  const p = fetch(
    apiUrl(
      `/api/tts?text=${encodeURIComponent(clean)}&speed=${speed}` +
        (ohang ? `&ohang=${ohang}` : ''),
    ),
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  )
    .then(async (res) => {
      if (!res.ok) return null;
      const url = URL.createObjectURL(await res.blob());
      blobCache.set(key, url);
      return url;
    })
    .catch(() => null)
    .finally(() => inFlight.delete(key));

  inFlight.set(key, p);
  return p;
}

/**
 * Ovozni OLDINDAN yuklab qo'yadi — chalmaydi.
 *
 * Nima uchun: talaffuz kechikish bilan chalinsa (masalan kartochka chiqqandan
 * 2 soniya keyin), yuklashni ham o'sha paytda boshlash noto'g'ri — server
 * yangi so'zni generatsiya qilishi bir necha soniya oladi va ovoz umumiy
 * 5–7 soniyaga kechikadi. Shuning uchun yuklash DARHOL boshlanadi, chalish
 * esa o'z vaqtida bo'ladi.
 */
export function prefetchSpeech(text: string, opts: SpeakOptions): void {
  const clean = String(text ?? '').trim();
  if (!clean) return;
  void loadAudio(clean, opts.speed ?? 0.85, opts.token, opts.ohang);
}

/**
 * Matnni ovoz bilan o'qiydi. Xatolik bo'lsa jim o'tadi — talaffuz qo'shimcha
 * imkoniyat, uning ishlamagani darsni to'xtatmasligi kerak.
 */
export async function speakText(text: string, opts: SpeakOptions): Promise<void> {
  const clean = String(text ?? '').trim();
  if (!clean) return;
  const speed = opts.speed ?? 0.85;
  const lang = opts.lang ?? 'ru-RU';

  stopCurrent();
  const meniki = ++avlod;

  const url = await loadAudio(clean, speed, opts.token, opts.ohang);

  // Yuklanayotganda to'xtatildi yoki boshqa matn boshlandi — bu ovoz endi keraksiz.
  if (meniki !== avlod) return;

  if (!url) {
    // Server ovozi kelmadi. Darsda robot ovoz chalinmaydi — jim o'tamiz va
    // keyingi bo'lakka o'tishga ruxsat beramiz.
    if (opts.zaxira === false) opts.onEnd?.();
    else browserFallback(clean, lang, speed, opts.onEnd);
    return;
  }

  try {
    const audio = new Audio(url);
    audio.preload = 'auto';
    if (opts.onEnd) {
      // Eskirgan ovozning tugashi keyingi bo'lakni boshlab yubormasin.
      audio.onended = () => {
        if (meniki === avlod) opts.onEnd?.();
      };
      audio.onerror = () => {
        if (meniki === avlod) opts.onEnd?.();
      };
    }
    if (meniki !== avlod) return;
    current = audio;
    // Pauza bosilgan: ovoz tayyor turadi, "Davom etish" bosilganda chalinadi.
    if (pauzada) return;
    await audio.play();
  } catch {
    // Avtomatik ijro bloklangan (foydalanuvchi hali ekranga tegmagan).
    if (meniki !== avlod) return;
    if (opts.zaxira === false) {
      // Robotga o'tmaymiz: birinchi tegishda shu ovozning o'zi chalinadi.
      tegishniKutibChal(current ?? new Audio(url), meniki);
    } else {
      browserFallback(clean, lang, speed, opts.onEnd);
    }
  }
}

/**
 * Ovozni SHU JOYDA to'xtatadi — davom ettirish mumkin.
 *
 * Ijro zanjiri o'z-o'zidan muzlaydi: keyingi bo'lak faqat joriysi tugagach
 * boshlanadi, pauza qilingani esa hech qachon tugamaydi.
 */
export function pauseSpeaking(): void {
  pauzada = true;
  if (current) {
    try {
      current.pause();
    } catch {
      /* brauzer ruxsat bermasa — e'tiborsiz */
    }
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.pause();
    } catch {
      /* e'tiborsiz */
    }
  }
}

/** Pauzadan keyin aynan to'xtagan joydan davom etadi. */
export function resumeSpeaking(): void {
  if (!pauzada) return;
  pauzada = false;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.resume();
    } catch {
      /* e'tiborsiz */
    }
  }
  if (current) void current.play().catch(() => undefined);
}

/** Sahifadan chiqishda ovozni to'xtatish uchun. */
export function stopSpeaking(): void {
  // Avlodni oshiramiz: yo'lda kelayotgan ovoz ham chalinmaydi.
  avlod += 1;
  // To'xtatish pauzani ham bekor qiladi — yangi matn kutib qolmasin.
  pauzada = false;
  stopCurrent();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* e'tiborsiz */
    }
  }
}
