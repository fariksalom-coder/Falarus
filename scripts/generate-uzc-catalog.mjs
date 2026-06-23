#!/usr/bin/env node
/**
 * Generate shared/i18n/catalog/uzc.ts from uz.ts (Cyrillic Uzbek UI).
 * Run: node scripts/generate-uzc-catalog.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const uzPath = join(root, 'shared/i18n/catalog/uz.ts');
const outPath = join(root, 'shared/i18n/catalog/uzc.ts');

const PRESERVE_TOKENS = ['FalaRus', 'Google', 'Apple', 'Rahmat', 'JPG', 'PNG', 'WEBP', 'PDF', 'Store', 'Product ID'];

const MULTI_RULES = [
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

const SINGLE_RULES = [
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

function normalizeApostrophes(input) {
  return input.replace(/[\u2018\u2019\u02BC\u0060]/g, "'");
}

function transliterateLatinChunk(chunk) {
  let out = normalizeApostrophes(chunk);
  for (const [from, to] of MULTI_RULES) out = out.split(from).join(to);
  for (const [from, to] of SINGLE_RULES) out = out.split(from).join(to);
  return out;
}

const PH_START = '\uE000';
const PH_END = '\uE001';
const BR_START = '\uE002';
const BR_END = '\uE003';

function transliterateUzLatinToCyrillic(text) {
  if (!text) return text;

  const placeholders = [];
  let work = text.replace(/\{\{(\w+)\}\}/g, (match) => {
    placeholders.push(match);
    return `${PH_START}${placeholders.length - 1}${PH_END}`;
  });

  const preserved = [];
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

function mapCatalogStrings(node) {
  if (typeof node === 'string') return transliterateUzLatinToCyrillic(node);
  if (!node || typeof node !== 'object' || Array.isArray(node)) return node;
  const out = {};
  for (const [key, value] of Object.entries(node)) {
    out[key] = mapCatalogStrings(value);
  }
  return out;
}

function toTsString(value, indent = 2) {
  const pad = ' '.repeat(indent);
  if (typeof value === 'string') {
    const escaped = value
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n');
    return `'${escaped}'`;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Unexpected catalog node');
  }
  const lines = ['{'];
  for (const [key, child] of Object.entries(value)) {
    const keyStr = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key) ? key : `'${key}'`;
    if (typeof child === 'string') {
      lines.push(`${pad}${keyStr}: ${toTsString(child, indent + 2)},`);
    } else {
      lines.push(`${pad}${keyStr}: ${toTsString(child, indent + 2)},`);
    }
  }
  lines.push(`${' '.repeat(indent - 2)}}`);
  return lines.join('\n');
}

const src = readFileSync(uzPath, 'utf8');
const match = src.match(/const\s+uz\s*:\s*MessageCatalog\s*=\s*(\{[\s\S]*?\n\});/);
if (!match) throw new Error(`Could not parse ${uzPath}`);

const uz = eval(`(${match[1]})`);
const uzc = mapCatalogStrings(uz);

const output = `import type { MessageCatalog } from './types';

/** Uzbek UI in Cyrillic script — generated from uz.ts via scripts/generate-uzc-catalog.mjs */
const uzc: MessageCatalog = ${toTsString(uzc, 2)};

export default uzc;
`;

writeFileSync(outPath, output, 'utf8');
console.log(`Wrote ${outPath}`);
