/**
 * ustozReading.service.ts — "Ustozdan so'ra": o'quvchi ovoz bilan o'qigan rus
 * gapini baholaydi va o'sha gapning grammatikasini tushuntiradi.
 *
 * OQIM: audio -> Whisper transkripsiya -> etalon bilan solishtirish (LLM) ->
 * {aniqlik, daraja, xatolar, qoida tushuntirishi}.
 *
 * NEGA BU ISHONCHLI (eski AI ustoz moduli aynan shu yerda yiqilgandi):
 * tushuntirish AYNAN o'qilgan gap bilan chegaralangan — modelga etalon gap va
 * uning tarjimasi beriladi, "182 kunlik kursning N-kun qoidasini tushuntir"
 * deyilmaydi. Bazada nazariya matni deyarli yo'q (kuniga ~208 belgi), shuning
 * uchun keng savol berilsa model o'zidan to'qishga majbur bo'lardi. Bitta gap
 * esa modelning o'z rus tili bilimi bilan to'liq qoplanadi.
 *
 * PROVAYDER: mavjud `server/lib/openai.ts` (OPENAI_API_KEY bo'lmasa Gemini
 * zaxirasi). Hech qanday yangi bog'liqlik yo'q.
 */
import {
  isOpenAIConfigured,
  openaiJson,
  transcribeAudio,
  normalizeRuAnswer,
} from '../lib/openai.js';
import { geminiJson } from '../lib/gemini.js';

export type ReadingIssue = {
  /** Xato qilingan so'z (etalondagi shakli). */
  soz: string;
  /** Nima bo'ldi: tushib qoldi, boshqa so'z o'qildi, shakli noto'g'ri... */
  muammo: string;
  /** To'g'ri variant. */
  tuzatish: string;
};

export type ReadingRule = {
  sarlavha: string;
  tushuntirish: string;
  misollar: { ru: string; uz: string }[];
};

export type ReadingFeedback = {
  transcript: string;
  /** 0-100. */
  aniqlik: number;
  daraja: 'zor' | 'yaxshi' | 'qoniqarli' | 'yomon';
  izoh: string;
  xatolar: ReadingIssue[];
  qoida: ReadingRule | null;
};

/**
 * So'zning TALAFFUZ kaliti.
 *
 * NEGA KERAK: Whisper eshitganini yozadi, rus tilida esa yozilish va aytilish
 * bir xil emas. "Фарход" oxiridagi "д" [t] bo'lib aytiladi va transkripsiyada
 * "Фархот" bo'lib chiqadi — o'quvchi to'g'ri o'qigan bo'lsa ham. Ilgari bu
 * xato deb hisoblanardi. Shuning uchun solishtirish HARF bo'yicha emas,
 * talaffuz bo'yicha qilinadi.
 *
 * Qamrab olinadigan qonuniyatlar (rus fonetikasining asosiylari):
 *  - so'z oxirida va jarangsiz undosh oldida jaranglilar jarangsizlanadi;
 *  - "ё" va "е" farqi yozuvda ko'pincha ko'rsatilmaydi;
 *  - "ъ" tovush bermaydi (faqat ajratuvchi belgi);
 *  - "-ого/-его" oxiri "-ова/-ева" deb aytiladi;
 *  - "-ться" va "-тся" bir xil eshitiladi.
 *
 * Ataylab QAMRALMAGAN:
 *  - urg'usiz "о/а" reduksiyasi umuman: uni qo'shsak "стол" va "стал" bir xil
 *    bo'lib qolardi — bular boshqa so'zlar va farqi muhim. Faqat "-ого"
 *    qo'shimchasining oxiri istisno, chunki u har doim urg'usiz;
 *  - "ь" olib tashlanmaydi: u ma'no farqlaydi ("брат" va "брать" boshqa
 *    so'zlar). Uni tashlasak xato o'qish to'g'ri deb hisoblanardi.
 */
const JARANGSIZ: Record<string, string> = {
  б: 'п', в: 'ф', г: 'к', д: 'т', ж: 'ш', з: 'с',
};

