/**
 * Kunlik o‘qish (kun 14–40): matndan chiqqan ruscha tokenlar qanchalik `daily_reading_lexemes`
 * va `daily_vocab_words` bilan qoplanganini tekshiradi (frontend bilan bir xil tokenizer va normalizeRuWord).
 *
 * Ishlatish: `.env` da SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY bo‘lishi kerak.
 *
 *   npm run report:kunlik-reading-gaps
 *   npm run report:kunlik-reading-gaps -- --json
 *   npm run report:kunlik-reading-gaps -- --out ./scripts/generated/foo.md
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { normalizeRuWord } from '../shared/russianLexemeNormalize.ts';

const DAY_FROM = 14;
const DAY_TO = 40;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name} (set in .env)`);
  return v;
}

/** InteractiveDailyReading.tsx bilan mos */
function extractRuWordTokens(text: string): string[] {
  const chunks = text.match(/([А-Яа-яЁё-]+|\s+|[^\sА-Яа-яЁё-]+)/g) ?? [];
  const words: string[] = [];
  for (const chunk of chunks) {
    if (/^[А-Яа-яЁё-]+$/.test(chunk)) words.push(chunk);
  }
  return words;
}

function buildCoverageKeys(opts: {
  lexemeRows: { word_ru: string; word_ru_normalized: string }[];
  vocabRuWords: string[];
}): Set<string> {
  const keys = new Set<string>();
  for (const L of opts.lexemeRows) {
    const a = normalizeRuWord(L.word_ru_normalized || L.word_ru);
    if (a) keys.add(a);
    const b = normalizeRuWord(L.word_ru);
    if (b) keys.add(b);
  }
  for (const ru of opts.vocabRuWords) {
    const k = normalizeRuWord(ru);
    if (k) keys.add(k);
  }
  return keys;
}

type DayGap = {
  dayNumber: number;
  textId: string;
  uniqueTotal: number;
  uniqueMissing: number;
  missingSorted: string[];
  missingCounts: Record<string, number>;
};

