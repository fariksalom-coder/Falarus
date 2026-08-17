/**
 * wordChain.ts — "So'z zanjiri" o'yinining sof mantiqi.
 *
 * Qoida: har bir yangi so'z oldingi so'zning OXIRGI harfidan boshlanadi.
 * Rus tilida "shaharlar" o'yinining odatdagi shartlari:
 *   - `ь`, `ъ`, `ы`, `й` bilan tugagan so'zda ulardan oldingi harf olinadi
 *     (masalan "словарь" -> «р», "красивый" -> «в»);
 *   - `ё` va `е` bir xil hisoblanadi (o'yinchi odatda «ё» yozmaydi).
 *
 * Bu yerda UI ham, vaqt ham yo'q — faqat qoidalar. Shu sababli mantiqni
 * brauzersiz test qilish mumkin (`tests/wordChain.test.ts`).
 */

/** Zanjirda ishlatilmaydigan tugash harflari. */
const SKIP_TAIL = new Set(['ь', 'ъ', 'ы', 'й']);

/** So'zni solishtirishga tayyorlaydi: kichik harf, «ё» -> «е», ortiqcha bo'shliqsiz. */
export function normalizeWord(word: string): string {
  return String(word ?? '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ');
}

/**
 * So'zning zanjir uchun OXIRGI harfi.
 * Tugashida `ь/ъ/ы/й` bo'lsa, ulardan oldingi harfga o'tiladi.
 * Mos harf topilmasa (butun so'z shu harflardan iborat) — bo'sh satr.
 */
export function chainLetter(word: string): string {
  let w = normalizeWord(word);
  while (w.length > 0 && SKIP_TAIL.has(w[w.length - 1])) {
    w = w.slice(0, -1);
  }
  return w.length > 0 ? w[w.length - 1] : '';
}

/** So'zning boshlanish harfi (zanjir tekshiruvi uchun). */
export function startLetter(word: string): string {
  const w = normalizeWord(word);
  return w.length > 0 ? w[0] : '';
}

export type WordIndex = Map<string, string[]>;

/** So'zlarni boshlanish harfi bo'yicha guruhlaydi. */
export function buildIndex(words: string[]): WordIndex {
  const index: WordIndex = new Map();
  for (const raw of words) {
    const w = normalizeWord(raw);
    if (w.length < 2) continue;
    const key = startLetter(w);
    if (!key) continue;
    const list = index.get(key);
    if (list) list.push(w);
    else index.set(key, [w]);
  }
  return index;
}

export type AnswerCheck =
  | { ok: true; word: string }
  | { ok: false; reason: 'empty' | 'format' | 'letter' | 'used' | 'unknown'; message: string };

/** Faqat kirill harflari (va so'z ichidagi defis) — raqam va lotin yozuvi emas. */
const CYRILLIC_WORD = /^[а-яё]+(-[а-яё]+)*$/;

/**
 * O'yinchi javobini tekshiradi.
 *
 * LUG'AT SHART EMAS (`requireDictionary` standart holatda `false`): o'quvchi
 * istalgan so'zni yozishi mumkin, faqat BOSH HARFI to'g'ri kelsa va so'z
 * ilgari ishlatilmagan bo'lsa yetarli. Lug'at bilan cheklash o'quvchini
 * bilgan so'zini yozganda ham "xato" deb to'xtatib qo'yardi.
 *
 * Tartib muhim: bo'shligi → yozuvi → harfi → takrorlanishi, shunda o'quvchi
 * eng foydali xabarni oladi.
 */