export function ruFonetik(soz: string): string {
  let s = soz.toLowerCase().replace(/ё/g, 'е');
  // "-ого/-его" -> "-ова/-ева": qo'shimcha urg'usiz, oxirgi unli "а" bo'lib
  // eshitiladi. Whisper ikkala shaklni ham yozishi mumkin, shuning uchun
  // ikkovi bitta ko'rinishga keltiriladi.
  s = s.replace(/(ог|ег)о$/, (_m, o: string) => (o === 'ог' ? 'ова' : 'ева'));
  s = s.replace(/(ов|ев)о$/, '$1а');
  s = s.replace(/ться$/, 'тся');
  s = s.replace(/ъ/g, '');
  // So'z oxiri: жаранглиlar jarangsizlanadi.
  s = s.replace(/[бвгджз]$/, (m) => JARANGSIZ[m] ?? m);
  // Jarangsiz undosh oldida ham shunday.
  s = s.replace(/[бвгджз](?=[пфктшсхцчщ])/g, (m) => JARANGSIZ[m] ?? m);
  return s;
}

const sozlarga = (s: string) => normalizeRuAnswer(s).split(/\s+/).filter(Boolean);

export type SozAmal =
  | { tur: 'mos'; etalon: string }
  | { tur: 'almashgan'; etalon: string; oqilgan: string }
  | { tur: 'tushgan'; etalon: string }
  | { tur: 'ortiqcha'; oqilgan: string };

/**
 * Etalon va transkripsiyani so'z darajasida tekislaydi (Levenshtein).
 *
 * NEGA KODDA VA NEGA BALL HAM SHU YERDA: modelga baho qo'ydirilganda u bir xil
 * o'qishga har safar boshqa raqam berardi va to'g'ri o'qilgan gapni ham "xato"
 * deb belgilardi. Tekislash deterministik: bir xil kirishga har doim bir xil
 * natija. Model faqat grammatikani tushuntiradi, hukm chiqarmaydi.
 */
export function tekisla(reference: string, transcript: string): {
  amallar: SozAmal[];
  aniqlik: number;
} {
  const a = sozlarga(reference);
  const b = sozlarga(transcript);
  const fa = a.map(ruFonetik);
  const fb = b.map(ruFonetik);

  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i += 1) dp[i][0] = i;
  for (let j = 0; j <= m; j += 1) dp[0][j] = j;
  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      const narx = fa[i - 1] === fb[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j - 1] + narx, dp[i - 1][j] + 1, dp[i][j - 1] + 1);
    }
  }

  const amallar: SozAmal[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const narx = fa[i - 1] === fb[j - 1] ? 0 : 1;
      if (dp[i][j] === dp[i - 1][j - 1] + narx) {
        amallar.push(narx === 0
          ? { tur: 'mos', etalon: a[i - 1] }
          : { tur: 'almashgan', etalon: a[i - 1], oqilgan: b[j - 1] });
        i -= 1; j -= 1;
        continue;
      }
    }
    if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      amallar.push({ tur: 'tushgan', etalon: a[i - 1] });
      i -= 1;
      continue;
    }
    amallar.push({ tur: 'ortiqcha', oqilgan: b[j - 1] });
    j -= 1;
  }
  amallar.reverse();

  const xato = amallar.filter((x) => x.tur !== 'mos').length;
  const aniqlik = n === 0 ? 0 : Math.max(0, Math.min(100, Math.round((1 - xato / n) * 100)));
  return { amallar, aniqlik };
}

/**
 * Shu balldan pastda natija ishonchsiz deb hisoblanadi.
 *
 * O'lchov asosida tanlangan: ataylab xato o'qilgan gaplar 67-75% oldi, nutq
 * tanish nosozliklari esa 0-50%. 60 — ikkovining orasidagi chegara.
 */
const PAST_CHEGARA = 60;

/** Asosiy model adashganda sinaladigan ikkinchi model. */
const ZAXIRA_MODEL = process.env.OPENAI_TRANSCRIBE_FALLBACK || 'gpt-4o-transcribe';

/** Whisper fayl nomini MIME'dan chiqaradi — format noto'g'ri bo'lsa u xato beradi. */
function mimeToFilename(mimeType: string): string {
  const m = (mimeType || '').toLowerCase();
  if (m.includes('mp4') || m.includes('m4a')) return 'recording.mp4';
  if (m.includes('mpeg') || m.includes('mp3')) return 'recording.mp3';
  if (m.includes('wav')) return 'recording.wav';
  return 'recording.webm';
}

