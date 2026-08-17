/**
 * verbZamonlar.ts — «Fe'l ustasi» o'yinini ZAMONLAR bo'yicha qayta quradi.
 *
 * Kirish:  src/data/russianVerbConjugation.ts (1111 fe'l, hozirgi/kelasi shakllari)
 * Chiqish: src/data/russianVerbTenses.ts
 *
 * NIMA UCHUN KERAK: o'yin ilgari fe'llarni A1–B2 darajasiga ajratardi. Rus
 * tilini o'rganayotgan odam uchun esa fe'lning eng qiyin joyi daraja emas,
 * ZAMON: hozirgi, o'tgan va kelasi zamon uch xil yasaladi. Endi o'yin shu uch
 * guruhdan iborat va har bir fe'l o'z zamoniga ANIQ joylashtiriladi.
 *
 * ---------------------------------------------------------------------------
 * ZAMONLAR QANDAY ANIQLANADI (va nega ba'zi fe'l guruhga tushmaydi)
 *
 * 1. O'TGAN ZAMON — hamma fe'lda bor va infinitivdan yasaladi:
 *      читать -> читал / читала / читало / читали.
 *    1086 fe'l shu oddiy qoidaga tushadi. Qolgan 25 tasi (-ти, -чь, -сть,
 *    -ереть va «-ну-» ni tushiradigan -нуть) qoidaga bo'ysunmaydi — ular
 *    QO'LDA yozilgan jadvaldan olinadi (pastda). Jadvalda yo'q istisno fe'l
 *    o'yinga UMUMAN qo'shilmaydi: noto'g'ri shakl o'rgatgandan ko'ra fe'l
 *    kamrog'i yaxshi.
 *
 * 2. HOZIRGI ZAMON faqat NESOVERSHENNIY (tugallanmagan) fe'lda bo'ladi.
 *    «Написать» ning hozirgi zamoni YO'Q — «напишу» bu kelasi zamon. Shuning
 *    uchun vid (aspekt) to'g'ri bo'lishi shart.
 *
 * 3. KELASI ZAMON ikki xil:
 *      tugallangan (sov.):    напишу, напишешь …      — bazadagi shakllar;
 *      tugallanmagan (nesov.): буду писать, будешь писать … — qo'shma shakl.
 *
 * VID QANDAY TEKSHIRILADI: bazadagi `aspect` maydoniga ishonib bo'lmaydi —
 * unda xatolar topildi («ценить», «чертить» tugallangan deb belgilangan).
 * Shuning uchun vid AI'dan IKKI MARTA, ikki xil savol bilan so'raladi va
 * faqat IKKALA javob bir xil bo'lgandagina qabul qilinadi. Bunga qo'shimcha
 * qat'iy morfologik qoida bor: -ывать/-ивать/-авать bilan tugagan fe'l har
 * doim tugallanmagan (bu qo'shimchaning o'zi shuning uchun turadi) — bu
 * yerda AI'ning fikri inobatga olinmaydi.
 *
 * HOZIRGI SHAKLLAR HAM QAYTA TEKSHIRILADI. Eski skript har shaklning oxirini
 * alohida tekshirardi, lekin TUSLANISH SINFI bir xilligini tekshirmasdi.
 * Shu tufayli bazaga «чертю, чертёшь, чертит …» tushib qolgan: «-ёшь» I
 * tuslanish, «-ит» esa II tuslanish, ya'ni bitta fe'lda ikkalasi bo'lishi
 * mumkin emas (to'g'risi: черчу, чертишь). Endi shunday fe'l hozirgi/kelasi
 * guruhiga qo'shilmaydi.
 *
 * Ishga tushirish (AI kaliti bor joyda, masalan serverda):
 *   VERB_ZAMON_CACHE=/tmp/zamon.json npx tsx scripts/oneoff/verbZamonlar.ts
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import 'dotenv/config';
import { CONJUGATED_VERBS, type ConjugatedVerb } from '../../src/data/russianVerbConjugation';
import { openaiJson } from '../../server/lib/openai';

type Aspekt = 'i' | 'p';
type Otgan = [string, string, string, string];

/* ------------------------------------------------------------------ *
 * 1. O'TGAN ZAMON
 * ------------------------------------------------------------------ */

