/**
 * Grammatika test savollariga IZOH yozadi (`daily_grammar_mcqs.explanation`).
 *
 * NIMA UCHUN: xato javob berilganda o'quvchiga faqat to'g'ri variant
 * ko'rsatilardi — "nega" degan savol javobsiz qolardi. Izoh bir-ikki gapda
 * qoidani aytadi, ya'ni xato o'rganishga aylanadi.
 *
 * MUHIM: model javobning TO'G'RILIGINI baholamaydi — to'g'ri variant unga
 * BERILADI va u faqat sababini yozadi. (Ilgari AI'ga javob kalitini
 * tekshirtirilganda 85% yolg'on ayblov chiqqan edi; bu yerda unga bunday
 * imkon berilmaydi.)
 *
 * Ishlatish (SERVERDA, loyiha ichida):
 *   npx tsx scripts/oneoff/generateMcqExplanations.ts            # hammasi
 *   npx tsx scripts/oneoff/generateMcqExplanations.ts --limit 20 # sinov
 *   npx tsx scripts/oneoff/generateMcqExplanations.ts --day-from 1 --day-to 10
 *
 * Qayta yuritilsa faqat izohi BO'SH savollarni oladi, ya'ni to'xtab qolgan
 * joydan davom etadi.
 */
import 'dotenv/config';
import { pool } from '../../server/lib/db.js';
import { isOpenAIConfigured, openaiJson } from '../../server/lib/openai.js';
import { geminiJson } from '../../server/lib/gemini.js';

type Qator = {
  id: number;
  day_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_index: number;
  mavzu: string | null;
};

const arg = (nom: string): string | null => {
  const i = process.argv.indexOf(nom);
  return i >= 0 ? (process.argv[i + 1] ?? null) : null;
};

const LIMIT = Number(arg('--limit') ?? 0);
/**
 * `--weak` — izohi BOR, lekin bo'sh bo'lgan savollarni qayta yozadi:
 * "To'g'ri variant X bo'lib…" degan javob shunchaki savolni takrorlaydi va
 * o'quvchiga qoidani o'rgatmaydi.
 */
const WEAK = process.argv.includes('--weak');
const DAY_FROM = Number(arg('--day-from') ?? 1);
const DAY_TO = Number(arg('--day-to') ?? 182);
/** Bir so'rovda nechta savol — model kontekstda adashmasligi uchun kichik. */
const BOLAK = 8;
/** Bir vaqtda nechta so'rov. Chegaraga urilmaslik uchun mo'tadil. */
const OQIM = 4;

const SYSTEM = [
  "Sen rus tilini o'rgatuvchi tajribali o'qituvchisan.",
  "Auditoriya — o'zbek tilida so'zlashuvchi boshlovchi va o'rta darajadagilar.",
  "Har bir test savoli uchun QISQA izoh yozasan: nega aynan shu variant to'g'ri.",
  "Qoidalar:",
  "1. Izoh O'ZBEK tilida, 1-2 gap, 200 belgidan oshmasin.",
  "2. Rus tilidagi so'z va shakllarni asl holida keltir (masalan: «книга», «читал»).",
  "3. To'g'ri variant SENGA BERILGAN — uni o'zgartirma, boshqa variantni to'g'ri deb aytma.",
  "4. Qoidani ayt (kelishik, tur, zamon, tuslanish), quruq 'shunday bo'ladi' dema.",
  "5. Salomlashish, kirish so'zlari va emoji ishlatma.",
  "Javobni faqat JSON obyekt ko'rinishida qaytarasan.",
].join('\n');

/** Qayta yozishda talab qattiqroq: javobni takrorlash mumkin emas. */
const SYSTEM_WEAK = [
  SYSTEM,
  "QO'SHIMCHA QAT'IY TALAB:",
  "- «To'g'ri variant …» yoki «To'g'ri javob …» deb BOSHLAMA va javobni shunchaki takrorlama.",
  "- Darhol QOIDANI ayt: qaysi kelishik/zamon/tur/shakl talab qilinadi va nega.",
  "- Iloji bo'lsa qaysi so'z shu shaklni talab qilayotganini ko'rsat.",
].join('\n');

function promptUchun(qatorlar: Qator[]): string {
  const ro = qatorlar.map((q, i) => {
    const variantlar = [q.option_a, q.option_b, q.option_c, q.option_d];
    return [
      `#${i + 1}`,
      `Mavzu: ${q.mavzu ?? '—'}`,
      `Savol: ${q.question_text}`,
      `Variantlar: A) ${variantlar[0]} | B) ${variantlar[1]} | C) ${variantlar[2]} | D) ${variantlar[3]}`,
      `TO'G'RI JAVOB: ${'ABCD'[q.correct_index]}) ${variantlar[q.correct_index]}`,
    ].join('\n');
  });
  return [
    'Quyidagi savollarga izoh yoz.',
    '',
    ro.join('\n\n'),
    '',
    'Javobni FAQAT shu JSON shaklida qaytar:',
    '{"izohlar": [{"n": 1, "izoh": "..."}, {"n": 2, "izoh": "..."}]}',
  ].join('\n');
}

