/**
 * Offline: kun 14–40 o‘qish «bo‘sh» tokenlari uchun `076_*` INSERT migratsiyasini yozadi.
 *
 * DB kerak emas: `067–073` dagi yakuniy passage/leksima/lug‘at INSERT laridan holat tiklanadi.
 * Tarjima: barcha migratsiyalardan `daily_vocab_words` juftlari + qoldiq uchun ichki lug‘at.
 *
 *   npx tsx scripts/offlineGenerate076ReadingLexemeFill.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizeRuWord } from '../shared/russianLexemeNormalize.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const CONTENT_FILES = [
  '067_kunlik_days_12_15_content.sql',
  '068_kunlik_days_16_20_content.sql',
  '069_kunlik_days_21_25_content.sql',
  '070_kunlik_days_26_30_content.sql',
  '071_kunlik_day_31_content.sql',
  '072_kunlik_days_32_35_content.sql',
  '073_kunlik_days_36_40_content.sql',
];

function readMigration(name: string): string {
  return fs.readFileSync(path.join(ROOT, 'db/migrations', name), 'utf8');
}

function extractRuWordTokens(text: string): string[] {
  const chunks = text.match(/([А-Яа-яЁё-]+|\s+|[^\sА-Яа-яЁё-]+)/g) ?? [];
  const words: string[] = [];
  for (const chunk of chunks) {
    if (/^[А-Яа-яЁё-]+$/.test(chunk)) words.push(chunk);
  }
  return words;
}

function sqlUnquote(s: string): string {
  return s.replace(/''/g, "'");
}

/** Faqat `daily_vocab_words` INSERT bloklari ichidan `(day, ord, 'uz','ru'),` juftlari. */
function extractDailyVocabTuples(sql: string): { day: number; uz: string; ru: string }[] {
  const out: { day: number; uz: string; ru: string }[] = [];
  const needle = 'INSERT INTO public.daily_vocab_words';
  let pos = 0;
  while (true) {
    const i = sql.indexOf(needle, pos);
    if (i === -1) break;
    const valuesIdx = sql.indexOf('VALUES', i);
    if (valuesIdx === -1) {
      pos = i + needle.length;
      continue;
    }
    const semi = sql.indexOf(';', valuesIdx);
    if (semi === -1) break;
    const block = sql.slice(valuesIdx, semi);
    pos = semi + 1;

    const re =
      /\(\s*(\d+)\s*,\s*\d+\s*,\s*'((?:[^']|'')*)'\s*,\s*'((?:[^']|'')*)'\s*\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(block))) {
      const day = Number(m[1]);
      if (!Number.isFinite(day) || day < 1 || day > 182) continue;
      const uz = sqlUnquote(m[2]).trim();
      const ru = sqlUnquote(m[3]).trim();
      if (!ru || !/[А-Яа-яЁё]/.test(ru)) continue;
      out.push({ day, uz, ru });
    }
  }
  return out;
}

type PassageRow = { dayNumber: number; textId: string; bodyRu: string };

function extractPassages(sql: string): PassageRow[] {
  const out: PassageRow[] = [];
  const re =
    /VALUES \(\s*(\d+)\s*,\s*'(?:[^']|'')*'\s*,\s*\$body\$([\s\S]*?)\$body\$\s*,\s*\n\s*'(kunlik-oqish-\d+)'\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql))) {
    const dayNumber = Number(m[1]);
    const bodyRu = m[2];
    const textId = m[3];
    out.push({ dayNumber, textId, bodyRu });
  }
  return out;
}

type LexRow = { textId: string; wordRu: string; wordRuNormalized: string };

function extractLexemes(sql: string): LexRow[] {
  const out: LexRow[] = [];
  const re =
    /\(\s*'(kunlik-oqish-\d+)'\s*,\s*'((?:[^']|'')*)'\s*,\s*'((?:[^']|'')*)'\s*,\s*'((?:[^']|'')*)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql))) {
    out.push({
      textId: m[1],
      wordRu: sqlUnquote(m[2]),
      wordRuNormalized: sqlUnquote(m[3]),
    });
  }
  return out;
}

