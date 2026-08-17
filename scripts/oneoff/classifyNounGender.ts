/**
 * classifyNounGender.ts — «So'z savati» o'yini uchun otlarni ROD bo'yicha ajratadi.
 *
 * Lug'atda (wordChainWords) otlardan tashqari fe'l, sifat, ravish ham bor —
 * ularning rodi yo'q. Shuning uchun har bir so'z AI orqali tekshiriladi, so'ng
 * javob QO'SHIMCHA ravishda oxirgi harf qoidasi bilan solishtiriladi:
 *
 *   -а/-я → женский · -о/-е → средний · undosh → мужской · -ь → umuman olinmaydi
 *
 * AI va qoida BIR XIL javob bermasa — so'z tashlab yuboriladi (istisnolar
 * ro'yxatidagilardan tashqari). Shunday qilib o'yinga faqat 100% ishonchli
 * so'zlar tushadi.
 *
 * Ishga tushirish:  npx tsx scripts/oneoff/classifyNounGender.ts
 * Natija:           src/data/russianNounGender.ts
 */
import { writeFileSync } from 'node:fs';
import 'dotenv/config';
import { WORD_CHAIN_WORDS } from '../../src/data/wordChainWords';
import { openaiJson } from '../../server/lib/openai';

type Gender = 'm' | 'f' | 'n';

const VOWELS = 'аеёиоуыэюя';

/** Oxirgi harfdan kelib chiqadigan rod. Aniqlab bo'lmasa — null. */
function genderFromEnding(word: string): Gender | null {
  const last = word.at(-1) ?? '';
  if (last === 'ь') return null;
  if (last === 'а' || last === 'я') return 'f';
  if (last === 'о' || last === 'е' || last === 'ё') return 'n';
  if (!VOWELS.includes(last)) return 'm'; // undosh va «й»
  return null; // -и, -у, -ы, -э, -ю: o'zgarmas yoki ko'plik
}

/**
 * Klassik istisnolar: qoidaga bo'ysunmaydi, lekin o'quvchi bilishi shart.
 * AI ham shu rodni tasdiqlasa qo'shiladi.
 */
const EXCEPTIONS: Record<string, Gender> = {
  папа: 'm', дядя: 'm', дедушка: 'm', мужчина: 'm', юноша: 'm', староста: 'm',
  время: 'n', имя: 'n', племя: 'n', семя: 'n', знамя: 'n', пламя: 'n', бремя: 'n',
  стремя: 'n', темя: 'n',
};

/**
 * O'quv o'yiniga mos kelmaydigan so'zlar (auditoriyada 14 yoshdan boshlab
 * o'quvchilar bor). Lug'atning o'zi tegilmaydi — faqat shu o'yin chetlab o'tadi.
 */
const BLOCKED = new Set([
  'пенис',
  'влагалище',
  'сперма',
  'эрекция',
  'менструация',
  'презерватив',
  'секс',
  'проститутка',
  'порно',
  'изнасилование',
  'наркотик',
  'наркоман',
  'героин',
  'кокаин',
  'марихуана',
  'понос',
  'моча',
  'геморрой',
  'анус',
  'сперматозоид',
]);

const BATCH = 60;

async function classify(words: string[]): Promise<Record<string, { noun: boolean; gender?: Gender }>> {
  const res = await openaiJson<{ items: { w: string; noun: boolean; g?: string }[] }>({
    system:
      'Ты — эксперт по русской морфологии. Для каждого слова определи, является ли оно ' +
      'ИМЕНЕМ СУЩЕСТВИТЕЛЬНЫМ в начальной форме (именительный падеж, единственное число). ' +
      'Прилагательные, глаголы, наречия, местоимения, предлоги, числительные, слова только ' +
      'во множественном числе и субстантивированные прилагательные (столовая, ванная) — это noun=false. ' +
      'Если noun=true, укажи род: "m" (мужской), "f" (женский), "n" (средний). ' +
      'Отвечай строго JSON: {"items":[{"w":"слово","noun":true,"g":"m"}]}. Без пояснений.',
    user: JSON.stringify(words),
    temperature: 0,
    maxTokens: 4000,
  });
  const out: Record<string, { noun: boolean; gender?: Gender }> = {};
  for (const it of res.items ?? []) {
    const g = it.g === 'm' || it.g === 'f' || it.g === 'n' ? it.g : undefined;
    out[String(it.w).toLowerCase()] = { noun: Boolean(it.noun), gender: g };
  }
  return out;
}