async function main() {
  const argv = process.argv.slice(2);
  const asJson = argv.includes('--json');
  const outIdx = argv.indexOf('--out');
  const outPath = outIdx >= 0 ? argv[outIdx + 1] : '';

  const sb = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data: passages, error: pErr } = await sb
    .from('daily_reading_passages')
    .select('day_number, text_id, body_ru')
    .gte('day_number', DAY_FROM)
    .lte('day_number', DAY_TO)
    .order('day_number', { ascending: true });

  if (pErr) throw pErr;
  const plist = passages ?? [];
  if (plist.length === 0) {
    console.error(`DB da kun ${DAY_FROM}–${DAY_TO} uchun daily_reading_passages topilmadi.`);
    process.exit(1);
  }

  const textIds = [...new Set(plist.map((p: { text_id: string }) => String(p.text_id ?? '').trim()).filter(Boolean))];

  const { data: lexRows, error: lErr } = await sb
    .from('daily_reading_lexemes')
    .select('text_id, word_ru, word_ru_normalized')
    .in('text_id', textIds);

  if (lErr) throw lErr;

  const lexByText = new Map<string, { word_ru: string; word_ru_normalized: string }[]>();
  for (const row of lexRows ?? []) {
    const tid = String((row as { text_id?: string }).text_id ?? '');
    if (!tid) continue;
    const list = lexByText.get(tid) ?? [];
    list.push({
      word_ru: String((row as { word_ru?: string }).word_ru ?? ''),
      word_ru_normalized: String((row as { word_ru_normalized?: string }).word_ru_normalized ?? ''),
    });
    lexByText.set(tid, list);
  }

  const { data: vocabRows, error: vErr } = await sb
    .from('daily_vocab_words')
    .select('day_number, word_ru')
    .gte('day_number', DAY_FROM)
    .lte('day_number', DAY_TO);

  if (vErr) throw vErr;

  const vocabByDay = new Map<number, string[]>();
  for (const row of vocabRows ?? []) {
    const d = Number((row as { day_number?: number }).day_number);
    const ru = String((row as { word_ru?: string }).word_ru ?? '').trim();
    if (!Number.isFinite(d) || !ru) continue;
    const arr = vocabByDay.get(d) ?? [];
    arr.push(ru);
    vocabByDay.set(d, arr);
  }

  const gaps: DayGap[] = [];
  let globalMissingFreq = new Map<string, number>();

  for (const p of plist as { day_number: number; text_id: string; body_ru: string }[]) {
    const dayNumber = Number(p.day_number);
    const textId = String(p.text_id ?? '').trim();
    const body = String(p.body_ru ?? '');
    const tokens = extractRuWordTokens(body);

    const lexemeRows = lexByText.get(textId) ?? [];
    const vocabRuWords = vocabByDay.get(dayNumber) ?? [];
    const coverage = buildCoverageKeys({ lexemeRows, vocabRuWords });

    const counts = new Map<string, number>();
    for (const t of tokens) {
      const k = normalizeRuWord(t);
      if (!k) continue;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }

    const uniqueTotal = counts.size;
    const missingCounts: Record<string, number> = {};
    for (const [norm, n] of counts) {
      if (!coverage.has(norm)) {
        missingCounts[norm] = n;
        globalMissingFreq.set(norm, (globalMissingFreq.get(norm) ?? 0) + n);
      }
    }

    const missingSorted = Object.keys(missingCounts).sort((a, b) => {
      const diff = missingCounts[b]! - missingCounts[a]!;
      if (diff !== 0) return diff;
      return a.localeCompare(b, 'ru');
    });

    gaps.push({
      dayNumber,
      textId,
      uniqueTotal,
      uniqueMissing: missingSorted.length,
      missingSorted,
      missingCounts,
    });
  }

  if (asJson) {
    console.log(JSON.stringify({ dayFrom: DAY_FROM, dayTo: DAY_TO, gaps }, null, 2));
    return;
  }

  const lines: string[] = [];
  lines.push(`# Kunlik o‘qish: leksika «bo‘shliqlari» (kun ${DAY_FROM}–${DAY_TO})`);
  lines.push('');
  lines.push(
    `Qo‘llama: tokenizer va normalizatsiya \`InteractiveDailyReading\` / \`normalizeRuWord\` bilan bir xil. ` +
      `Qoplama = \`daily_reading_lexemes\` (shu matnning \`text_id\`) + \`daily_vocab_words\` (shu \`day_number\`).`,
  );
  lines.push('');
  lines.push(`Hisobot vaqti: ${new Date().toISOString()}`);
  lines.push('');

  const totalMissingUnique = new Set<string>();
  let sumMissingInstances = 0;
  for (const g of gaps) {
    for (const k of g.missingSorted) {
      totalMissingUnique.add(k);
      sumMissingInstances += g.missingCounts[k] ?? 0;
    }
  }

  lines.push('## Qisqa statistikalar');
  lines.push('');
  lines.push(`| Ko‘rsatkich | Qiymat |`);
  lines.push(`|---|---:|`);
  lines.push(`| Kunlar soni | ${gaps.length} |`);
  lines.push(`| Barcha kunlarda turli-xil «yetishmayotgan» tokenlar | ${totalMissingUnique.size} |`);
  lines.push(`| Yetishmayotgan bosilishlar (jami, takror bilan) | ${sumMissingInstances} |`);
  lines.push('');

  const topGlobal = [...globalMissingFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40);
  lines.push('### Ko‘p uchraydigan yetishmayotgan tokenlar (barcha kunlar)');
  lines.push('');
  if (topGlobal.length === 0) {
    lines.push('*(hammasi qoplangan — yoki matnlar bo‘sh)*');
  } else {
    lines.push(`| Token (norm.) | Bosilishlar |`);
    lines.push(`|---|---:|`);
    for (const [w, n] of topGlobal) lines.push(`| ${w} | ${n} |`);
  }
  lines.push('');

  lines.push('## Kunlar bo‘yicha');
  lines.push('');

  for (const g of gaps) {
    const pct =
      g.uniqueTotal === 0 ? 100 : Math.round(((g.uniqueTotal - g.uniqueMissing) / g.uniqueTotal) * 1000) / 10;
    lines.push(`### Kun ${g.dayNumber} (\`${g.textId}\`)`);
    lines.push('');
    lines.push(`- Turli tokenlar matnda: **${g.uniqueTotal}**`);
    lines.push(`- Leksikon + lug‘at bilan qoplanmagan turli tokenlar: **${g.uniqueMissing}** (~${pct}% qoplangan)`);
    lines.push('');
    if (g.missingSorted.length === 0) {
      lines.push('*Bu kun uchun yetishmayotgan token yo‘q.*');
    } else {
      lines.push('| Token | Matndagi takror |');
      lines.push('|---|---:|');
      for (const k of g.missingSorted) {
        lines.push(`| ${k} | ${g.missingCounts[k]} |`);
      }
    }
    lines.push('');
  }

  const md = lines.join('\n');
  console.log(md);

  const defaultOut = path.join(path.dirname(fileURLToPath(import.meta.url)), 'generated', 'kunlik_reading_lexeme_gaps_14_40.md');
  const target = outPath && outPath.trim() !== '' ? path.resolve(process.cwd(), outPath.trim()) : defaultOut;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, md, 'utf8');
  console.error(`\n[yozildi] ${target}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