function buildCoverageKeys(opts: {
  lexemeRows: LexRow[];
  vocabRuWords: string[];
}): Set<string> {
  const keys = new Set<string>();
  for (const L of opts.lexemeRows) {
    const a = normalizeRuWord(L.wordRuNormalized || L.wordRu);
    if (a) keys.add(a);
    const b = normalizeRuWord(L.wordRu);
    if (b) keys.add(b);
  }
  for (const ru of opts.vocabRuWords) {
    const k = normalizeRuWord(ru);
    if (k) keys.add(k);
  }
  return keys;
}

function firstSurfaceForNorm(bodyRu: string, norm: string): string {
  for (const t of extractRuWordTokens(bodyRu)) {
    if (normalizeRuWord(t) === norm) return t;
  }
  return norm;
}

function escapeSqlLiteral(s: string): string {
  return s.replace(/'/g, "''");
}

function loadFallbackExtraJson(): Record<string, string> {
  const p = path.join(__dirname, 'data', 'kunlik_lexeme_fallback_extra.json');
  if (!fs.existsSync(p)) return {};
  try {
    const raw = fs.readFileSync(p, 'utf8');
    const o = JSON.parse(raw) as Record<string, string>;
    return o && typeof o === 'object' ? o : {};
  } catch {
    return {};
  }
}

function loadGlobalVocabMap(allSql: string): Map<string, string> {
  const tuples = extractDailyVocabTuples(allSql);
  const map = new Map<string, string>();
  for (const { uz, ru } of tuples) {
    const k = normalizeRuWord(ru);
    if (!k) continue;
    if (!map.has(k)) map.set(k, uz.trim());
  }
  return map;
}

/** Barcha migratsiyalardan reading lexeme juftlari: normalized kalit → tarjima (so‘nggi yozuv ustunlik qiladi). */
function loadLexemeTranslationMap(allSql: string): Map<string, string> {
  const map = new Map<string, string>();
  const re =
    /\(\s*'(kunlik-oqish-\d+)'\s*,\s*'((?:[^']|'')*)'\s*,\s*'((?:[^']|'')*)'\s*,\s*'((?:[^']|'')*)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(allSql))) {
    const uz = sqlUnquote(m[4]).trim();
    if (!uz) continue;
    const k = normalizeRuWord(sqlUnquote(m[3]));
    if (!k) continue;
    map.set(k, uz);
  }
  return map;
}