async function main() {
  const all = Array.from(
    new Set(
      Object.values(WORD_CHAIN_WORDS)
        .flat()
        .map((w) => w.trim().toLowerCase())
        .filter(Boolean),
    ),
  );

  // «ь» bilan tugaganlar va rodi qoidadan chiqmaydiganlar AI ga ham yuborilmaydi.
  const candidates = all.filter(
    (w) => !BLOCKED.has(w) && (genderFromEnding(w) !== null || w in EXCEPTIONS),
  );
  console.log(`jami ${all.length}, nomzod ${candidates.length}`);

  const verdicts: Record<string, { noun: boolean; gender?: Gender }> = {};
  for (let i = 0; i < candidates.length; i += BATCH) {
    const chunk = candidates.slice(i, i + BATCH);
    let ok = false;
    for (let attempt = 0; attempt < 3 && !ok; attempt += 1) {
      try {
        Object.assign(verdicts, await classify(chunk));
        ok = true;
      } catch (err) {
        console.warn(`  qayta urinish ${attempt + 1}: ${(err as Error).message}`);
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
    if (!ok) console.error(`  ${i}-paket o'tkazib yuborildi`);
    console.log(`  ${Math.min(i + BATCH, candidates.length)}/${candidates.length}`);
  }

  const buckets: Record<Gender, string[]> = { m: [], f: [], n: [] };
  const dropped: string[] = [];
  for (const word of candidates) {
    const v = verdicts[word];
    if (!v?.noun || !v.gender) {
      dropped.push(word);
      continue;
    }
    const expected = EXCEPTIONS[word] ?? genderFromEnding(word);
    if (expected !== v.gender) {
      dropped.push(word);
      continue;
    }
    buckets[v.gender].push(word);
  }

  for (const g of ['m', 'f', 'n'] as Gender[]) {
    buckets[g] = Array.from(new Set(buckets[g])).sort((a, b) => a.localeCompare(b, 'ru'));
  }
  console.log(
    `natija: m=${buckets.m.length} f=${buckets.f.length} n=${buckets.n.length}, tashlandi ${dropped.length}`,
  );

  const fmt = (list: string[]) =>
    list
      .reduce<string[][]>((rows, w, i) => {
        if (i % 8 === 0) rows.push([]);
        rows[rows.length - 1].push(`'${w}'`);
        return rows;
      }, [])
      .map((row) => `  ${row.join(', ')},`)
      .join('\n');

  const file = `/**
 * russianNounGender.ts — «So'z savati» o'yini uchun ROD bo'yicha ajratilgan otlar.
 *
 * AVTOMATIK YARATILGAN: scripts/oneoff/classifyNounGender.ts
 * Qo'lda tahrirlamang — skriptni qayta ishga tushiring.
 *
 * Har bir so'z ikki marta tekshirilgan: (1) AI uni ot deb tasdiqlagan va rodini
 * aytgan, (2) o'sha rod oxirgi harf qoidasiga mos kelgan. Mos kelmaganlari va
 * «ь» bilan tugaydiganlari umuman olinmagan.
 */

export type RussianGender = 'm' | 'f' | 'n';

/** Мужской род — undosh bilan tugaydi. */
export const NOUNS_MASCULINE: string[] = [
${fmt(buckets.m)}
];

/** Женский род — «-а» yoki «-я» bilan tugaydi. */
export const NOUNS_FEMININE: string[] = [
${fmt(buckets.f)}
];

/** Средний род — «-о» yoki «-е» bilan tugaydi. */
export const NOUNS_NEUTER: string[] = [
${fmt(buckets.n)}
];

export const NOUNS_BY_GENDER: Record<RussianGender, string[]> = {
  m: NOUNS_MASCULINE,
  f: NOUNS_FEMININE,
  n: NOUNS_NEUTER,
};
`;
  writeFileSync('src/data/russianNounGender.ts', file, 'utf8');
  console.log('yozildi: src/data/russianNounGender.ts');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