/**
 * OHANG: talabchan, lekin qo'llab-quvvatlovchi. Xato aniq va to'g'ridan-to'g'ri
 * aytiladi, lekin o'quvchi kamsitilmaydi — auditoriya boshlang'ich darajadagi
 * o'zbekzabon o'quvchilar, qo'rqitish ularni mashqdan uzoqlashtiradi.
 */
const SYSTEM = `Sen — FalaRus.uz platformasining rus tili ustozisan. O'zbekzabon
o'quvchi rus tilidagi ETALON gapni ovoz chiqarib o'qidi. Uning o'qigani Whisper
bilan TRANSKRIPSIYA qilindi va senga matn ko'rinishida berilyapti.

VAZIFANG — ikki qism:

1) QISQA IZOH
   O'qish aniqligi va xatolar ro'yxati SENGA TAYYOR berilyapti — ular kodda,
   talaffuz qoidalari hisobga olingan holda hisoblangan va ishonchli.
   Sen ularni QAYTA BAHOLAMAYSAN, o'zgartirmaysan va yangi xato qo'shmaysan.
   Faqat 1-2 jumlalik umumiy izoh yozasan. Xato yo'q bo'lsa — maqta.

2) GRAMMATIKANI TUSHUNTIRISH
   AYNAN SHU ETALON GAPDAGI asosiy grammatik hodisani tushuntir: nega bu so'z
   shu shaklda turibdi (kelishik, fe'l turi/zamoni, predlog, rod, son).
   - QAYSI QOIDANI TANLASH: agar o'quvchi xato qilgan bo'lsa, qoida AYNAN
     O'SHA XATOGA tegishli bo'lsin. Masalan u "в магазине" deb o'qib, etalonda
     "в магазин" bo'lsa — yo'nalish (qayerga?) va joy (qayerda?) farqini
     tushuntir, fe'l zamonini emas. Xato bo'lmasa — gapdagi eng muhim
     grammatik hodisani tanla.
   - Bitta asosiy qoidani tanla, hammasini sanab chiqma.
   - 2-3 ta O'XSHASH misol ber (rus gapi + o'zbekcha tarjimasi).
   - Misollar kundalik hayotdan, sodda bo'lsin.
   - Grammatik atamalarni kamroq ishlat: "tushum kelishigi" o'rniga imkon
     bo'lsa "so'z oxiri qanday o'zgarishi" deb tushuntir.
   - FAQAT shu gap haqida gapir. Kursning boshqa mavzulariga o'tma va
     bilmagan narsangni o'ylab topma.

OHANG
Talabchan, lekin qo'llab-quvvatlovchi. Xatoni aniq va to'g'ridan-to'g'ri ayt,
yumshatib o'tirma — lekin o'quvchini kamsitma, baqirma, BOSH HARFLAR bilan
dakki berma. Har doim to'g'ri variantni ko'rsat. Yaxshi o'qigan bo'lsa tan ol.

TIL
Barcha izoh va tushuntirish — o'zbek tilida (lotin yozuvi).
Rus tilidagi so'z va misollar — kirill yozuvida.

FAQAT JSON qaytar, boshqa hech narsa:
{"izoh": "1-2 jumla, o'qish bo'yicha umumiy izoh",
 "qoida": {"sarlavha": "...", "tushuntirish": "40-90 so'z",
           "misollar": [{"ru": "...", "uz": "..."}]}}`;

/** Ovoz eshitilmagan holat — AI chaqirilmaydi, darhol javob. */
function emptyAudioFeedback(): ReadingFeedback {
  return {
    transcript: '',
    aniqlik: 0,
    daraja: 'yomon',
    izoh: "Ovoz eshitilmadi. Mikrofonga yaqinroq va balandroq o'qing.",
    xatolar: [],
    qoida: null,
  };
}

/**
 * Daraja BALLDAN hisoblanadi, modelning o'z yorlig'idan emas: sinovda u bir xil
 * 50 ballga bir joyda "yomon", boshqa joyda "qoniqarli" dedi. O'quvchi bir xil
 * natijaga har safar boshqa baho ko'rsa, bahoga ishonchi yo'qoladi.
 */
