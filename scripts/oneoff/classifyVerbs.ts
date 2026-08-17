/**
 * classifyVerbs.ts — «Fe'l ustasi» o'yini uchun fe'llarni tuslanishi bilan ajratadi.
 *
 * Lug'atda (wordChainWords) fe'llardan tashqari ot, sifat, ravish ham bor.
 * Shuning uchun har bir nomzod AI orqali tekshiriladi, so'ng javob QO'SHIMCHA
 * ravishda rus morfologiyasi qoidalari bilan solishtiriladi:
 *
 *   я  → -у/-ю          мы  → -ем/-ём/-им
 *   ты → -ешь/-ёшь/-ишь вы  → -ете/-ёте/-ите
 *   он → -ет/-ёт/-ит    они → -ут/-ют/-ат/-ят
 *
 * Bundan tashqari oltala shakl bir xil o'zakdan chiqishi shart (kamida 2 ta
 * umumiy harf) — bu AI shaklni «o'ylab topib» yuborgan holatni tutadi.
 *
 * Qoidaga tushmagan noto'g'ri fe'llar (есть → ем, ешь, ест) ATAYLAB tashlab
 * yuboriladi: o'yinga faqat 100% ishonchli tuslanish tushsin. Ular kamayish
 * hisobiga emas, xatoning oldini olish hisobiga yutamiz.
 *
 * Ishga tushirish:  npx tsx scripts/oneoff/classifyVerbs.ts
 * Natija:           src/data/russianVerbConjugation.ts
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import 'dotenv/config';
import { WORD_CHAIN_WORDS, WORD_CHAIN_LEVELS, type WordChainLevel } from '../../src/data/wordChainWords';
import { openaiJson } from '../../server/lib/openai';

/** Vid: 'i' — несовершенный (nima qilyapman), 'p' — совершенный (nima qildim/qilaman). */
type Aspect = 'i' | 'p';

/** [я, ты, он, мы, вы, они] tartibida. */
type Forms = [string, string, string, string, string, string];

type Verdict = {
  verb: boolean;
  aspect?: Aspect;
  forms?: string[];
  uz?: string;
};

/** Infinitiv shunday tugashi shart — aks holda AI ga ham yuborilmaydi. */
const INFINITIVE_RE = /(ать|ять|ить|еть|уть|ыть|оть|ти|чь)(ся|сь)?$/;

/**
 * Har bir shaxs uchun ruxsat etilgan oxirlar. Qaytim fe'llarida («-ся»)
 * qo'shimcha oldindan ajratib olinadi, shuning uchun bu yerda yo'q.
 */
const ENDINGS: Record<number, string[]> = {
  0: ['у', 'ю'],
  1: ['ешь', 'ёшь', 'ишь'],
  2: ['ет', 'ёт', 'ит'],
  3: ['ем', 'ём', 'им'],
  4: ['ете', 'ёте', 'ите'],
  5: ['ут', 'ют', 'ат', 'ят'],
};

const CYRILLIC_ONLY = /^[а-яё]+$/;

/**
 * II tuslanishda («ты» shakli «-ишь» bilan tugaydi) «я» shaklida o'zakning
 * oxirgi undoshi MAJBURIY almashadi: катить → качу, любить → люблю,
 * носить → ношу. Bu jadval o'sha almashinuvlarni to'liq sanaydi.
 *
 * Almashinuvi bo'lmagan «катю» kabi shakl aynan shu tekshiruvda tutiladi —
 * boshqa hech qaysi qoida uni ushlay olmaydi, chunki qolgan besh shakl to'g'ri.
 */
const ALT_1SG: Record<string, string[]> = {
  ст: ['щ'], ск: ['щ'],
  т: ['ч', 'щ'], д: ['ж', 'жд'], с: ['ш'], з: ['ж'],
  к: ['ч'], г: ['ж'], х: ['ш'],
  б: ['бл'], п: ['пл'], в: ['вл'], м: ['мл'], ф: ['фл'],
};

