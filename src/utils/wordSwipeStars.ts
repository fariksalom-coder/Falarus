/**
 * wordSwipeStars.ts — «So'zni yig'ing» bosqichlaridagi yulduzlar.
 *
 * Bosqich necha YORDAM bilan yakunlangani o'yinchining mahoratini ko'rsatadi:
 * yordamsiz yechilgan bosqich uch yulduz, yordam olingani esa kamroq oladi.
 * Shu tufayli bosqichni qayta o'ynash ma'noga ega bo'ladi — ilgari bosqich
 * bir marta yopilgach unga qaytishning hech qanday sababi yo'q edi.
 *
 * NIMA UCHUN BRAUZERDA SAQLANADI: server jadvalida (`completed_stages`)
 * faqat bosqich RAQAMLARI ro'yxati turadi va uni o'zgartirish 1129 ta
 * o'yinchining tayyor yozuvini ko'chirishni talab qilardi. Yulduz — mukofot,
 * kirish huquqi emas: yo'qolib qolsa o'yin buzilmaydi, bosqich baribir
 * serverda ochiq qoladi. Shuning uchun u qurilmada saqlanadi.
 */
const KALIT = 'falarus.wordSwipe.stars';

export type YulduzXaritasi = Record<string, number>;

const bosqichKaliti = (level: number, stage: number) => `${level}-${stage}`;

export function yulduzlarniOqi(): YulduzXaritasi {
  if (typeof window === 'undefined') return {};
  try {
    const xom = window.localStorage.getItem(KALIT);
    if (!xom) return {};
    const obj = JSON.parse(xom) as unknown;
    if (!obj || typeof obj !== 'object') return {};
    const natija: YulduzXaritasi = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 1 && n <= 3) natija[k] = Math.round(n);
    }
    return natija;
  } catch {
    return {};
  }
}

/** Yulduzni saqlaydi. Avvalgi natija YAXSHIROQ bo'lsa — tegilmaydi. */
export function yulduzniSaqla(level: number, stage: number, yulduz: number): void {
  if (typeof window === 'undefined') return;
  const kalit = bosqichKaliti(level, stage);
  const hozirgi = yulduzlarniOqi();
  if ((hozirgi[kalit] ?? 0) >= yulduz) return;
  try {
    window.localStorage.setItem(KALIT, JSON.stringify({ ...hozirgi, [kalit]: yulduz }));
  } catch {
    /* joy yo'q bo'lsa — yulduzsiz davom etadi */
  }
}

export function bosqichYulduzi(xarita: YulduzXaritasi, level: number, stage: number): number {
  return xarita[bosqichKaliti(level, stage)] ?? 0;
}

/**
 * Yordam soniga qarab yulduz: 0 ta yordam — 3, 1-2 ta — 2, undan ko'pi — 1.
 * Bosqich yakunlangani uchun kamida bitta yulduz beriladi.
 */
export function yordamdanYulduz(yordamSoni: number): number {
  if (yordamSoni <= 0) return 3;
  if (yordamSoni <= 2) return 2;
  return 1;
}