function toDaraja(aniqlik: number): ReadingFeedback['daraja'] {
  if (aniqlik >= 90) return 'zor';
  if (aniqlik >= 75) return 'yaxshi';
  if (aniqlik >= 50) return 'qoniqarli';
  return 'yomon';
}

function toRule(v: unknown): ReadingRule | null {
  const r = (v ?? null) as Record<string, unknown> | null;
  if (!r) return null;
  const tushuntirish = String(r.tushuntirish ?? '').trim();
  if (!tushuntirish) return null;
  const misollar = Array.isArray(r.misollar)
    ? r.misollar
        .slice(0, 4)
        .map((m) => {
          const o = (m ?? {}) as Record<string, unknown>;
          return { ru: String(o.ru ?? '').trim(), uz: String(o.uz ?? '').trim() };
        })
        .filter((m) => m.ru)
    : [];
  return { sarlavha: String(r.sarlavha ?? '').trim(), tushuntirish, misollar };
}

export type EvaluateReadingParams = {
  /** O'quvchi o'qishi kerak bo'lgan rus gapi. */
  referenceText: string;
  /** Gapning o'zbekcha tarjimasi (bo'lsa — tushuntirish aniqroq chiqadi). */
  referenceUz?: string;
  audioBase64: string;
  mimeType: string;
};

/**
 * Ovozli o'qishni baholaydi. AI ishlamasa ham foydali javob qaytaradi —
 * o'quvchi mashqdan uzilib qolmasligi kerak.
 */