/** «я» shakli o'zagi shu ro'yxatdagilardan biri bo'lishi shart. */
function allowed1sgStems(root: string, secondConjugation: boolean): string[] {
  if (!secondConjugation) return [root]; // I tuslanish: o'zak o'zgarmaydi (пишешь → пишу)
  const two = root.slice(-2);
  const one = root.slice(-1);
  if (ALT_1SG[two]) return ALT_1SG[two].map((alt) => root.slice(0, -2) + alt);
  if (ALT_1SG[one]) return ALT_1SG[one].map((alt) => root.slice(0, -1) + alt);
  return [root]; // ч/ж/ш/щ/л/н/р va unli — almashmaydi (учу, говорю, стою)
}

/**
 * O'quv o'yiniga mos kelmaydigan fe'llar (auditoriyada 14 yoshdan boshlab
 * o'quvchilar bor). Lug'atning o'zi tegilmaydi — faqat shu o'yin chetlab o'tadi.
 */
const BLOCKED = new Set([
  'убивать', 'убить', 'насиловать', 'изнасиловать', 'вешаться', 'повеситься',
  'спиться', 'колоться', 'блевать', 'мочиться', 'какать', 'совокупляться',
  'абортировать', 'казнить', 'пытать', 'истязать',
]);

/**
 * Qaytim qo'shimchasini ajratadi: 'учиться' → ['учить', 'ся'].
 * Tuslangan shaklda qo'shimcha unlidan keyin 'сь', undoshdan keyin 'ся' bo'ladi.
 */
function stripReflexive(word: string): { stem: string; reflexive: boolean } {
  if (word.endsWith('ся')) return { stem: word.slice(0, -2), reflexive: true };
  if (word.endsWith('сь')) return { stem: word.slice(0, -2), reflexive: true };
  return { stem: word, reflexive: false };
}

const VOWELS = 'аеёиоуыэюя';

/**
 * Infinitivning tuslanishda O'ZGARMAY qoladigan qismi.
 *
 * Rus tilida hozirgi zamon o'zagi infinitiv o'zagidan tematik unlini tashlash
 * bilan yasaladi va tovush almashinuvi FAQAT o'zakning oxirgi undoshida bo'ladi
 * (писать → пиш-, любить → любл-). Demak oxirgi undoshni ham kesib tashlasak,
 * qolgan qism barcha shaklda bir xil turishi shart.
 *
 * Aynan shu tekshiruv vid juftliklarini ajratadi: выбирать → «выби», lekin
 * выберу «выби» bilan boshlanmaydi — AI сов. vid shaklini bergani fosh bo'ladi.
 */
function invariantBase(infinitiveStem: string): string {
  const stem = infinitiveStem.replace(/(ать|ять|ить|еть|уть|ыть|оть|ти|чь)$/, '');
  // «-овать/-евать» sinfida butun qo'shimcha «-у-» ga aylanadi
  // (рисовать → рисую, танцевать → танцую), shuning uchun uni ham kesamiz.
  if (/(ов|ев)$/.test(stem)) return stem.slice(0, -2);
  /*
   * Tovush almashinuvi o'zak oxiridagi BUTUN undosh guruhini almashtirishi
   * mumkin: искать → ищу («ск» → «щ»), свистеть → свищу («ст» → «щ»).
   * Shuning uchun oxiridagi undoshlarning hammasini kesamiz, bitta emas.
   */
  let out = stem;
  while (out.length > 0 && !VOWELS.includes(out.at(-1) ?? '')) out = out.slice(0, -1);
  return out;
}

/** Ro'yxatdagi barcha satrlarning umumiy boshlanish uzunligi. */
function commonPrefixLength(items: string[]): number {
  if (items.length === 0) return 0;
  let n = 0;
  const first = items[0];
  while (n < first.length && items.every((s) => s[n] === first[n])) n += 1;
  return n;
}

/**
 * AI qaytargan tuslanishni qoidalar bilan tekshiradi. Mos kelsa — normallashgan
 * oltilikni, aks holda null qaytaradi.
 */