/**
 * Qoidaga bo'ysunmaydigan fe'llar — QO'LDA yozilgan va har biri alohida
 * tekshirilgan. Tartib: [erkak, ayol, o'rta, ko'plik].
 *
 * Bu ro'yxat bazadagi 1111 fe'lning hammasini qamrab oladi: skript ishga
 * tushganda qoidaga ham, jadvalga ham tushmagan fe'l qolsa, ogohlantirish
 * chiqaradi va o'sha fe'l o'yindan chetlatiladi.
 */
const OTGAN_ISTISNO: Record<string, Otgan> = {
  // -ти
  вести: ['вёл', 'вела', 'вело', 'вели'],
  идти: ['шёл', 'шла', 'шло', 'шли'],
  найтись: ['нашёлся', 'нашлась', 'нашлось', 'нашлись'],
  нести: ['нёс', 'несла', 'несло', 'несли'],
  перевести: ['перевёл', 'перевела', 'перевело', 'перевели'],
  повести: ['повёл', 'повела', 'повело', 'повели'],
  пойти: ['пошёл', 'пошла', 'пошло', 'пошли'],
  ползти: ['полз', 'ползла', 'ползло', 'ползли'],
  привести: ['привёл', 'привела', 'привело', 'привели'],
  расти: ['рос', 'росла', 'росло', 'росли'],
  спасти: ['спас', 'спасла', 'спасло', 'спасли'],
  трясти: ['тряс', 'трясла', 'трясло', 'трясли'],
  увезти: ['увёз', 'увезла', 'увезло', 'увезли'],
  увести: ['увёл', 'увела', 'увело', 'увели'],
  цвести: ['цвёл', 'цвела', 'цвело', 'цвели'],
  // -чь
  мочь: ['мог', 'могла', 'могло', 'могли'],
  // -сть
  есть: ['ел', 'ела', 'ело', 'ели'],
  // -ереть
  тереть: ['тёр', 'тёрла', 'тёрло', 'тёрли'],
  // -нуть: erkak shaklida «-ну-» tushadi
  гибнуть: ['гиб', 'гибла', 'гибло', 'гибли'],
  мерзнуть: ['мёрз', 'мёрзла', 'мёрзло', 'мёрзли'],
  охрипнуть: ['охрип', 'охрипла', 'охрипло', 'охрипли'],
};

/** «-ся/-сь» qaytim qo'shimchasi: erkak shaklida «-ся», qolganlarida «-сь». */
function qaytimQosh(shakllar: Otgan): Otgan {
  return [
    `${shakllar[0]}ся`,
    `${shakllar[1]}сь`,
    `${shakllar[2]}сь`,
    `${shakllar[3]}сь`,
  ];
}

function otganZamon(inf: string): Otgan | null {
  const jadval = OTGAN_ISTISNO[inf];
  if (jadval) return jadval;

  const qaytim = /(ся|сь)$/.test(inf);
  const asos = inf.replace(/(ся|сь)$/, '');

  // Jadvalsiz istisno sinflari — taxmin qilmaymiz.
  if (/(ти|чь|сть|зть|ереть)$/.test(asos)) return null;
  const istisnoNut = /нуть$/.test(asos) && OTGAN_ISTISNO[asos];
  if (istisnoNut) return qaytim ? qaytimQosh(istisnoNut) : istisnoNut;

  const m = asos.match(/^(.*[аяеиыоуё])ть$/);
  if (!m) return null;
  const ozak = m[1];
  const shakllar: Otgan = [`${ozak}л`, `${ozak}ла`, `${ozak}ло`, `${ozak}ли`];
  return qaytim ? qaytimQosh(shakllar) : shakllar;
}

/* ------------------------------------------------------------------ *
 * 2. HOZIRGI SHAKLLARNI QAYTA TEKSHIRISH
 * ------------------------------------------------------------------ */

/** I tuslanish oxirlari (ты, он, мы, вы, они). */
const I_TUSLANISH = [/(ешь|ёшь)$/, /(ет|ёт)$/, /(ем|ём)$/, /(ете|ёте)$/, /(ут|ют)$/];
/** II tuslanish oxirlari. */
const II_TUSLANISH = [/ишь$/, /ит$/, /им$/, /ите$/, /(ат|ят)$/];

