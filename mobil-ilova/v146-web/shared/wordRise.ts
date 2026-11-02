/**
 * wordRise.ts — «So'z savati» o'yinining qoidalari.
 *
 * O'yin RODNI tanishga o'rgatadi. O'yinchi bitta rodni tanlaydi (мужской /
 * женский / средний), so'ngra ekranda UCHALA rodning so'zlari ARALASH holda
 * pastdan yuqoriga ko'tariladi. O'yinchi faqat O'ZI TANLAGAN rodga tegishli
 * so'zlarni bosishi kerak:
 *
 *   - kerakli so'zni bosdi   → so'z savatga tushadi, ball qo'shiladi
 *   - begona so'zni bosdi    → xato: ball kamayadi, uch xatodan keyin o'yin tugaydi
 *   - kerakli so'z tepaga chiqib ketdi → o'yin tugaydi
 *   - begona so'z tepaga chiqib ketdi  → hech narsa bo'lmaydi, u sizniki emas
 *
 * So'zlar `src/data/russianNounGender.ts` dan olinadi: u yerda faqat OTLAR bor,
 * har biri AI va oxirgi harf qoidasi bilan ikki marta tekshirilgan; «ь» bilan
 * tugaydiganlar (rodi noaniq) umuman yo'q.
 *
 * Bu fayl faqat MANTIQ: hech qanday React yoki DOM yo'q, shuning uchun
 * to'liq test bilan qoplangan.
 */
import { NOUNS_BY_GENDER, type RussianGender } from '../src/data/russianNounGender';

export type { RussianGender };

export const WORD_RISE_GENDERS: RussianGender[] = ['m', 'f', 'n'];

type GenderMeta = {
  gender: RussianGender;
  /** Ruscha nomi — o'quvchi shu atamani eslab qolishi kerak. */
  ru: string;
  /** O'zbekcha izoh. */
  uz: string;
  /** Qanday tugaydi. */
  hint: string;
};

export const WORD_RISE_GENDER_META: Record<RussianGender, GenderMeta> = {
  m: { gender: 'm', ru: 'Мужской род', uz: 'Erkak rodi', hint: 'undosh bilan tugaydi' },
  f: { gender: 'f', ru: 'Женский род', uz: 'Ayol rodi', hint: '-а yoki -я bilan tugaydi' },
  n: { gender: 'n', ru: 'Средний род', uz: "O'rta rod", hint: '-о yoki -е bilan tugaydi' },
};

/** So'zning ko'tarilish vaqti (ms) — kattaroq bo'lsa sekinroq. */
const BASE_TRAVEL_MS = 8200;
/** Yangi so'z chiqish oralig'i (ms). */
const BASE_SPAWN_MS = 1900;
/** Ekranda bir vaqtda turadigan eng ko'p so'z. */
export const MAX_ON_SCREEN = 4;
/** Necha xatodan keyin o'yin tugaydi. */
export const MAX_MISTAKES = 3;
/** Begona so'zni bosgani uchun jarima. */
export const WRONG_PENALTY = 5;
/** Chiqadigan so'zlarning qanchasi o'yinchi tanlagan roddan bo'ladi. */
export const TARGET_SHARE = 0.45;

/** Tanlangan rodning barcha so'zlari. */
export function genderWords(gender: RussianGender): string[] {
  return NOUNS_BY_GENDER[gender];
}

/** So'z → rod jadvali. Bir marta qurilib, keyin qayta ishlatiladi. */
let lookup: Map<string, RussianGender> | null = null;
function genderLookup(): Map<string, RussianGender> {
  if (lookup) return lookup;
  lookup = new Map();
  for (const g of WORD_RISE_GENDERS) {
    for (const w of NOUNS_BY_GENDER[g]) lookup.set(w, g);
  }
  return lookup;
}

/** So'zning rodi — o'yinda yo'q so'z uchun null. */
export function genderOf(word: string): RussianGender | null {
  return genderLookup().get(word.trim().toLowerCase()) ?? null;
}

/** Shu so'z o'yinchi tanlagan rodga tegishlimi. */
export function isTargetWord(word: string, target: RussianGender): boolean {
  return genderOf(word) === target;
}

/** Nechta so'z savatga tushgani — o'yin shunga qarab tezlashadi. */
type Progress = { caught: number };

/**
 * So'zning ko'tarilish vaqti. Uzun so'zni o'qib ulgurish uchun har harfga
 * qo'shimcha vaqt beriladi.
 */
export function travelMs(word: string, { caught }: Progress): number {
  const base = BASE_TRAVEL_MS + word.length * 220;
  return Math.round(base * Math.max(0.55, 1 - caught * 0.014));
}

/** Keyingi so'z qancha vaqtdan keyin chiqadi. */
export function spawnDelayMs({ caught }: Progress): number {
  return Math.max(850, Math.round(BASE_SPAWN_MS * Math.max(0.45, 1 - caught * 0.016)));
}

/** Savatga tushgan so'z uchun ball: uzun so'z ko'proq. */
export function wordScore(word: string): number {
  return 10 + Math.max(0, word.length - 3) * 2;
}

/**
 * Keyingi so'zni tanlaydi: avval rod (tanlangan rod TARGET_SHARE ehtimol bilan),
 * so'ng o'sha roddan hali chiqmagan so'z. Ekrandagilar qayta chiqmaydi.
 */
export function pickNextWord(
  target: RussianGender,
  used: Set<string>,
  onScreen: string[],
  random: () => number = Math.random,
): { word: string; gender: RussianGender } | null {
  const others = WORD_RISE_GENDERS.filter((g) => g !== target);
  const wantTarget = random() < TARGET_SHARE;
  const order: RussianGender[] = wantTarget
    ? [target, ...others]
    : [others[Math.floor(random() * others.length) % others.length], target, ...others];

  const busy = new Set(onScreen.map((w) => w.trim().toLowerCase()));
  for (const gender of order) {
    const all = NOUNS_BY_GENDER[gender];
    let pool = all.filter((w) => !used.has(w) && !busy.has(w));
    if (pool.length === 0) {
      // Rod tugadi — o'sha rodning tarixini tozalaymiz (lug'at katta, amalda
      // bunga yetib borilmaydi).
      for (const w of all) used.delete(w);
      pool = all.filter((w) => !busy.has(w));
    }
    if (pool.length > 0) {
      return { word: pool[Math.floor(random() * pool.length) % pool.length], gender };
    }
  }
  return null;
}