export async function evaluateReading(p: EvaluateReadingParams): Promise<ReadingFeedback> {
  const buffer = Buffer.from(p.audioBase64, 'base64');
  // Yo'naltiruvchi — ETALON GAP. Bu o'lchab tanlangan.
  //
  // Uch variant sinaldi. Yo'naltiruvchisiz va umumiy kontekst bilan Whisper
  // qisqa yozuvlarda beqaror: "Она работает в больнице" ni "Невероятнейший
  // бурден Спрингтон" deb yozib qo'ygan holatlar bo'ldi. Etalon berilganda
  // esa transkripsiya barqaror.
  //
  // Xavfi bor: model o'quvchining xatosini etalonga qarab tuzatib yuborishi
  // mumkin. Sinovda bu kamdan-kam uchradi (xato o'qilgan gaplar baribir xato
  // deb yozildi), beqaror transkripsiya esa TO'G'RI o'qigan o'quvchiga
  // muntazam "xato" deyishga olib kelardi — bu ancha og'ir nuqson.
  const fayl = mimeToFilename(p.mimeType);
  let transcript = (await transcribeAudio(buffer, fayl, p.referenceText)).trim();
  if (!transcript) return emptyAudioFeedback();

  // BAHO KODDA HISOBLANADI. Model faqat grammatikani tushuntiradi.
  let natija = tekisla(p.referenceText, transcript);

  // Juda past natijada BIR MARTA qayta eshitamiz.
  //
  // Sababi: Whisper qisqa yozuvlarda ba'zan butunlay boshqa narsa yozib
  // qo'yadi ("Она работает в больнице" -> "Невероятнейший бурден Спрингтон").
  // Ekranda turgan gapni o'qiyotgan o'quvchi bunchalik past natija olishi
  // amalda kutilmaydi, shuning uchun bunday holat transkripsiya nosozligiga
  // o'xshaydi. Ikki urinishning YAXSHIROG'I olinadi: nosozlik bo'lsa
  // to'g'rilanadi, o'quvchi rostdan xato o'qigan bo'lsa ikkalasi ham past
  // chiqadi va baho past qolaveradi.
  //
  // Chegara 60: sinovdagi haqiqiy xatolar 67% va 75% olgan, ya'ni ular
  // qayta o'qishni ishga tushirmaydi.
  if (natija.aniqlik < PAST_CHEGARA) {
    // Qayta urinish BOSHQA model bilan: bir xil modelni takrorlash foyda
    // bermadi (u o'sha xatoni qaytaradi), boshqa model esa boshqacha
    // adashadi — ikkovining yaxshirog'i ancha ishonchli.
    const ikkinchi = (await transcribeAudio(buffer, fayl, p.referenceText, ZAXIRA_MODEL)).trim();
    if (ikkinchi) {
      const n2 = tekisla(p.referenceText, ikkinchi);
      if (n2.aniqlik > natija.aniqlik) {
        transcript = ikkinchi;
        natija = n2;
      }
    }
  }

  const { amallar, aniqlik } = natija;

  // JUDA PAST NATIJA — o'quvchini ayblamaymiz.
  //
  // Ekranda turgan gapni o'qiyotgan odam yarmidan ko'pini xato qilishi amalda
  // kutilmaydi. Bunday natija deyarli har doim yozuv sifati yoki nutq tanish
  // nosozligidan chiqadi ("Она работает в больнице" -> "Она рада больнице").
  // Bunda o'ylab topilgan xatolar ro'yxatini ko'rsatish o'quvchini adashtiradi
  // va u to'g'ri o'qigan bo'lsa ham "xato qilding" degan xabar oladi — bu aynan
  // shikoyat qilingan holat. Halol yo'l: eshitilmaganini aytish.
  if (aniqlik < PAST_CHEGARA) {
    return {
      transcript,
      aniqlik,
      daraja: 'yomon',
      izoh: "Yozuv aniq eshitilmadi. Jimroq joyda, mikrofonga yaqinroq va "
        + "shoshilmasdan qaytadan o'qing.",
      xatolar: [],
      qoida: null,
    };
  }
  const xatolar: ReadingIssue[] = amallar
    .filter((x) => x.tur !== 'mos')
    .slice(0, 6)
    .map((x) => {
      if (x.tur === 'almashgan') {
        return { soz: x.etalon, muammo: `"${x.oqilgan}" deb o'qildi`, tuzatish: x.etalon };
      }
      if (x.tur === 'tushgan') {
        return { soz: x.etalon, muammo: "o'qilmay tushib qoldi", tuzatish: x.etalon };
      }
      return { soz: x.oqilgan, muammo: "ortiqcha qo'shildi", tuzatish: '' };
    });

  const toza = xatolar.length === 0;

  const xatoBlok = toza
    ? `\nXATO YO'Q — o'quvchi gapni to'g'ri o'qidi (tekshiruv kodda bajarildi,
talaffuz qoidalari hisobga olingan). Uni maqta va GAPNING O'ZIDAGI grammatik
hodisani tushuntir (kelishik, fe'l shakli, predlog, sifat-ot mosligi).\n`
    : `\nANIQLANGAN XATOLAR (kod hisobladi, ishonchli — bularni o'zgartirma va
yangisini qo'shma):\n${xatolar.map((x) => `- ${x.soz}: ${x.muammo}`).join('\n')}
MAJBURIY: "qoida" AYNAN shu xatoga tegishli bo'lsin, boshqa mavzuga o'tma.\n`;

  const user = `ETALON GAP (rus tili):
"""${p.referenceText}"""
${p.referenceUz ? `\nGAPNING O'ZBEKCHA MA'NOSI:\n"""${p.referenceUz}"""\n` : ''}
O'QUVCHI O'QIGANI (transkripsiya):
"""${transcript}"""

O'QISH ANIQLIGI: ${aniqlik}% (kod hisobladi)
${xatoBlok}
Sendan faqat ikki narsa kerak: qisqa "izoh" va "qoida".`;

  const raw = isOpenAIConfigured()
    ? await openaiJson<Record<string, unknown>>({
        system: SYSTEM,
        user,
        temperature: 0.15,
        maxTokens: 800,
      })
    : await geminiJson<Record<string, unknown>>({
        system: SYSTEM,
        user,
        temperature: 0.15,
        maxTokens: 800,
      });

  return {
    transcript,
    aniqlik,
    daraja: toDaraja(aniqlik),
    izoh: String(raw.izoh ?? '').trim()
      || (toza ? "To'g'ri o'qidingiz." : "O'qishingiz qayd etildi."),
    xatolar,
    qoida: toRule(raw.qoida),
  };
}

/** Sozlanganmi — marshrut 503 qaytarishdan oldin tekshiradi. */
export function isUstozConfigured(): boolean {
  // OpenAI bo'lmasa `transcribeAudio`/`openaiJson` Gemini zaxirasiga tushadi.
  return isOpenAIConfigured() || Boolean(process.env.GEMINI_API_KEY);
}