/**
 * Oltala shakl bitta tuslanish sinfiga tegishlimi va bitta o'zakdanmi.
 *
 * Aralash sinf — xatoning eng aniq belgisi: «чертёшь» (I) va «чертит» (II)
 * bitta fe'lda bo'la olmaydi.
 */
function hozirTogrimi(forms: string[]): boolean {
  if (forms.length !== 6) return false;
  const toza = forms.map((f) => f.replace(/(ся|сь)$/, ''));
  if (!/[юу]$/.test(toza[0])) return false;

  const iMos = I_TUSLANISH.every((re, i) => re.test(toza[i + 1]));
  const iiMos = II_TUSLANISH.every((re, i) => re.test(toza[i + 1]));
  if (!iMos && !iiMos) return false;

  // Umumiy o'zak: kamida ikki harf (я -> пишу, ты -> пишешь).
  let umumiy = toza[0];
  for (const f of toza.slice(1)) {
    let i = 0;
    while (i < umumiy.length && i < f.length && umumiy[i] === f[i]) i += 1;
    umumiy = umumiy.slice(0, i);
  }
  return umumiy.length >= 2;
}

/* ------------------------------------------------------------------ *
 * 3. VID (ASPEKT)
 * ------------------------------------------------------------------ */

/** Morfologiya kafolati: bu qo'shimchalar faqat tugallanmagan fe'lda bo'ladi. */
function qoidaBoyichaNesov(inf: string): boolean {
  const asos = inf.replace(/(ся|сь)$/, '');
  return /(ывать|ивать|авать)$/.test(asos);
}

type AiJavob = Record<string, Aspekt | undefined>;

/**
 * SHAKLLARNI MUSTAQIL QAYTA YARATISH.
 *
 * Bazadagi oltala shakl bir marta AI tomonidan yozilgan. Morfologik tekshiruv
 * «ichdan mos» xatoni tuta olmaydi: «тереть -> теру, терешь …» qoidaga to'g'ri
 * ko'rinadi, lekin haqiqiy shakl «тру, трёшь». Shuning uchun shakllar IKKINCHI
 * MARTA, noldan yaratiladi va saqlangani bilan solishtiriladi. Farq chiqsa
 * fe'l hozirgi (yoki oddiy kelasi) zamon guruhiga QO'SHILMAYDI — tuzatishga
 * urinmaymiz, chunki qaysi biri to'g'riligini bu yerda isbotlab bo'lmaydi.
 */
async function aiShakllar(sozlar: string[]): Promise<Record<string, string[]>> {
  const res = await openaiJson<{ items: Array<{ w: string; f?: string[] }> }>({
    system:
      'Ты — эксперт по русской морфологии. Для каждого глагола дай 6 форм ' +
      'настоящего времени (для несовершенного вида) или простого будущего ' +
      '(для совершенного вида) СТРОГО в порядке: я, ты, он, мы, вы, они. ' +
      'Учитывай чередования согласных (писать -> пишу, чертить -> черчу, ' +
      'тереть -> тру). Пиши букву ё там, где она есть. ' +
      'Ответ строго JSON: {"items":[{"w":"писать","f":["пишу","пишешь","пишет","пишем","пишете","пишут"]}]}. ' +
      'Без пояснений.',
    user: JSON.stringify(sozlar),
    temperature: 0,
    maxTokens: 4000,
  });
  const out: Record<string, string[]> = {};
  for (const it of res.items ?? []) {
    if (Array.isArray(it.f) && it.f.length === 6) {
      out[String(it.w).toLowerCase()] = it.f.map((x) => String(x).toLowerCase().trim());
    }
  }
  return out;
}

/** Solishtirishda «ё/е» farqi va urg'u belgisi hisobga olinmaydi. */
const tekis = (s: string) => s.toLowerCase().replace(/ё/g, 'е').replace(/\u0301/g, '').trim();