export function checkAnswer(params: {
  answer: string;
  requiredLetter: string;
  used: Set<string>;
  /** Faqat `requireDictionary: true` bo'lganda ishlatiladi. */
  dictionary?: Set<string>;
  requireDictionary?: boolean;
}): AnswerCheck {
  const word = normalizeWord(params.answer);
  if (!word || word.length < 2) {
    return { ok: false, reason: 'empty', message: "So'z yozing (kamida 2 harf)" };
  }
  if (!CYRILLIC_WORD.test(word)) {
    return { ok: false, reason: 'format', message: 'Faqat rus harflari bilan yozing' };
  }
  if (params.requiredLetter && startLetter(word) !== params.requiredLetter) {
    return {
      ok: false,
      reason: 'letter',
      message: `«${params.requiredLetter.toUpperCase()}» harfi bilan boshlanishi kerak`,
    };
  }
  if (params.used.has(word)) {
    return { ok: false, reason: 'used', message: "Bu so'z allaqachon ishlatilgan" };
  }
  if (params.requireDictionary && !params.dictionary?.has(word)) {
    return { ok: false, reason: 'unknown', message: "Bu so'z lug'atda yo'q" };
  }
  return { ok: true, word };
}

/**
 * Kompyuterning javobi.
 *
 * Shunchaki tasodifiy so'z olinmaydi: tanlangan so'z o'yinchiga qanday harf
 * qoldirishiga ham qaraladi. Aks holda kompyuter tasodifan «щ» yoki «й» kabi
 * harfda tugaydigan so'z aytib, o'yinchini adolatsiz yutqazishga majbur qilardi.
 *
 * Tanlash tartibi:
 *   1) o'yinchiga KO'P variant qoldiradigan so'zlar afzal;
 *   2) teng bo'lsa — tasodifiy (o'yin har safar boshqacha kechsin).
 * Hech qanday so'z qolmasa `null` — bu kompyuter yutqazgani.
 */
export function pickComputerWord(params: {
  index: WordIndex;
  letter: string;
  used: Set<string>;
  /** Sinovda takrorlanadigan natija uchun. */
  random?: () => number;
}): string | null {
  const rnd = params.random ?? Math.random;
  const candidates = (params.index.get(params.letter) ?? []).filter((w) => !params.used.has(w));
  if (candidates.length === 0) return null;

  const remainingFor = (letter: string): number => {
    const list = params.index.get(letter);
    if (!list) return 0;
    let n = 0;
    for (const w of list) if (!params.used.has(w)) n += 1;
    return n;
  };

  // Nomzodlarni "o'yinchiga qancha variant qoladi" bo'yicha guruhlaymiz.
  let best: string[] = [];
  let bestScore = -1;
  for (const w of candidates) {
    const next = chainLetter(w);
    // O'yinchi javob bera olmaydigan harf — eng oxirgi chora.
    const score = next ? remainingFor(next) : 0;
    if (score > bestScore) {
      bestScore = score;
      best = [w];
    } else if (score === bestScore) {
      best.push(w);
    }
  }
  // Juda ko'p bir xil ballli nomzod bo'lsa, o'yin bir xil bo'lib qolmasligi
  // uchun tasodifiy tanlaymiz.
  return best[Math.floor(rnd() * best.length)] ?? null;
}

/** Boshlanish so'zi — o'yinchiga qulay harfda tugaydigan so'z tanlanadi. */
export function pickStartWord(params: {
  index: WordIndex;
  used: Set<string>;
  random?: () => number;
}): string | null {
  const rnd = params.random ?? Math.random;
  const letters = [...params.index.keys()];
  if (letters.length === 0) return null;
  // Bir necha marta urinib ko'ramiz: o'yinchiga ko'p variant qoldiradigan so'z.
  let bestWord: string | null = null;
  let bestScore = -1;
  for (let i = 0; i < 24; i += 1) {
    const letter = letters[Math.floor(rnd() * letters.length)];
    const list = (params.index.get(letter) ?? []).filter((w) => !params.used.has(w));
    if (list.length === 0) continue;
    const word = list[Math.floor(rnd() * list.length)];
    const score = (params.index.get(chainLetter(word)) ?? []).length;
    if (score > bestScore) {
      bestScore = score;
      bestWord = word;
    }
  }
  return bestWord;
}