/** Izoh yaroqlimi: uzunlik va boshqa variantni to'g'ri deb atamaganligi. */
function yaroqli(izoh: string, q: Qator): boolean {
  const t = izoh.trim();
  if (t.length < 15 || t.length > 400) return false;

  const variantlar = [q.option_a, q.option_b, q.option_c, q.option_d];
  const togri = variantlar[q.correct_index]?.trim().toLowerCase() ?? '';
  const past = t.toLowerCase();

  /*
   * Model ba'zan "to'g'ri javob — X" deb BOSHQA variantni yozib yuboradi.
   * Shunday jumla bor bo'lsa va undagi variant to'g'risi bo'lmasa — rad.
   */
  const m = past.match(/to[o‘'’]?g[o‘'’]?ri javob[^a-zа-я0-9]{0,4}([^.!?\n]{1,60})/i);
  if (m) {
    const aytilgan = m[1].trim();
    const boshqa = variantlar
      .map((v, i) => ({ v: v.trim().toLowerCase(), i }))
      .filter((o) => o.i !== q.correct_index && o.v.length > 2);
    const notogriKoosatilgan = boshqa.some((o) => aytilgan.includes(o.v));
    if (notogriKoosatilgan && !aytilgan.includes(togri)) return false;
  }
  return true;
}

async function jsonSora(user: string): Promise<{ izohlar?: Array<{ n?: number; izoh?: string }> }> {
  const params = { system: WEAK ? SYSTEM_WEAK : SYSTEM, user, temperature: 0.2, maxTokens: 1200 };
  if (isOpenAIConfigured()) return openaiJson(params);
  return geminiJson(params);
}

async function bolakniIshla(qatorlar: Qator[]): Promise<number> {
  let yozildi = 0;
  let javob: Awaited<ReturnType<typeof jsonSora>>;
  try {
    javob = await jsonSora(promptUchun(qatorlar));
  } catch (e) {
    console.error('  [xato] model javob bermadi:', (e as Error).message);
    return 0;
  }

  const izohlar = Array.isArray(javob?.izohlar) ? javob.izohlar : [];
  for (const it of izohlar) {
    const n = Number(it?.n);
    const q = qatorlar[n - 1];
    const izoh = String(it?.izoh ?? '').trim();
    if (!q || !izoh) continue;
    // Qayta yozishda yana tavtologiya kelsa — qabul qilmaymiz.
    if (WEAK && /to[o‘'’]?g[o‘'’]?ri (variant|javob)/i.test(izoh)) {
      console.warn(`  [rad-tavtologiya] id=${q.id}`);
      continue;
    }
    if (!yaroqli(izoh, q)) {
      console.warn(`  [rad] id=${q.id}: ${izoh.slice(0, 80)}`);
      continue;
    }
    await pool!.query('UPDATE daily_grammar_mcqs SET explanation = $1 WHERE id = $2', [izoh, q.id]);
    yozildi += 1;
  }
  return yozildi;
}

async function main() {
  if (!pool) throw new Error('DATABASE_URL yo‘q');
  console.log(`Provayder: ${isOpenAIConfigured() ? 'OpenAI' : 'Gemini'}`);

  const { rows } = await pool.query<Qator>(
    `SELECT m.id, m.day_number, m.question_text, m.option_a, m.option_b, m.option_c, m.option_d,
            m.correct_index, t.title AS mavzu
       FROM daily_grammar_mcqs m
       LEFT JOIN daily_grammar_topics t ON t.day_number = m.day_number
      WHERE ${WEAK
        ? "(m.explanation ILIKE '%to''g''ri variant%' OR m.explanation ILIKE '%to''g''ri javob%' OR length(m.explanation) < 60)"
        : "btrim(m.explanation) = ''"}
        AND m.day_number BETWEEN $1 AND $2
      ORDER BY m.day_number, m.sort_order, m.id
      ${LIMIT > 0 ? 'LIMIT ' + LIMIT : ''}`,
    [DAY_FROM, DAY_TO],
  );

  console.log(`${WEAK ? 'Qayta yoziladigan (zaif) izohlar' : 'Izohsiz savollar'}: ${rows.length}`);
  if (rows.length === 0) return;

  const bolaklar: Qator[][] = [];
  for (let i = 0; i < rows.length; i += BOLAK) bolaklar.push(rows.slice(i, i + BOLAK));

  let jami = 0;
  for (let i = 0; i < bolaklar.length; i += OQIM) {
    const guruh = bolaklar.slice(i, i + OQIM);
    const natijalar = await Promise.all(guruh.map((b) => bolakniIshla(b)));
    jami += natijalar.reduce((a, b) => a + b, 0);
    const bajarildi = Math.min((i + OQIM) * BOLAK, rows.length);
    console.log(`${bajarildi}/${rows.length} · yozildi: ${jami}`);
  }

  console.log(`TAYYOR: ${jami} ta izoh yozildi.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