async function aiVid(sozlar: string[], uslub: 1 | 2): Promise<AiJavob> {
  const system =
    uslub === 1
      ? 'Ты — эксперт по русской грамматике. Для каждого глагола определи ВИД: ' +
        '"i" — несовершенный (отвечает на вопрос «что делать?», имеет настоящее время: я читаю), ' +
        '"p" — совершенный (отвечает на вопрос «что сделать?», настоящего времени НЕТ, ' +
        'форма «я напишу» — это будущее). Двувидовые глаголы (использовать, организовать) — "i". ' +
        'Ответ строго JSON: {"items":[{"w":"писать","a":"i"}]}. Без пояснений.'
      : 'Ты — преподаватель РКИ. Для каждого глагола ответь: есть ли у него форма НАСТОЯЩЕГО времени. ' +
        'Если «я + форма» означает действие СЕЙЧАС (я пишу — сейчас) — это "i". ' +
        'Если «я + форма» означает только БУДУЩЕЕ (я напишу — завтра) — это "p". ' +
        'Ответ строго JSON: {"items":[{"w":"писать","a":"i"}]}. Без пояснений.';

  const res = await openaiJson<{ items: Array<{ w: string; a?: string }> }>({
    system,
    user: JSON.stringify(sozlar),
    temperature: 0,
    maxTokens: 3000,
  });

  const out: AiJavob = {};
  for (const it of res.items ?? []) {
    const a = String(it.a ?? '').toLowerCase();
    out[String(it.w).toLowerCase()] = a === 'i' || a === 'p' ? (a as Aspekt) : undefined;
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * 4. YIG'ISH
 * ------------------------------------------------------------------ */

const BATCH = 40;
const KELASI_YORDAMCHI = ['буду', 'будешь', 'будет', 'будем', 'будете', 'будут'];

async function main(): Promise<void> {
  const kesh = process.env.VERB_ZAMON_CACHE;
  const saqlangan: Record<string, { a1?: Aspekt; a2?: Aspekt; f?: string[] }> =
    kesh && existsSync(kesh) ? JSON.parse(readFileSync(kesh, 'utf8')) : {};

  const kerak = CONJUGATED_VERBS.filter((v) => !saqlangan[v.inf]?.a1 || !saqlangan[v.inf]?.a2);
  console.log(`Vid so'raladigan fe'llar: ${kerak.length} / ${CONJUGATED_VERBS.length}`);

  for (let i = 0; i < kerak.length; i += BATCH) {
    const bolak = kerak.slice(i, i + BATCH).map((v) => v.inf);
    try {
      const [j1, j2] = await Promise.all([aiVid(bolak, 1), aiVid(bolak, 2)]);
      for (const w of bolak) {
        saqlangan[w] = { a1: j1[w], a2: j2[w] };
      }
    } catch (err) {
      console.error(`  ${i}-bo'lak xato:`, (err as Error).message);
    }
    if (kesh) writeFileSync(kesh, JSON.stringify(saqlangan), 'utf8');
    console.log(`  ${Math.min(i + BATCH, kerak.length)} / ${kerak.length}`);
  }

  const shaklKerak = CONJUGATED_VERBS.filter((v) => !saqlangan[v.inf]?.f);
  console.log(`Shakllari qayta yaratiladigan fe'llar: ${shaklKerak.length}`);
  for (let i = 0; i < shaklKerak.length; i += 25) {
    const bolak = shaklKerak.slice(i, i + 25).map((v) => v.inf);
    try {
      const javob = await aiShakllar(bolak);
      for (const w of bolak) saqlangan[w] = { ...(saqlangan[w] ?? {}), f: javob[w] ?? [] };
    } catch (err) {
      console.error(`  shakl ${i}-bo'lak xato:`, (err as Error).message);
    }
    if (kesh) writeFileSync(kesh, JSON.stringify(saqlangan), 'utf8');
    if (i % 200 === 0) console.log(`  shakl ${i} / ${shaklKerak.length}`);
  }

  const satrlar: string[] = [];
  const hisob = { hozir: 0, otgan: 0, kelasi: 0, vidYoq: 0, otganYoq: 0, hozirXato: 0, shaklFarq: 0 };

  for (const v of CONJUGATED_VERBS as ConjugatedVerb[]) {
    const otgan = otganZamon(v.inf);
    if (!otgan) {
      hisob.otganYoq += 1;
      console.warn(`  o'tgan zamon yasalmadi, tashlandi: ${v.inf}`);
      continue;
    }

    const javob = saqlangan[v.inf] ?? {};
    let vid: Aspekt | null =
      javob.a1 && javob.a1 === javob.a2 ? javob.a1 : null;
    if (qoidaBoyichaNesov(v.inf)) vid = 'i';
    if (!vid) hisob.vidYoq += 1;

    const qayta = saqlangan[v.inf]?.f ?? [];
    const shaklMos =
      qayta.length === 6 && qayta.every((f, i) => tekis(f) === tekis(v.forms[i]));
    if (qayta.length === 6 && !shaklMos) hisob.shaklFarq += 1;

    // «-ереть» ning hozirgi o'zagi butunlay boshqacha (тереть -> тру): bu
    // sinfda saqlangan shakllarga ishonmaymiz.
    const xavfliSinf = /ереть$/.test(v.inf.replace(/(ся|сь)$/, ''));

    const hozirIshonchli = hozirTogrimi(v.forms) && shaklMos && !xavfliSinf;
    if (!hozirIshonchli) hisob.hozirXato += 1;

    const hozir = vid === 'i' && hozirIshonchli ? v.forms : null;
    const kelasi =
      vid === 'p'
        ? hozirIshonchli
          ? { tur: 'oddiy' as const, shakllar: v.forms }
          : null
        : vid === 'i'
          ? { tur: 'murakkab' as const, shakllar: KELASI_YORDAMCHI.map((y) => `${y} ${v.inf}`) }
          : null;

    if (hozir) hisob.hozir += 1;
    if (kelasi) hisob.kelasi += 1;
    hisob.otgan += 1;

    const j = (s: string) => JSON.stringify(s);
    satrlar.push(
      `  { inf: ${j(v.inf)}, uz: ${j(v.uz)}, daraja: ${j(v.level)}, vid: ${vid ? j(vid) : 'null'}, ` +
        `hozir: ${hozir ? `[${hozir.map(j).join(', ')}]` : 'null'}, ` +
        `otgan: [${otgan.map(j).join(', ')}], ` +
        `kelasi: ${kelasi ? `{ tur: ${j(kelasi.tur)}, shakllar: [${kelasi.shakllar.map(j).join(', ')}] }` : 'null'} },`,
    );
  }

  const chiqish = `/**
 * russianVerbTenses.ts — «Fe'l ustasi» o'yini uchun fe'llar ZAMONLAR bo'yicha.
 *
 * AVTOMATIK YARATILGAN: scripts/oneoff/verbZamonlar.ts — qo'lda tahrirlamang.
 *
 * \`hozir\`  — hozirgi zamon (faqat tugallanmagan fe'lda; aks holda null);
 * \`otgan\`  — [erkak, ayol, o'rta, ko'plik];
 * \`kelasi\` — tugallanganda oddiy («напишу»), tugallanmaganda qo'shma
 *             («буду писать»). Vid aniqlanmagan fe'lda null.
 *
 * Vid AI'dan ikki xil savol bilan so'ralgan va faqat ikkala javob mos
 * kelganda qabul qilingan; -ывать/-ивать/-авать esa qoida bilan belgilangan.
 * Hozirgi shakllar tuslanish sinfi bir xilligiga qayta tekshirilgan.
 */

export type VerbVid = 'i' | 'p';

export type VerbZamonlari = {
  inf: string;
  uz: string;
  /**
   * Qiyinlik darajasi — eski bazadan olingan. Ekranda KO'RSATILMAYDI; o'yin
   * raundning boshida osonroq fe'llarni tanlash uchun ishlatadi, keyin esa
   * hammasidan oladi.
   */
  daraja: 'A1' | 'A2' | 'B1' | 'B2';
  /** Vid aniqlanmagan bo'lsa null — bunday fe'l faqat o'tgan zamonda qatnashadi. */
  vid: VerbVid | null;
  /** [я, ты, он, мы, вы, они] — yoki null (tugallangan fe'lda hozirgi zamon yo'q). */
  hozir: [string, string, string, string, string, string] | null;
  /** [он, она, оно, они] */
  otgan: [string, string, string, string];
  kelasi: { tur: 'oddiy' | 'murakkab'; shakllar: string[] } | null;
};

export const VERB_ZAMONLARI: VerbZamonlari[] = [
${satrlar.join('\n')}
];
`;

  writeFileSync('src/data/russianVerbTenses.ts', chiqish, 'utf8');
  console.log('\nNatija:', JSON.stringify(hisob, null, 2));
}

void main();