function validateForms(infinitive: string, raw: string[] | undefined): Forms | null {
  if (!raw || raw.length !== 6) return null;

  const forms = raw.map((f) => String(f).trim().toLowerCase().replace(/ё/g, 'ё'));
  if (forms.some((f) => !f || !CYRILLIC_ONLY.test(f) || f.length < 2)) return null;

  const inf = stripReflexive(infinitive);

  // Qaytim fe'lning HAMMA shakli qaytim bo'lishi shart (va aksincha).
  const stems: string[] = [];
  for (const form of forms) {
    const s = stripReflexive(form);
    if (s.reflexive !== inf.reflexive) return null;
    if (s.stem.length < 2) return null;
    stems.push(s.stem);
  }

  // Har bir shaxs o'z oxiriga ega bo'lsin.
  for (let i = 0; i < 6; i += 1) {
    if (!ENDINGS[i].some((end) => stems[i].endsWith(end))) return null;
  }

  // Oltala shakl bitta o'zakdan: пиш|у, пиш|ешь, ... — kamida 2 harf umumiy.
  if (commonPrefixLength(stems) < 2) return null;

  /*
   * ты/он/мы/вы/они shakllarida o'zak AYNAN bir xil bo'lishi shart (люб|ишь,
   * люб|ит, люб|им, люб|ите, люб|ят). Faqat «я» shakli almashinishi mumkin
   * (люблю, вижу), shuning uchun u bu tekshiruvdan tashqarida.
   *
   * Bu — AI o'zakning ichida bitta harfni buzib yuborgan holatga qarshi yagona
   * himoya: «людишь» umumiy boshlanish tekshiruvidan o'tib ketardi, chunki
   * «лю» baribir umumiy bo'lib qolaveradi.
   */
  const roots = new Set<string>();
  for (let i = 1; i < 6; i += 1) {
    const end = ENDINGS[i].find((e) => stems[i].endsWith(e));
    if (!end) return null;
    roots.add(stems[i].slice(0, -end.length));
  }
  if (roots.size !== 1) return null;

  // «я» shakli — o'zak almashinuvi to'g'ri bajarilganmi (качу, а не «катю»).
  const root = [...roots][0];
  const ya = stems[0].slice(0, -1); // oxirgi «у»/«ю» ni olib tashlaymiz
  if (!allowed1sgStems(root, stems[1].endsWith('ишь')).includes(ya)) return null;

  // Tuslanish AYNAN shu infinitivniki bo'lsin (vid juftliginiki emas).
  const base = invariantBase(inf.stem);
  if (base.length >= 2) {
    if (!stems.every((s) => s.startsWith(base))) return null;
  } else if (stems[0][0] !== inf.stem[0]) {
    // Juda qisqa o'zak (жить, брать) — bunday nozik tekshiruv imkonsiz.
    return null;
  }

  // Barcha shakl bir xil bo'lib qolgan bo'lsa — bu tuslanish emas.
  if (new Set(forms).size < 5) return null;

  return forms as Forms;
}

/**
 * QO'LDA tekshirilgan fe'llar — AI javobi umuman so'ralmaydi. Ikki sabab bilan
 * bu yerga tushadi:
 *
 *  1. Разноспрягаемый — o'zagi shaxsdan shaxsga o'zgaradi (хотеть, бежать,
 *     мочь, есть), shuning uchun qat'iy o'zak tekshiruvidan o'ta olmaydi.
 *  2. AI shu so'zda barqaror xato qiladi: «любить» uchun bir necha marta
 *     «людишь», «бояться» uchun «бояшься» qaytardi. Tekshiruv ularni to'g'ri
 *     tutdi, lekin bu asosiy fe'llarni o'yindan chiqarib yuborardi.
 *
 * «быть» ataylab yo'q: uning «буду» shakllari kelasi zamon, lekin vidi
 * несовершенный — o'yin zamon yorlig'ini xato ko'rsatib qo'yardi.
 */