function main() {
  let chunkSql = '';
  for (const f of CONTENT_FILES) chunkSql += readMigration(f);

  const passages = extractPassages(chunkSql).filter((p) => p.dayNumber >= 14 && p.dayNumber <= 40);
  const lexRows = extractLexemes(chunkSql);

  const vocabByDay = new Map<number, string[]>();
  const tuplesChunk = extractDailyVocabTuples(chunkSql);
  for (const { day, ru } of tuplesChunk) {
    if (day < 14 || day > 40) continue;
    const arr = vocabByDay.get(day) ?? [];
    arr.push(ru);
    vocabByDay.set(day, arr);
  }

  const lexByText = new Map<string, LexRow[]>();
  for (const L of lexRows) {
    const arr = lexByText.get(L.textId) ?? [];
    arr.push(L);
    lexByText.set(L.textId, arr);
  }

  let allSql = '';
  const migDir = path.join(ROOT, 'db/migrations');
  for (const name of fs.readdirSync(migDir).sort()) {
    if (!name.endsWith('.sql')) continue;
    allSql += fs.readFileSync(path.join(migDir, name), 'utf8') + '\n';
  }
  const globalVocab = loadGlobalVocabMap(allSql);
  const lexemeUzByNorm = loadLexemeTranslationMap(allSql);
  const fallbackExtra = loadFallbackExtraJson();

  type InsertRow = { textId: string; wordRu: string; norm: string; translationUz: string };
  const inserts: InsertRow[] = [];
  const unresolved = new Set<string>();

  for (const p of passages) {
    const tokens = extractRuWordTokens(p.bodyRu);
    const counts = new Map<string, number>();
    for (const t of tokens) {
      const k = normalizeRuWord(t);
      if (!k) continue;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }

    const lexemeRows = lexByText.get(p.textId) ?? [];
    const vocabRuWords = vocabByDay.get(p.dayNumber) ?? [];
    const coverage = buildCoverageKeys({ lexemeRows: lexemeRows, vocabRuWords });

    for (const norm of counts.keys()) {
      if (coverage.has(norm)) continue;
      const uz =
        globalVocab.get(norm)?.trim() ||
        lexemeUzByNorm.get(norm)?.trim() ||
        fallbackExtra[norm]?.trim();
      if (!uz) {
        unresolved.add(norm);
        continue;
      }
      const wordRu = firstSurfaceForNorm(p.bodyRu, norm);
      inserts.push({
        textId: p.textId,
        wordRu,
        norm,
        translationUz: uz,
      });
    }
  }

  inserts.sort((a, b) => {
    const d = a.textId.localeCompare(b.textId);
    if (d !== 0) return d;
    return a.norm.localeCompare(b.norm, 'ru');
  });

  const sqlLines: string[] = [];
  sqlLines.push(`-- Kunlik o‘qish 14–40: matnda uchraydi, lekin leksikon+lug‘atda yo‘q bo‘lgan tokenlar uchun qo‘shimcha lexemalar.`);
  sqlLines.push(`-- Offline generator: scripts/offlineGenerate076ReadingLexemeFill.ts`);
  sqlLines.push('');
  sqlLines.push(`-- UNIQUE indeks — ON CONFLICT uchun majburiy (054 da indeks vaqtincha olib tashlangan edi).`);
  sqlLines.push(`DELETE FROM public.daily_reading_lexemes l`);
  sqlLines.push(`WHERE COALESCE(trim(l.text_id), '') <> ''`);
  sqlLines.push(`  AND EXISTS (`);
  sqlLines.push(`    SELECT 1`);
  sqlLines.push(`    FROM public.daily_reading_lexemes l2`);
  sqlLines.push(`    WHERE l2.text_id = l.text_id`);
  sqlLines.push(`      AND l2.word_ru_normalized = l.word_ru_normalized`);
  sqlLines.push(`      AND l2.id < l.id`);
  sqlLines.push(`  );`);
  sqlLines.push('');
  sqlLines.push(
    `CREATE UNIQUE INDEX IF NOT EXISTS uq_daily_reading_lexemes_text_word_norm`,
  );
  sqlLines.push(`  ON public.daily_reading_lexemes (text_id, word_ru_normalized);`);
  sqlLines.push('');
  sqlLines.push(
    `INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)`,
  );
  sqlLines.push(`VALUES`);
  sqlLines.push(
    inserts
      .map(
        (r) =>
          `  ('${escapeSqlLiteral(r.textId)}', '${escapeSqlLiteral(r.wordRu)}', '${escapeSqlLiteral(r.norm)}', '${escapeSqlLiteral(r.translationUz)}', NULL)`,
      )
      .join(',\n'),
  );
  sqlLines.push(`ON CONFLICT (text_id, word_ru_normalized) DO NOTHING;`);
  sqlLines.push('');

  const outPath = path.join(migDir, '076_kunlik_reading_lexemes_fill_gaps.sql');
  fs.writeFileSync(outPath, sqlLines.join('\n'), 'utf8');

  console.error(`[076] yozildi: ${outPath}`);
  console.error(`[076] INSERT qatorlari: ${inserts.length}`);
  if (unresolved.size > 0) {
    const unrPath = path.join(ROOT, 'scripts/generated/unresolved_lexeme_norms_076.json');
    fs.mkdirSync(path.dirname(unrPath), { recursive: true });
    fs.writeFileSync(unrPath, JSON.stringify([...unresolved].sort((a, b) => a.localeCompare(b, 'ru')), null, 2), 'utf8');
    console.error(`[076] tarjimasiz qolgan norlmalar (${unresolved.size}) → ${unrPath}`);
    console.error([...unresolved].sort((a, b) => a.localeCompare(b, 'ru')).join(', '));
    process.exitCode = 1;
  }
}

main();
