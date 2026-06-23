const PRESERVE_TOKENS = ['FalaRus', 'Google', 'Apple', 'Rahmat', 'JPG', 'PNG', 'WEBP', 'PDF', 'Store', 'Product ID'];

const MULTI_RULES: Array<[string, string]> = [
  ["Yo'", 'Ё'],
  ["yo'", 'ё'],
  ["O'", 'Ў'],
  ["o'", 'ў'],
  ["G'", 'Ғ'],
  ["g'", 'ғ'],
  ['Sh', 'Ш'],
  ['sh', 'ш'],
  ['Ch', 'Ч'],
  ['ch', 'ч'],
  ['Ng', 'Нг'],
  ['ng', 'нг'],
  ['Yu', 'Ю'],
  ['yu', 'ю'],
  ['Ya', 'Я'],
  ['ya', 'я'],
  ['Ye', 'Е'],
  ['ye', 'е'],
  ['Yo', 'Ё'],
  ['yo', 'ё'],
];

const SINGLE_RULES: Array<[string, string]> = [
  ['A', 'А'],
  ['a', 'а'],
  ['B', 'Б'],
  ['b', 'б'],
  ['D', 'Д'],
  ['d', 'д'],
  ['E', 'Е'],
  ['e', 'е'],
  ['F', 'Ф'],
  ['f', 'ф'],
  ['G', 'Г'],
  ['g', 'г'],
  ['H', 'Ҳ'],
  ['h', 'ҳ'],
  ['I', 'И'],
  ['i', 'и'],
  ['J', 'Ж'],
  ['j', 'ж'],
  ['K', 'К'],
  ['k', 'к'],
  ['L', 'Л'],
  ['l', 'л'],
  ['M', 'М'],
  ['m', 'м'],
  ['N', 'Н'],
  ['n', 'н'],
  ['O', 'О'],
  ['o', 'о'],
  ['P', 'П'],
  ['p', 'п'],
  ['Q', 'Қ'],
  ['q', 'қ'],
  ['R', 'Р'],
  ['r', 'р'],
  ['S', 'С'],
  ['s', 'с'],
  ['T', 'Т'],
  ['t', 'т'],
  ['U', 'У'],
  ['u', 'у'],
  ['V', 'В'],
  ['v', 'в'],
  ['X', 'Х'],
  ['x', 'х'],
  ['Y', 'Й'],
  ['y', 'й'],
  ['Z', 'З'],
  ['z', 'з'],
];

function normalizeApostrophes(input: string): string {
  return input.replace(/[\u2018\u2019\u02BC\u0060]/g, "'");
}

function transliterateLatinChunk(chunk: string): string {
  let out = normalizeApostrophes(chunk);
  for (const [from, to] of MULTI_RULES) {
    out = out.split(from).join(to);
  }
  for (const [from, to] of SINGLE_RULES) {
    out = out.split(from).join(to);
  }
  return out;
}

const PH_START = '\uE000';
const PH_END = '\uE001';
const BR_START = '\uE002';
const BR_END = '\uE003';

/** Uzbek Latin UI strings → Cyrillic Uzbek (placeholders and brand tokens preserved). */
export function transliterateUzLatinToCyrillic(text: string): string {
  if (!text) return text;

  const placeholders: string[] = [];
  let work = text.replace(/\{\{(\w+)\}\}/g, (match) => {
    placeholders.push(match);
    return `${PH_START}${placeholders.length - 1}${PH_END}`;
  });

  const preserved: string[] = [];
  for (const token of PRESERVE_TOKENS) {
    work = work.replaceAll(token, (match) => {
      preserved.push(match);
      return `${BR_START}${preserved.length - 1}${BR_END}`;
    });
  }

  work = work.replace(/[A-Za-z'’`ʼ]+/g, (latinRun) => transliterateLatinChunk(latinRun));
  work = work.replace(/'/g, 'ъ');

  const brRe = new RegExp(`${BR_START}(\\d+)${BR_END}`, 'g');
  const phRe = new RegExp(`${PH_START}(\\d+)${PH_END}`, 'g');
  work = work.replace(brRe, (_, index) => preserved[Number(index)] ?? '');
  work = work.replace(phRe, (_, index) => placeholders[Number(index)] ?? '');

  return work;
}