const IRREGULAR: Record<string, { aspect: Aspect; uz: string; forms: Forms }> = {
  любить: {
    aspect: 'i',
    uz: 'sevmoq',
    forms: ['люблю', 'любишь', 'любит', 'любим', 'любите', 'любят'],
  },
  бояться: {
    aspect: 'i',
    uz: "qo'rqmoq",
    forms: ['боюсь', 'боишься', 'боится', 'боимся', 'боитесь', 'боятся'],
  },
  мочь: {
    aspect: 'i',
    uz: 'qila olmoq',
    forms: ['могу', 'можешь', 'может', 'можем', 'можете', 'могут'],
  },
  есть: {
    aspect: 'i',
    uz: 'yemoq',
    forms: ['ем', 'ешь', 'ест', 'едим', 'едите', 'едят'],
  },
  хотеть: {
    aspect: 'i',
    uz: 'xohlamoq',
    forms: ['хочу', 'хочешь', 'хочет', 'хотим', 'хотите', 'хотят'],
  },
  захотеть: {
    aspect: 'p',
    uz: 'xohlab qolmoq',
    forms: ['захочу', 'захочешь', 'захочет', 'захотим', 'захотите', 'захотят'],
  },
  бежать: {
    aspect: 'i',
    uz: 'yugurmoq',
    forms: ['бегу', 'бежишь', 'бежит', 'бежим', 'бежите', 'бегут'],
  },
  дать: {
    aspect: 'p',
    uz: 'bermoq',
    forms: ['дам', 'дашь', 'даст', 'дадим', 'дадите', 'дадут'],
  },
  продать: {
    aspect: 'p',
    uz: 'sotmoq',
    forms: ['продам', 'продашь', 'продаст', 'продадим', 'продадите', 'продадут'],
  },
  создать: {
    aspect: 'p',
    uz: 'yaratmoq',
    forms: ['создам', 'создашь', 'создаст', 'создадим', 'создадите', 'создадут'],
  },
};

const BATCH = 25;

async function classify(words: string[]): Promise<Record<string, Verdict>> {
  const res = await openaiJson<{ items: Verdict[] & { w: string }[] }>({
    system:
      'Ты — эксперт по русской морфологии и преподаватель РКИ для узбекоговорящих. ' +
      'Для каждого слова определи, является ли оно ГЛАГОЛОМ в инфинитиве. ' +
      'Существительные, прилагательные, наречия, причастия — это verb=false. ' +
      'Если verb=true, укажи: ' +
      '"a" — вид: "i" (несовершенный) или "p" (совершенный); ' +
      '"f" — массив из 6 форм НАСТОЯЩЕГО времени (для несовершенного) или ' +
      'ПРОСТОГО БУДУЩЕГО (для совершенного), строго в порядке: я, ты, он, мы, вы, они; ' +
      '"uz" — краткий перевод на УЗБЕКСКИЙ язык латиницей (1-3 слова, инфинитив, например "yozmoq"). ' +
      'Если у глагола нет формы 1-го лица ед. ч. (победить, убедить) или он безличный — ставь verb=false. ' +
      'Пиши букву ё там, где она есть (идёшь, а не идешь). ' +
      'Отвечай строго JSON: {"items":[{"w":"писать","verb":true,"a":"i",' +
      '"f":["пишу","пишешь","пишет","пишем","пишете","пишут"],"uz":"yozmoq"}]}. Без пояснений.',
    user: JSON.stringify(words),
    temperature: 0,
    maxTokens: 4000,
  });

  const out: Record<string, Verdict> = {};
  for (const it of res.items ?? []) {
    const item = it as unknown as { w: string; verb: boolean; a?: string; f?: string[]; uz?: string };
    out[String(item.w).toLowerCase()] = {
      verb: Boolean(item.verb),
      aspect: item.a === 'i' || item.a === 'p' ? item.a : undefined,
      forms: Array.isArray(item.f) ? item.f : undefined,
      uz: typeof item.uz === 'string' ? item.uz.trim() : undefined,
    };
  }
  return out;
}

type VerbEntry = {
  inf: string;
  aspect: Aspect;
  forms: Forms;
  uz: string;
  level: WordChainLevel;
};

async function main() {
  // So'z birinchi marta qaysi darajada uchrasa — o'sha uning darajasi.
  const levelOf = new Map<string, WordChainLevel>();
  for (const lv of WORD_CHAIN_LEVELS) {
    for (const raw of WORD_CHAIN_WORDS[lv]) {
      const w = raw.trim().toLowerCase();
      if (w && !levelOf.has(w)) levelOf.set(w, lv);
    }
  }

  let candidates = [...levelOf.keys()].filter(
    (w) => !BLOCKED.has(w) && INFINITIVE_RE.test(w) && w.length >= 4 && !(w in IRREGULAR),
  );
  // LIMIT=30 — prompt va tekshiruvni arzon sinab ko'rish uchun (fayl yozilmaydi).
  const limit = Number(process.env.LIMIT ?? 0);
  const dryRun = limit > 0;
  if (dryRun) candidates = candidates.slice(0, limit);
  console.log(`lug'atda ${levelOf.size} so'z, infinitiv ko'rinishli nomzod ${candidates.length}`);

  /*
   * AI javoblari ixtiyoriy ravishda keshlanadi (VERB_CACHE=/yo'l/cache.json).
   * Tekshiruv qoidalari tuzatilganda butun lug'atni qaytadan so'ramaslik uchun —
   * qoida o'zgarsa ham AI javobi o'zgarmaydi.
   */
  const cachePath = process.env.VERB_CACHE;
  const verdicts: Record<string, Verdict> = {};
  if (cachePath && existsSync(cachePath)) {
    Object.assign(verdicts, JSON.parse(readFileSync(cachePath, 'utf8')) as Record<string, Verdict>);
    console.log(`keshdan ${Object.keys(verdicts).length} javob o'qildi`);
  }

  for (let i = 0; i < candidates.length; i += BATCH) {
    const chunk = candidates.slice(i, i + BATCH).filter((w) => !(w in verdicts));
    if (chunk.length === 0) continue;
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
  /*
   * AI ba'zan paketdagi so'zni javobga UMUMAN qo'shmaydi (uzun paketda oxirgi
   * elementlar tushib qoladi). Bunday so'z «fe'l emas» bo'lib jimgina yo'qolib
   * ketardi — «читать» aynan shunday yo'qolgan edi. Qolganlarini qayta so'raymiz.
   */
  for (let pass = 0; pass < 2; pass += 1) {
    const missing = candidates.filter((w) => !(w in verdicts));
    if (missing.length === 0) break;
    console.log(`javobsiz qolgan ${missing.length} so'z qayta so'ralmoqda`);
    for (let i = 0; i < missing.length; i += BATCH) {
      try {
        Object.assign(verdicts, await classify(missing.slice(i, i + BATCH)));
      } catch (err) {
        console.warn(`  qayta so'rash xatosi: ${(err as Error).message}`);
      }
    }
  }
  const stillMissing = candidates.filter((w) => !(w in verdicts));
  if (stillMissing.length > 0) {
    console.warn(`AI javob bermagan ${stillMissing.length} so'z: ${stillMissing.slice(0, 20).join(', ')}`);
  }

  if (cachePath) writeFileSync(cachePath, JSON.stringify(verdicts), 'utf8');

  const entries: VerbEntry[] = [];
  let notVerb = 0;
  let badForms = 0;
  let aspectFixed = 0;
  for (const inf of candidates) {
    const v = verdicts[inf];
    if (!v?.verb || !v.aspect || !v.uz) {
      notVerb += 1;
      continue;
    }
    const forms = validateForms(inf, v.forms);
    if (!forms) {
      badForms += 1;
      if (dryRun) console.log(`  [tashlandi] ${inf}: ${(v.forms ?? []).join(' / ')}`);
      continue;
    }
    // «-ивать/-ывать» — deyarli istisnosiz несовершенный vid; AI ba'zan
    // juftlikdagi сов. fe'l bilan chalkashtiradi, shuni to'g'rilaymiz.
    let aspect = v.aspect;
    if (/(ивать|ывать)(ся)?$/.test(inf) && aspect === 'p') {
      aspect = 'i';
      aspectFixed += 1;
    }
    entries.push({ inf, aspect, forms, uz: v.uz, level: levelOf.get(inf) ?? 'B2' });
  }

  // Qo'lda tekshirilgan разноспрягаемые fe'llar — lug'atda bo'lsa qo'shiladi.
  for (const [inf, hand] of Object.entries(IRREGULAR)) {
    const level = levelOf.get(inf);
    if (!level) continue;
    entries.push({ inf, aspect: hand.aspect, forms: hand.forms, uz: hand.uz, level });
  }

  entries.sort((a, b) => a.inf.localeCompare(b.inf, 'ru'));
  const byLevel = WORD_CHAIN_LEVELS.map(
    (lv) => `${lv}=${entries.filter((e) => e.level === lv).length}`,
  ).join(' ');
  console.log(
    `natija: ${entries.length} fe'l (${byLevel}); fe'l emas ${notVerb}, ` +
      `tuslanishi qoidaga tushmadi ${badForms}, vidi to'g'rilandi ${aspectFixed}`,
  );

  if (dryRun) {
    console.log('--- LIMIT rejimi: fayl yozilmadi, namuna ---');
    for (const e of entries.slice(0, 10)) {
      console.log(`  ${e.inf} (${e.aspect}, ${e.level}, ${e.uz}): ${e.forms.join(' / ')}`);
    }
    return;
  }

  const rows = entries
    .map((e) => {
      const forms = e.forms.map((f) => `'${f}'`).join(', ');
      return `  { inf: '${e.inf}', aspect: '${e.aspect}', uz: '${e.uz.replace(/'/g, "\\'")}', level: '${e.level}', forms: [${forms}] },`;
    })
    .join('\n');

  const file = `/**
 * russianVerbConjugation.ts — «Fe'l ustasi» o'yini uchun tuslangan fe'llar.
 *
 * AVTOMATIK YARATILGAN: scripts/oneoff/classifyVerbs.ts
 * Qo'lda tahrirlamang — skriptni qayta ishga tushiring.
 *
 * Har bir fe'l ikki marta tekshirilgan: (1) AI uni infinitivdagi fe'l deb
 * tasdiqlagan va tuslanishini bergan, (2) oltala shakl rus morfologiyasi
 * qoidalariga (shaxs oxirlari + yagona o'zak) mos kelgan. Mos kelmaganlari
 * olinmagan, shuning uchun bazada noto'g'ri shakl yo'q.
 */

/** Vid: 'i' — несовершенный (hozirgi zamon), 'p' — совершенный (kelasi zamon). */
export type VerbAspect = 'i' | 'p';

/** Tuslanish darajasi — «So'z zanjiri» lug'atidagi daraja bilan bir xil. */
export type VerbLevel = 'A1' | 'A2' | 'B1' | 'B2';

export type ConjugatedVerb = {
  /** Infinitiv — o'yinda savol sifatida ko'rsatiladi. */
  inf: string;
  aspect: VerbAspect;
  /** Uzbekcha ma'nosi — o'quvchi fe'lni tanimasa yordam beradi. */
  uz: string;
  level: VerbLevel;
  /** [я, ты, он/она, мы, вы, они] tartibida. */
  forms: [string, string, string, string, string, string];
};

/** Shaxs olmoshlari — \`forms\` massivi bilan bir xil tartibda. */
export const VERB_PRONOUNS: [string, string, string, string, string, string] = [
  'Я', 'Ты', 'Он / Она', 'Мы', 'Вы', 'Они',
];

export const VERB_LEVELS: VerbLevel[] = ['A1', 'A2', 'B1', 'B2'];

export const CONJUGATED_VERBS: ConjugatedVerb[] = [
${rows}
];

/** Tanlangan darajagacha bo'lgan BARCHA fe'llar (daraja kumulyativ). */
export function verbsUpToLevel(level: VerbLevel): ConjugatedVerb[] {
  const limit = VERB_LEVELS.indexOf(level);
  return CONJUGATED_VERBS.filter((v) => VERB_LEVELS.indexOf(v.level) <= limit);
}
`;

  writeFileSync('src/data/russianVerbConjugation.ts', file, 'utf8');
  console.log('yozildi: src/data/russianVerbConjugation.ts');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
