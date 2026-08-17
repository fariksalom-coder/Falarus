/**
 * ustozDoska.service.ts — "Doska": ustoz kun mavzusini jonli tushuntiradi.
 *
 * Oqim: o'quvchi grammatika bo'limini ochadi -> ustoz shu kunning mavzusini
 * bosqichma-bosqich doskaga yozib tushuntiradi -> o'quvchi savol bera oladi ->
 * oxirida nazorat savoli va qo'shimcha mashq.
 *
 * MUHIM: dars kunning O'Z materialidan quriladi (mavzu sarlavhasi + nazariya
 * matni), ya'ni ustoz kursdan chetga chiqmaydi.
 *
 * Til qoidasi: tushuntirish — o'zbekcha, misollar — ruscha + o'zbekcha
 * tarjimasi bilan. Platforma o'zbek tilida so'zlashuvchilarga rus tilini
 * o'rgatadi, boshqa fan yo'q.
 *
 * Provayder tanlash `ustozReading.service.ts` dagi bilan bir xil:
 * OPENAI_API_KEY bo'lsa OpenAI, aks holda Gemini.
 */
import { isOpenAIConfigured, openaiJson, transcribeAudio } from '../lib/openai.js';
import { geminiJson } from '../lib/gemini.js';
import { qoldaDars } from '../data/doskaDarslari.js';
import type {
  DoskaAyrilish,
  DoskaIkonka,
  DoskaNishonlar,
  DoskaTenglama,
} from '../../shared/nutqBolaklari.js';

/** Yozuv mime turidan fayl nomi — transkripsiya API'si kengaytmaga qaraydi. */
function mimeToFilename(mimeType: string): string {
  const m = (mimeType || '').toLowerCase();
  if (m.includes('mp4') || m.includes('m4a')) return 'recording.mp4';
  if (m.includes('mpeg') || m.includes('mp3')) return 'recording.mp3';
  if (m.includes('wav')) return 'recording.wav';
  return 'recording.webm';
}

/** Ovoz yozuvini matnga aylantiradi (doskadagi og'zaki javob uchun). */
export async function transcribeSpeech(audioBase64: string, mimeType: string): Promise<string> {
  const buffer = Buffer.from(audioBase64, 'base64');
  return (await transcribeAudio(buffer, mimeToFilename(mimeType))).trim();
}

/** Ruscha misol va uning o'zbekcha ma'nosi. */
export type DoskaMisol = { ru: string; uz: string; ikonka?: DoskaIkonka };

/**
 * Kunning vazifasi — dars aynan shular ustida quriladi.
 *
 * Klient kunning mashqlarini (test savollari, gap tuzish, moslashtirish)
 * shu sodda ko'rinishga keltirib yuboradi: ustoz ularni kengaytirib
 * tushuntiradi, ya'ni o'quvchi mashqqa kirishdan oldin nima talab qilinishini
 * va nega shunday ekanini biladi.
 */
export type DoskaVazifa = {
  tur: 'test' | 'gap' | 'moslash';
  savol: string;
  /** Test uchun variantlar; gap tuzishda so'zlar banki. */
  variantlar?: string[];
  /** To'g'ri javob (test yoki gap tuzish uchun). */
  javob?: string;
};

/** Taqqoslash jadvalining bir ustuni. */
export type DoskaUstun = {
  /** Ustun boshidagi figura (qo'lda yozilgan darslarda). */
  ikonka?: DoskaIkonka;
  /** Ustun boshi: «ОН — u (erkak)». */
  bosh: string;
  /** Ustun qatorlari: «Это друг.», «Он строитель.». */
  satrlar: string[];
};

export type DoskaTaqqoslash = {
  /** Jadval ustidagi savol: «КТО ЭТО? — Bu kim?». */
  savol: string;
  ustunlar: DoskaUstun[];
};

/**
 * Tipik xato — doskada ❌/✅ ko'rinishida.
 *
 * O'quvchi ko'pincha o'z tilidan kelib chiqib xato qiladi (o'zbekchada bitta
 * qo'shimcha, ruschada esa oxir o'zgaradi). Xatoni OLDINDAN ko'rsatish uni
 * yodda saqlashning eng tez yo'li.
 */
export type DoskaXato = {
  notogri: string;
  togri: string;
  /**
   * Nega xato ekani. AI har doim yozadi; qo'lda tuzilgan «To'g'ri / Xato»
   * mashqida esa bitta qoida uch marta takrorlanadi va har juftlikka izoh
   * yozilsa ustoz o'sha gapni uch marta aytib chiqardi — shuning uchun
   * ixtiyoriy.
   */
  izoh?: string;
};

/** Darsning bir bosqichi — doskadagi bitta "sahifa". */
export type DoskaBosqich = {
  sarlavha: string;
  /** Ustozning tushuntirishi (o'zbekcha, oddiy matn). */
  tushuntirish: string;
  /** Doskaga yoziladigan asosiy qoida/formula (qisqa, o'zbekcha). */
  qoida: string;
  /**
   * Ikki-uch shaklni YONMA-YON qo'yadigan jadval (bo'lmasa null).
   *
   * Rus tilidagi ko'p mavzu — rod, son, kelishik — faqat taqqoslaganda
   * tushunarli bo'ladi. Uzluksiz matnda farq ko'rinmaydi, ustunlarda esa
   * bir qarashda ko'rinadi.
   */
  taqqoslash: DoskaTaqqoslash | null;
  /** Shu bosqichdagi eng ko'p uchraydigan xato (bo'lmasa null). */
  xato: DoskaXato | null;
  /**
   * Bir necha xato juftligi — faqat QO'LDA yozilgan darslarda («To'g'ri /
   * Xato» mashqi). AI bitta bosqichga bittadan ortiq xato qaytarmaydi.
   */
  xatolar?: DoskaXato[];
  /**
   * QO'LDA YOZILGAN DARSLARNING MAXSUS MAKETLARI (AI ularni qaytarmaydi).
   * Manba: `dars-1-vizual.html` taqdimoti — «U» ning ikkiga ayrilishi,
   * blokli tenglama va nishonli qatorlar.
   */
  ayrilish?: DoskaAyrilish | null;
  tenglama?: DoskaTenglama | null;
  nishonlar?: DoskaNishonlar;
  misollar: DoskaMisol[];
  /**
   * Shu bosqich qaysi vazifani tayyorlayotgani — kunning haqiqiy mashqidan
   * olingan namuna va uning yechimi. Bo'lmasa `null`.
   */
  vazifa: {
    savol: string;
    javob: string;
    /** Nega aynan shu javob to'g'ri (o'zbekcha). */
    izoh: string;
  } | null;
};

export type DoskaNazorat = {
  savol: string;
  variantlar: string[];
  togriIndex: number;
  izoh: string;
};

export type DoskaDars = {
  sarlavha: string;
  /**
   * KUNNING KALIT SAVOLI — «КОМУ? — Kimga?».
   *
   * Doskaning yuqorisida dars oxirigacha turadi: o'quvchi har bosqichda
   * «bugun nimaga javob berayapmiz» degan savolni ko'z oldida saqlaydi.
   */
  kalitSavol: string;
  maqsad: string;
  bosqichlar: DoskaBosqich[];
  /**
   * Tushuntirishdan keyingi OG'ZAKI suhbat savollari. Ustoz ularni ovoz bilan
   * beradi, o'quvchi mikrofon orqali javob beradi.
   */
  savollar: string[];
  nazorat: DoskaNazorat | null;
  xulosa: string;
};

/** O'quvchining og'zaki javobiga ustoz bahosi. */
export type DoskaBaho = {
  baho: 'togri' | 'qisman' | 'xato';
  /** Ustozning ovoz bilan aytiladigan javobi. */
  izoh: string;
  /** Namunali javob — o'quvchi taqqoslashi uchun. */
  namuna: string;
};

export type DoskaJavob = {
  javob: string;
  misollar: DoskaMisol[];
};

export type DoskaMashqSavol = {
  savol: string;
  variantlar: string[];
  togriIndex: number;
  izoh: string;
};

export type DoskaMashq = {
  sarlavha: string;
  savollar: DoskaMashqSavol[];
};

/* ------------------------------------------------------------------ *
 *  Umumiy qoidalar (barcha promptlarda takrorlanadi)
 * ------------------------------------------------------------------ */

const TIL_QOIDASI = `TIL QOIDALARI (qat'iy):
- Sen o'zbek tilida so'zlashuvchi o'quvchiga RUS TILINI o'rgatasan. Boshqa fan yo'q.
- Tushuntirish HAR DOIM o'zbek tilida (lotin yozuvida) bo'ladi.
- Har bir ruscha misol yonida uning o'zbekcha tarjimasi bo'lishi SHART.
- Ruscha matn HAR DOIM kirill yozuvida qoladi. Ruscha so'z yoki savolni lotinga
  transliteratsiya QILMA: "о ком?" to'g'ri, "o kom?" NOTO'G'RI.
- Bu qoida grammatik ATAMALARGA ham tegishli: "винительный падеж" to'g'ri,
  "vinitel'nyy padej" NOTO'G'RI. Atamani kirillda yoz, keyin qavs ichida
  o'zbekcha nomini ber.
- Kelishiklarning o'zbekcha nomlari AYNAN shunday (o'zingdan o'ylab topma):
  именительный падеж — bosh kelishik
  родительный падеж — qaratqich kelishigi
  дательный падеж — jo'nalish kelishigi
  винительный падеж — tushum kelishigi
  творительный падеж — vosita kelishigi
  предложный падеж — o'rin-payt kelishigi
- Sodda, qisqa gaplar. Ilmiy atama ishlatsang, darhol oddiy so'z bilan izohla.
- Markdown belgilaridan (*, #, \`) foydalanma — matn shundayligicha ko'rsatiladi.

ANIQLIK (eng muhim talab):
- Har bir ruscha gap grammatik jihatdan MUTLAQO to'g'ri bo'lishi shart.
- Fe'l yoki predlog qaysi kelishikni talab qilishini tekshir. Masalan "обсуждать"
  tushum kelishigini oladi ("обсуждаем проблему"), predlog kelishigini EMAS.
- Kelishik qo'shimchasi predlogga emas, OTNING o'ziga (jinsi va turiga) bog'liq:
  "в тетради" — chunki "тетрадь" yumshoq belgili ayol rodi, predlog "в" emas.
- Ishonching komil bo'lmasa, sodda va aniq misol tanla. Chalkash misoldan ko'ra
  oddiy, lekin to'g'ri misol yaxshiroq.`;

/**
 * MAVZUDAN CHETGA CHIQMASLIK — barcha promptlarda takrorlanadi.
 *
 * Nima uchun kerak: model savolga to'liq javob berishga intiladi va bitta
 * savoldan butun grammatika kursiga o'tib ketishi mumkin. O'quvchi esa
 * bugungi mavzuni o'zlashtirishi kerak; ortiqcha ma'lumot uni chalg'itadi
 * va darsni cho'zadi. Shuning uchun uch daraja aniq ajratilgan.
 */
const MAVZU_QOIDASI = `MAVZUDAN CHIQMASLIK (qat'iy):
- Bugungi MAVZU doirasidan chiqma. Yangi grammatik mavzu ochma, kelasi
  darslarning materialini oldindan aytma, "bundan tashqari..." deb qo'shimcha
  qoidalar sanab ketma.
- Savol turiga qarab uch xil javob berasan:
  1) BUGUNGI MAVZUGA oid savol — to'liq va aniq javob ber.
  2) Rus tiliga oid, LEKIN boshqa mavzu — javobni RAD ETMA, lekin cho'zma:
     eng ko'pi bilan ikki gapda mohiyatini ayt va darhol bugungi mavzuga
     qaytar ("buni keyingi darslarda batafsil ko'ramiz"). Ro'yxat qilib
     sanab ketma, jadval berma, misollar keltirma.
  3) Rus tiliga UMUMAN aloqasiz (ob-havo, sport, siyosat, matematika,
     shaxsiy savollar) — javob berma. Bir gapda muloyim rad et va mavzuga
     qaytar.
- Misollar ham faqat bugungi mavzuga tegishli bo'lsin.
- Bitta javobda bitta fikr. Ro'yxat qilib sanab ketma.

QOIDALARNI OVOZGA CHIQARMA (muhim):
Bu cheklovlar SENING ichki qoidalaring — o'quvchi ularni eshitmasligi kerak.
"Men mavzudan chiqib keta olmayman", "menga ruxsat berilmagan", "bu mening
vazifam emas", "men faqat shu mavzu haqida gapira olaman" kabi gaplarni ASLO
aytma. O'zing haqingda, o'z imkoniyating yoki cheklovlaring haqida umuman
gapirma. Mavzuga qaytarish kerak bo'lsa, buni TABIIY qil: shunchaki mavzu
bo'yicha gapirishda davom et yoki keyingi savolga o't. Haqiqiy o'qituvchi
o'zining ish qoidalarini o'quvchiga o'qib bermaydi.`;

/**
 * Kelishik nomlarining lotincha transliteratsiyasi -> kirill.
 *
 * Model ko'rsatmaga qaramay ba'zan "vinitel'nyy padej" deb yozadi. Rus tili
 * kursida bu qabul qilib bo'lmaydi, shuning uchun promptga ishonib qolmasdan
 * javobda ham to'g'rilaymiz.
 */
const KELISHIK_TUZATISH: Array<[RegExp, string]> = [
  // Model imlosi turlicha bo'ladi: vinitel'nyy / viniteljnyy / vinital'nyy...
  // Shuning uchun har bir variantni sanamaymiz — O'ZAK + "padej" ga tayanamiz.
  // Oxiridagi o'zbekcha qo'shimcha ($1) saqlanadi: "padejda" -> "падежda".
  // O'zakdan keyin apostrof ham kelishi mumkin ("vinital'nyy"), shuning uchun
  // [\w'’]*. "padezh" shakli "zh" bilan tugaydi — u birinchi tekshiriladi,
  // aks holda ortiqcha "h" qolib ketadi.
  [/imenit[\w'’]*\s*pade(?:zh|[jz])(\w*)/gi, 'именительный падеж$1'],
  [/rodit[\w'’]*\s*pade(?:zh|[jz])(\w*)/gi, 'родительный падеж$1'],
  [/datel[\w'’]*\s*pade(?:zh|[jz])(\w*)/gi, 'дательный падеж$1'],
  [/vinit[\w'’]*\s*pade(?:zh|[jz])(\w*)/gi, 'винительный падеж$1'],
  [/tvorit[\w'’]*\s*pade(?:zh|[jz])(\w*)/gi, 'творительный падеж$1'],
  [/predlo[jz][\w'’]*\s*pade(?:zh|[jz])(\w*)/gi, 'предложный падеж$1'],
  // Sifatsiz yolg'iz qolgan "padej" ham kirillga o'tsin.
  [/\bpade(?:zh|[jz])(\w*)/gi, 'падеж$1'],
];

/**
 * Kelishiklarning o'zbekcha nomlari. Model ba'zan o'zicha tarjima qiladi
 * ("ijodiy kelishik") yoki notoʻgʻri nom beradi (родительный ni "tushum
 * kelishigi" deb) — bu rus tili kursida jiddiy xato, shuning uchun qavs
 * ichidagi o'zbekcha nom majburan to'g'rilanadi.
 */
const KELISHIK_NOMI: Record<string, string> = {
  // Kalit — O'ZAK: rus sifati turlanadi ("в творительном падеже"), shuning
  // uchun to'liq shaklga tayanib bo'lmaydi.
  'именительн': 'bosh kelishik',
  'родительн': 'qaratqich kelishigi',
  'дательн': "jo'nalish kelishigi",
  'винительн': 'tushum kelishigi',
  'творительн': 'vosita kelishigi',
  'предложн': "o'rin-payt kelishigi",
};

/**
 * Qavs ichidagi LOTIN yozuvidagi izohnigina almashtiradi. Kirilldagi qavs
 * (masalan "родительный падеж (кого? чего?)") — bu savol so'zlari, ular
 * to'g'ri va tegilmaydi.
 */
// DIQQAT: JS'da `\w` kirillni QAMRAMAYDI, shuning uchun sifat oxiri va
// "падеж" ning qo'shimchasi uchun [а-яё\w] ishlatiladi.
const KELISHIK_NOMI_RE =
  /(именительн|родительн|дательн|винительн|творительн|предложн)([а-яё\w]*\s+падеж[а-яё\w]*\s*)\(([^)]*[A-Za-z][^)]*)\)/gi;

/** Teskari tartib ham uchraydi: "ijod kelishigi (творительный падеж)". */
const KELISHIK_NOMI_TESKARI_RE =
  /([A-Za-z''’ -]{4,30}?kelishi\w*)(\s*\(\s*)(именительн|родительн|дательн|винительн|творительн|предложн)/gi;

/** Model qaytargan qiymatni ishonchli satrga aylantiradi. */
const str = (v: unknown, max = 600): string => {
  // Markdown belgilari olib tashlanadi, LEKIN ketma-ket kelgan pastki chiziqlar
  // saqlanadi: mashqda "___ студент" — bu to'ldiriladigan BO'SH JOY. Ilgari
  // ular ham o'chirilib, savol javobning o'zini ko'rsatib qo'yardi.
  let out = String(v ?? '')
    .replace(/[*#`]|_+/g, (m) => (m[0] === '_' && m.length >= 2 ? '____' : ''))
    .trim();
  for (const [re, to] of KELISHIK_TUZATISH) out = out.replace(re, to);
  out = out.replace(KELISHIK_NOMI_RE, (_m, kelishik: string, orta: string) => {
    const nomi = KELISHIK_NOMI[kelishik.toLowerCase()];
    return nomi ? `${kelishik}${orta}(${nomi})` : _m;
  });
  out = out.replace(KELISHIK_NOMI_TESKARI_RE, (_m, _nom: string, orta: string, kelishik: string) => {
    const nomi = KELISHIK_NOMI[kelishik.toLowerCase()];
    return nomi ? `${nomi}${orta}${kelishik}` : _m;
  });
  return out.slice(0, max);
};

/** Ruscha misollar ro'yxatini tozalaydi — bo'sh yoki tarjimasizlari tushib qoladi. */
function toMisollar(raw: unknown, limit = 4): DoskaMisol[] {
  if (!Array.isArray(raw)) return [];
  const out: DoskaMisol[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    const ru = str(r.ru, 200);
    const uz = str(r.uz, 200);
    if (!ru || !uz) continue;
    out.push({ ru, uz });
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Taqqoslash jadvalini tekshirib oladi.
 *
 * Kamida IKKI ustun bo'lishi shart: bitta ustunli «jadval» taqqoslash emas,
 * u oddiy ro'yxat va misollar bo'limida turishi kerak. Uchtadan ortiq ustun
 * telefon ekraniga sig'maydi, shuning uchun kesiladi.
 */
/**
 * IKONKA NOMINI TEKSHIRADI.
 *
 * Model o'zidan nom o'ylab topishi mumkin ("teacher", "erkak-odam"), ammo
 * doskada faqat chizilgan figuralar bor. Ro'yxatda yo'q nom jimgina
 * tashlanadi: rasmsiz kartochka — buzilgan kartochkadan yaxshiroq.
 */
const IKONKALAR: readonly DoskaIkonka[] = [
  'odam', 'ozim', 'erkak', 'ayol', 'juft', 'guruh', 'korsat',
  'quruvchi', 'talaba', 'boshliq', 'politsiya', 'dostlar',
  'hujjat', 'gap', 'savol', 'joy',
];

/**
 * MATNGA QARAB FIGURA TANLASH.
 *
 * Model ko'rsatmaga qaramay ikonkani deyarli hech qachon yozmaydi (o'lchandi:
 * uch kunlik sinovda bittasida ham yo'q edi), doska esa rasmsiz quruq
 * ro'yxatga aylanib qoladi. Shuning uchun figura KOD bilan tanlanadi:
 * bu bezak, ya'ni xato tanlansa ham dars buzilmaydi, lekin to'g'ri tanlansa
 * o'quvchi so'zni rasm bilan bog'lab eslab qoladi.
 *
 * Tartib muhim: avval KASB va aniq tushunchalar, keyin olmoshlar — "Он
 * строитель" da "он" ham, "строитель" ham bor, kerakligi esa quruvchi.
 */
const IKONKA_KALITLARI: Array<[RegExp, DoskaIkonka]> = [
  [/строител|quruvchi|маляр|сварщик|рабоч/i, 'quruvchi'],
  [/студент|talaba|учени|школьник|o'quvchi/i, 'talaba'],
  [/начальник|boshliq|директор|бригадир|шеф/i, 'boshliq'],
  [/полиц|милиц|politsiya|инспектор|паспортн/i, 'politsiya'],
  [/друз|друг|подруг|do'st|tengdosh|товарищ/i, 'dostlar'],
  [/зовут|имя|ism|документ|паспорт|hujjat|справк/i, 'hujjat'],
  [/\?\s*$|вопрос|savol|как |что |кто |где |почему/i, 'savol'],
  [/узбекистан|город|страна|адрес|joy|manzil|улиц|работа в /i, 'joy'],
  [/\bона\b|\bеё\b|ayol|женщин|сестра|мама|мать|дочь|жена|врач-женщ/i, 'ayol'],
  [/\bон\b|\bего\b|erkak|мужчин|брат|папа|отец|сын|муж/i, 'erkak'],
  [/\bмы\b|\bнас\b|\bнам\b|biz\b/i, 'juft'],
  [/\bвы\b|\bони\b|\bвас\b|\bих\b|ular|sizlar|люди|все\b/i, 'guruh'],
  [/\bя\b|\bменя\b|\bмне\b|\bmen\b|o'zim/i, 'ozim'],
  [/\bты\b|\bтебя\b|\bтебе\b|\bsen\b/i, 'korsat'],
];

function ikonkaTop(...matnlar: Array<string | undefined>): DoskaIkonka | undefined {
  const matn = matnlar.filter(Boolean).join(' ');
  if (!matn) return undefined;
  for (const [re, nom] of IKONKA_KALITLARI) if (re.test(matn)) return nom;
  return undefined;
}

function toIkonka(v: unknown): DoskaIkonka | undefined {
  const nom = String(v ?? '').trim().toLowerCase();
  return (IKONKALAR as readonly string[]).includes(nom) ? (nom as DoskaIkonka) : undefined;
}

/**
 * AYRILISH — bitta so'z ikkiga bo'linadi.
 * Kamida ikki tarmoq bo'lmasa maket ma'nosini yo'qotadi.
 */
function toAyrilish(raw: unknown): DoskaAyrilish | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const soz = str(r.soz, 40);
  const tarmoqlarRaw = Array.isArray(r.tarmoqlar) ? r.tarmoqlar : [];
  const tarmoqlar: DoskaAyrilish['tarmoqlar'] = [];
  for (const item of tarmoqlarRaw) {
    if (!item || typeof item !== 'object') continue;
    const t = item as Record<string, unknown>;
    const tSoz = str(t.soz, 40);
    if (!tSoz) continue;
    tarmoqlar.push({
      soz: tSoz,
      izoh: str(t.izoh, 80) || undefined,
      ikonka: toIkonka(t.ikonka) ?? ikonkaTop(tSoz, str(t.izoh, 80)),
    });
    if (tarmoqlar.length >= 3) break;
  }
  if (!soz || tarmoqlar.length < 2) return null;
  return { soz, tarmoqlar };
}

/** BLOKLI TENGLAMA — kamida ikki qator bo'lsagina taqqoslash chiqadi. */
function toTenglama(raw: unknown): DoskaTenglama | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const qatorlarRaw = Array.isArray(r.qatorlar) ? r.qatorlar : [];
  const qatorlar: DoskaTenglama['qatorlar'] = [];
  for (const item of qatorlarRaw) {
    if (!item || typeof item !== 'object') continue;
    const q = item as Record<string, unknown>;
    const bloklarRaw = Array.isArray(q.bloklar) ? q.bloklar : [];
    const bloklar: DoskaTenglama['qatorlar'][number]['bloklar'] = [];
    for (const b of bloklarRaw) {
      if (!b || typeof b !== 'object') continue;
      const bb = b as Record<string, unknown>;
      const matn = str(bb.matn, 60);
      if (!matn) continue;
      const tur = String(bb.tur ?? '').trim().toLowerCase();
      bloklar.push({
        matn,
        tur:
          tur === 'urgu' || tur === 'bosh' || tur === 'ochirilgan'
            ? (tur as 'urgu' | 'bosh' | 'ochirilgan')
            : 'oddiy',
      });
      if (bloklar.length >= 5) break;
    }
    if (!bloklar.length) continue;
    qatorlar.push({ nom: str(q.nom, 40), bloklar });
    if (qatorlar.length >= 3) break;
  }
  return qatorlar.length >= 2 ? { qatorlar } : null;
}

/** NISHONLAR — "kimga qaysi shakl" qatorlari. */
function toNishonlar(raw: unknown): DoskaNishonlar | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: DoskaNishonlar = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const n = item as Record<string, unknown>;
    const kim = str(n.kim, 60);
    const togri = str(n.togri, 30);
    if (!kim || !togri) continue;
    out.push({
      kim,
      izoh: str(n.izoh, 60) || undefined,
      togri,
      notogri: str(n.notogri, 30) || undefined,
      ikonka: toIkonka(n.ikonka) ?? ikonkaTop(kim, str(n.izoh, 60)),
    });
    if (out.length >= 4) break;
  }
  return out.length ? out : undefined;
}

function toTaqqoslash(raw: unknown): DoskaTaqqoslash | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const ustunlarRaw = Array.isArray(r.ustunlar) ? r.ustunlar : [];
  const ustunlar: DoskaUstun[] = [];

  for (const item of ustunlarRaw) {
    if (!item || typeof item !== 'object') continue;
    const u = item as Record<string, unknown>;
    const bosh = str(u.bosh, 80);
    const satrlar = Array.isArray(u.satrlar)
      ? u.satrlar.map((x) => str(x, 120)).filter(Boolean).slice(0, 4)
      : [];
    if (!bosh || satrlar.length === 0) continue;
    ustunlar.push({ bosh, satrlar, ikonka: toIkonka(u.ikonka) ?? ikonkaTop(bosh, satrlar[0]) });
    if (ustunlar.length >= 3) break;
  }

  if (ustunlar.length < 2) return null;
  return { savol: str(r.savol, 120), ustunlar };
}

/**
 * Tipik xato blokini oladi va QOIDA BILAN TEKSHIRADI.
 *
 * Model «tipik xato» so'ralganda, mavzuda aniq xato bo'lmasa ham, uni O'YLAB
 * TOPADI va ma'nosiz juftlik yozadi: «❌ Она он. → ✅ Она — u (ayol).» Bunday
 * narsani doskaga chiqarish o'quvchini chalkashtiradi, shuning uchun promptdagi
 * ogohlantirishga ishonib qolmaymiz — natija shu yerda ham tekshiriladi:
 *
 *  1. ikkala gap ham KAMIDA IKKI SO'ZDAN iborat bo'lsin (bitta so'z — xato emas);
 *  2. ikkalasi ham ASOSAN KIRILLDA bo'lsin — «Она — u (ayol)» kabi aralash
 *     yozuv gap emas, tarjima izohi;
 *  3. ular bir-biridan farq qilsin (tinish belgisidan boshqasi bilan).
 *
 * Shartga tushmasa xato butunlay tashlanadi: doskada bo'lmagani — noto'g'risi
 * turgandan yaxshiroq.
 */
function kirillUlushi(matn: string): number {
  const harflar = matn.match(/[\p{L}]/gu) ?? [];
  if (!harflar.length) return 0;
  const kirill = matn.match(/[а-яёА-ЯЁ]/g) ?? [];
  return kirill.length / harflar.length;
}

/**
 * "TO'G'RI / XATO" MASHQI — bir necha juftlik.
 *
 * Har juftlik `toXato` ning o'z tekshiruvidan o'tadi (ma'nosiz "xato"lar
 * shu yerda tashlanadi), izohlari esa olib tashlanadi: bitta qoida uch marta
 * takrorlanganda har juftlikka izoh yozilsa, ustoz o'sha gapni uch marta
 * aytib chiqadi.
 */
function toXatolar(raw: unknown): DoskaXato[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: DoskaXato[] = [];
  for (const item of raw) {
    const x = toXato(item);
    if (!x) continue;
    out.push({ notogri: x.notogri, togri: x.togri });
    if (out.length >= 3) break;
  }
  return out.length >= 2 ? out : undefined;
}

function toXato(raw: unknown): DoskaXato | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const notogri = str(r.notogri, 160);
  const togri = str(r.togri, 160);
  if (!notogri || !togri) return null;

  const sozlar = (x: string) =>
    x.toLowerCase().split(/[^\p{L}]+/u).filter((w) => w.length > 0);

  const aSozlar = sozlar(notogri);
  const bSozlar = sozlar(togri);

  // 1. Ikkalasi ham gap bo'lsin: uch so'zdan kam narsa gap emas
  //    («Она он.» — bunday xatoni hech kim qilmaydi).
  if (aSozlar.length < 3 || bSozlar.length < 3) return null;
  // 2. Asosan kirillda bo'lsin — «Она — u (ayol)» gap emas, izoh.
  if (kirillUlushi(notogri) < 0.6 || kirillUlushi(togri) < 0.6) return null;
  // 3. Haqiqiy tuzatish BITTA joyda farq qiladi, ya'ni gaplar bir-biriga
  //    o'xshash bo'lishi kerak: kamida bitta umumiy so'z bo'lsin.
  if (!aSozlar.some((w) => bSozlar.includes(w))) return null;
  // 4. Va ular baribir farq qilsin.
  if (aSozlar.join(' ') === bSozlar.join(' ')) return null;

  return { notogri, togri, izoh: str(r.izoh, 300) };
}

/** Ko'p tanlovli savolni tekshirib oladi (variantlar soni va indeks to'g'ri bo'lsin). */
function toSavol(raw: unknown): DoskaMashqSavol | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const savol = str(r.savol, 300);
  const variantlar = Array.isArray(r.variantlar)
    ? r.variantlar.map((v) => str(v, 160)).filter(Boolean).slice(0, 4)
    : [];
  if (!savol || variantlar.length < 2) return null;
  const idx = Number(r.togriIndex);
  return {
    savol,
    variantlar,
    togriIndex: Number.isInteger(idx) && idx >= 0 && idx < variantlar.length ? idx : 0,
    izoh: str(r.izoh, 400),
  };
}

/** Provayder tanlab JSON so'raydi — ikkalasining imzosi bir xil. */
async function askJson<T extends Record<string, unknown>>(params: {
  system: string;
  user: string;
  temperature: number;
  maxTokens: number;
}): Promise<T> {
  return isOpenAIConfigured() ? openaiJson<T>(params) : geminiJson<T>(params);
}

/* ------------------------------------------------------------------ *
 *  1. Jonli dars
 * ------------------------------------------------------------------ */

export async function buildLesson(p: {
  mavzu: string;
  nazariya?: string;
  kun?: number;
  vazifalar?: DoskaVazifa[];
}): Promise<DoskaDars> {
  /*
   * QO'LDA YOZILGAN DARS — AI'dan USTUN.
   *
   * Ba'zi kunlarning darsi metodik tartibda qo'lda tuzilgan (`server/data/
   * doskaDarslari.ts`). Bunday kunda modelga umuman murojaat qilinmaydi:
   * dars har safar aynan bir xil chiqadi, tartibi kafolatlangan, tayyorlash
   * bir zumda va bepul bo'ladi. Qolgan kunlar avvalgidek AI'da qoladi.
   */
  const qolda = qoldaDars(p.kun);
  if (qolda) return qolda;

  // Dars uzun bo'lib ketmasin: har vazifa bitta bosqich degani, 6 tadan
  // ortiq vazifa o'quvchini charchatadi.
  const vazifalar = (p.vazifalar ?? []).slice(0, 6);

  /*
   * DARS PROMPTI — «MUKAMMAL O'QITUVCHI» ko'rsatmasi.
   *
   * Tuzilishi ataylab bo'limlarga bo'lingan (QISM 1…7): dars sifatsiz chiqsa,
   * modelga «QISM 3 buzildi» deb aniq ko'rsatish mumkin bo'ladi.
   *
   * Asosiy talab — mavzuni TUSHUNMASDAN gapirmaslik va doskaga tartibsiz
   * yozmaslik: har bosqichda bitta fikr, har qoidadan keyin darhol misol.
   */
  const system = `Sen FalaRus.uz platformasining rus tili o'qituvchisisan. O'quvchilaring — Rossiyada ishlaydigan o'zbekzabon mehnat migrantlari. Sen doskada dars o'tasan.

${TIL_QOIDASI}

QISM 1. ASOSIY QONUN
Tushunmasdan turib o'qitma.
1. Avval tahlil — keyin nutq.
2. Doskada faqat tartib. Tartibsiz yozilgan doska — bu yo'q doska.
3. Bir vaqtda bitta fikr. Ikkita qoidani birga tushuntirma.

QISM 2. DARSDAN OLDINGI MAJBURIY TAHLIL (ichida qil, javobga YOZMA)
Dars tuzishdan oldin o'zingga shu savollarga javob ber:
1. Bugungi kunning ASOSIY BITTA fikri nima? Bir gapda ayt. Bir gapda ayta
   olmasang — mavzuni o'zing tushunmagansan, qaytadan tahlil qil.
2. O'zbek tilida bu qanday ifodalanadi? O'quvchi yangi narsani faqat o'z tili
   orqali tushunadi — solishtiruvni albatta top.
3. O'zbekzabon o'quvchi uchun asosiy QIYINCHILIK qayerda? Darsning yarmini
   shu joyga bag'ishla.
4. Bu mavzu qaysi oldingi materialga tayanadi?
5. Bu keyin qayerda kerak bo'ladi?
6. Eng kam nechta qoida bilan tushuntirsa bo'ladi? Ortiqchasini tashla.
7. Qaysi 3 ta misol eng aniq ko'rsatadi? Ular sodda, qisqa va ISH/HUJJAT/OILA
   haqida bo'lsin.
8. Dars oxirida o'quvchi aynan qanday gapni ayta olishi kerak? Butun dars shu
   gapga olib boradi.

QISM 2A. PROMPTDAGI MISOLLAR — FAQAT SHAKL NAMUNASI
Bu ko'rsatmada «КОМУ? — Kimga?», «Я помогаю бригадиру», «брату», «маме» kabi
so'zlar bor. Ular FAQAT maydonlarning shaklini ko'rsatadi. Ularning MAZMUNINI
nusxa ko'chirish QAT'IY TAQIQLANADI: agar bugungi mavzu jo'nalish kelishigi
bo'lmasa, darsingda «КОМУ?» ham, «бригадиру» ham bo'lmasligi kerak. Har bir
gap, savol va misol BUGUNGI mavzudan chiqishi shart.

QISM 3. DOSKA QOIDALARI (qat'iy)
- Doska konspekt emas, XARITA. Uzun paragraf yozma.
- "kalitSavol" — BUGUNGI mavzuning kalit savoli, ruscha + o'zbekcha tarjimasi.
  U mavzudan kelib chiqadi: tanishuv bo'lsa "КТО ЭТО? — Bu kim?" yoki
  "КАК ВАС ЗОВУТ? — Ismingiz nima?", egalik bo'lsa "ЧЕЙ? — Kimniki?",
  jo'nalish kelishigi bo'lsa "КОМУ? — Kimga?". Namunani ko'chirma — o'z
  mavzungnikini yoz. U doskada dars oxirigacha turadi, shuning uchun qisqa
  bo'lsin.
- Bir bosqichda faqat BITTA jadval. Ikkinchisi kerak bo'lsa — keyingi bosqichga.
- Tarjimasiz ruscha so'z yozilmaydi: har misolda o'zbekcha tarjima bo'ladi.
- O'quvchi so'ramagan istisnolarni yozma.

QISM 4. DARS NUTQINING TUZILMASI
Dars quyidagi ketma-ketlikda quriladi:
1. Hayotiy vaziyat — birinchi bosqich qoidadan emas, VAZIYATDAN boshlanadi
   ("Brigadir so'radi: Кому ты дал документы?").
2. Kalit savol doskaga chiqadi ("kalitSavol").
3. O'zbek tili bilan ko'prik: o'zbekchada qanday, ruschada nimasi boshqacha.
4. Qoida bosqichma-bosqich ochiladi: avval eng sodda holat va DARHOL 2 ta
   misol, keyin ikkinchi holat va yana 2 ta misol.
5. Yig'ma jadval ("taqqoslash") — hamma holat bitta jadvalda.
6. Tipik xato ("xato") — eng ko'p uchraydigan noto'g'ri gap va uning to'g'risi.
7. O'quvchi gapiradi ("savollar") va yakuniy gap ("xulosa").

QISM 5. USLUB
- Bir vaqtda bitta fikr; har qoidadan keyin darhol misol.
- Qisqa gaplar. Uzun jumla — chalkashlik.
- Misollar ish, hujjat, oila, do'kon, shifokor haqida bo'lsin. Kitobiy misol
  ("Мама мыла раму") YARAMAYDI.
- "Bu oson" dema — o'quvchi uchun qiyin bo'lishi mumkin.
- Ilmiy atamani izohsiz ishlatma.

QISM 6. ISHONCHSIZ BO'LSANG
Taxmin qilib gapirma. Mavzuning eng sodda, ishonchli qismiga qayt va faqat
shuni tushuntir. Yarim tushuntirilgan to'g'ri material — chalkash tushuntirilgan
to'liq materialdan yaxshiroq. Kun raqamlarini O'YLAB TOPMA: senga berilmagan
kunga havola qilma ("44-kunda ko'rgandik" deb yozma), umumiy ayt.

MAVZUDAN CHIQMASLIK: dars faqat berilgan MAVZU va NAZARIYA doirasida bo'lsin.
Boshqa grammatik mavzularni ochma, kelasi darslar materialini oldindan berma.

QISM 8. DOSKA MAKETLARI — SLAYD BO'LIB CHIZILADI
Har bosqich doskada alohida SLAYD bo'lib chiqadi. Matndan tashqari maxsus
maketlar bor; ular mavzuga TO'G'RI KELSAGINA to'ldiriladi, aks holda null.
Zo'rlab ishlatma: mos kelmagan maket darsni chalkashtiradi.

1) "ayrilish" — BITTA tushuncha ikkiga (yoki uchga) bo'linganda.
   Aynan shu joyda o'zbekzabon o'quvchi eng ko'p adashadi: o'zbekchada bitta
   so'z, ruschada ikkita. Masalan bitta "u" -> ОН va ОНА.
   { "soz": "U", "tarmoqlar": [
       { "soz": "ОН", "izoh": "Сергей · Акмал", "ikonka": "erkak" },
       { "soz": "ОНА", "izoh": "Мария · Дилноза", "ikonka": "ayol" } ] }
   Faqat SHUNDAY bo'linish bo'lsa yoz, aks holda null.

2) "tenglama" — gap TUZILISHINI o'zbekcha bilan yonma-yon qo'yish.
   O'zbekchada qo'shimcha bor, ruschada o'rni bo'sh qoladi (yoki teskarisi).
   Blok turlari: "urgu" (ajratib ko'rsatiladi), "bosh" (bo'sh o'rin),
   "ochirilgan" (ustidan chiziladi — ishlatilmaydigan so'z), boshqasi oddiy.
   { "qatorlar": [
       { "nom": "o'zbekcha", "bloklar": [
           {"matn":"Men"}, {"matn":"quruvchi"}, {"matn":"MAN","tur":"urgu"} ] },
       { "nom": "ruscha", "bloklar": [
           {"matn":"Я","tur":"urgu"}, {"matn":"bo'sh","tur":"bosh"},
           {"matn":"строитель","tur":"urgu"} ] } ] }
   Faqat tuzilma farqi mavzuning MOHIYATI bo'lsa yoz, aks holda null.

3) "nishonlar" — "qaysi holatda qaysi shakl" degan TANLOV.
   { "kim": "Boshliq", "izoh": "начальник", "togri": "ВЫ", "notogri": "ТЫ",
     "ikonka": "boshliq" }
   2-4 ta qator. Tanlov bo'lmasa null.

4) "xatolar" — bitta qoida bir necha gapda takrorlanadigan "to'g'ri/xato"
   mashqi: [{ "notogri": "...", "togri": "..." }] (2-3 juftlik, izohsiz).
   Bitta xato yetarli bo'lsa "xato" ni ishlat, bunisini null qoldir.

5) "ikonka" — misol va ustunlar yonidagi figura. FAQAT shu ro'yxatdan
   (boshqa nom yozsang tashlab yuboriladi):
   odam, ozim, erkak, ayol, juft, guruh, korsat, quruvchi, talaba, boshliq,
   politsiya, dostlar, hujjat, gap, savol, joy.
   HAR BIR misolga va HAR BIR ustunga ikonka qo'yishga harakat qil — doska
   rasmsiz quruq ro'yxatga aylanib qoladi. Ma'nosiga qarab tanla:
   "Он строитель" -> quruvchi, "Она студентка" -> talaba, "Меня зовут" ->
   hujjat, "Как вас зовут?" -> savol, "Я из Узбекистана" -> joy, boshliq/
   politsiya/do'st haqida -> boshliq/politsiya/dostlar, ko'plik -> guruh,
   o'zim haqimda -> ozim. Umuman mos kelmasa "gap" ni qo'y.

BOSQICHLAR — DARS YO'LI (8-12 ta):
Dars bitta uzun tushuntirish emas, KETMA-KET SLAYDLAR bo'lib boradi. Andoza:
  1. Kirish: bugun nima o'rganamiz va dars oxirida qanday gap ayta olamiz.
  2. Asosiy ro'yxat yoki tushuncha (qisqa misollar bilan).
  3. Eng muhim FARQ ("ayrilish" yoki "taqqoslash" shu yerda).
  4. O'sha farq GAPDA qanday ishlaydi (2 ta misol).
  5. Tuzilma farqi ("tenglama"), agar mavzuda bo'lsa.
  6. "To'g'ri / xato" mashqi ("xatolar").
  7-8. Qo'shimcha holatlar yoki hayotiy vaziyatlar ("nishonlar").
  9-11. Kunning VAZIFALARI — har biriga bittadan bosqich.
  12. Yakun: bugun yod olinadigan 2 ta tayyor ibora.
- HAR BIR VAZIFA uchun albatta bittadan bosqich bo'ladi, birortasi tashlanmaydi.
- KAMIDA 8 TA BOSQICH. Bu talab: 4-5 bosqich — bu dars emas, konspekt.
  Mavzu kichik ko'rinsa ham uni MAYDALA: bitta bosqichda ikkita fikrni
  birlashtirma, har holatga alohida bosqich ber, misollarni alohida bosqichga
  chiqar, hayotiy vaziyat va yakun bosqichlarini qo'sh.
- Bo'sh gap, takror va "suv" yozma: har bosqich YANGI narsa aytishi kerak.
- Bir bosqichda BITTA maket bo'ladi: taqqoslash, ayrilish, tenglama va
  nishonlardan faqat bittasini to'ldir. Ikkitasi birga qo'yilsa doskada bir
  xil narsa ikki marta chiziladi.
- Bosqichlar soddadan murakkabga joylashadi.

HAR BOSQICHDA:
  "sarlavha" — bosqichning qisqa nomi.
  "tushuntirish" — 45-80 so'z. Bir fikr, sodda gaplar, o'zbekcha ko'prik bilan.
  "qoida" — bitta qisqa qator, eng muhim xulosa.
  "taqqoslash" — DOSKADAGI JADVAL. Mavzu ikki (yoki uch) shaklni qarama-qarshi
     qo'yganda TO'LDIRILADI: erkak/ayol rodi, birlik/ko'plik, kelishik shakllari,
     tugallangan/tugallanmagan fe'l. Qarama-qarshilik bo'lmasa null.
     Tuzilishi: "savol" — jadval ustidagi savol (ruscha + o'zbekcha tarjimasi);
     "ustunlar" — 2-3 ta ustun, har birida "bosh" (nomi va tarjimasi) va
     "satrlar" (2-3 ta qisqa ruscha misol).
     Ustunlar BIR XIL tuzilishda bo'lsin: chap ustunning 1-qatoriga o'ng
     ustunning 1-qatori mos kelsin — farq yonma-yon ko'rinadi.
     Namuna:
       "taqqoslash": {
         "savol": "КТО ЭТО? — Bu kim?",
         "ustunlar": [
           { "bosh": "ОН — u (erkak)", "satrlar": ["Это друг.", "Он строитель."] },
           { "bosh": "ОНА — u (ayol)", "satrlar": ["Это Азиз.", "Она студентка."] }
         ]
       }
  "xato" — o'zbekzabon o'quvchi SHU MAVZUDA haqiqatan qiladigan xato.
     QAT'IY SHART: xatoni O'YLAB TOPMA. Ishonching komil bo'lmasa null qaytar
     (QISM 6). "notogri" ham, "togri" ham TO'LIQ va tabiiy ruscha gap bo'lsin;
     ma'nosiz gap YARAMAYDI — bunday xatoni hech kim qilmaydi. Masalan
     "❌ Она он. → ✅ Она — она." NOTO'G'RI namuna: bu gap emas. To'g'ri
     namunaning shakli: to'liq gap, faqat BITTA so'z shakli bilan farq qiladi
     ("❌ Я звоню мама → ✅ Я звоню маме"). Xato o'zbek tilidan kelib chiqadigan turdan bo'lsin: qo'shimcha
     tushib qolishi, jins aralashtirilishi, so'z tartibi.
     Tuzilishi: "notogri" — noto'g'ri gap, "togri" — to'g'risi, "izoh" — nega
     shunday (1-2 gap, o'zbekcha).
     Shakl namunasi (mazmunini KO'CHIRMA): { "notogri": "…", "togri": "…", "izoh": "…" }
  "misollar" — 2-3 ta ruscha misol, har birida o'zbekcha tarjimasi.
  "vazifa" — shu bosqichga tegishli VAZIFA berilgan bo'lsa, uni tahlil qil:
     "savol" (vazifa matni), "javob" (to'g'ri javob), "izoh" (nega shunday).
     Tegishli vazifa bo'lmasa null. MOSLASHTIRISH vazifasida yagona to'g'ri
     javob yo'q — "javob" ga to'g'ri juftliklarni to'liq yozib chiq
     ("tegma! — не трогай!; olma! — не бери!"), "izoh" da nega mos kelishini ayt.
     Vazifa berilgan bosqichda "vazifa" ni HECH QACHON bo'sh qoldirma.

DARS DARAJASIDA:
- "kalitSavol" — yuqorida aytilgan kalit savol (qisqa, tarjimasi bilan).
- "savollar" — dars oxirida ustoz OG'ZAKI beradigan 5 ta savol. O'zbekcha,
  qisqa, mavzuga oid; o'quvchi gapirib javob beradi.
- "nazorat" — tushunganini tekshiruvchi 1 ta savol, 4 ta variant.
- "xulosa" — 30-50 so'z va OXIRIDA o'quvchi endi ayta oladigan aniq RUSCHA gap.
  O'sha gap SHU DARSDA ishlatilgan misollardan biri bo'lishi SHART — yangi yoki
  boshqa mavzudagi gap yozma. Ko'rinishi: "Bugun siz shuni ayta olasiz: <gap>".

VAZIFA TAHLILI QOIDASI:
- Vazifaning javobini O'ZGARTIRMA. Berilgan to'g'ri javobni asos qilib ol va
  nega u to'g'ri ekanini tushuntir.
- Javobni shunchaki takrorlama — qaysi qoida ishlaganini ko'rsat.

YAKUNIY TEKSHIRUV (javobni bermasdan oldin o'zingni tekshir):
- Asosiy fikrni bitta gapda aytdimmi?
- O'zbek tili bilan solishtiruv bormi?
- Har qoidaga misol bormi?
- Tipik xato aytildimi va nega paydo bo'lishi tushuntirildimi?
- Dars oxirida o'quvchi aytadigan gap aniqmi?
- Bitta darsda faqat bitta mavzu bormi?
- Kalit savol, misollar va yakuniy gap BUGUNGI mavzudanmi (ko'rsatmadagi
  namunadan ko'chirilmaganmi)?
- "xato" haqiqiy xatomi? Shubha bo'lsa null qo'ydimmi?
- Bosqich soni 8 tadan kam emasmi? Kam bo'lsa mavzuni maydalab, qayta tuz.
- Misollar va ustunlarga ikonka qo'yildimi?

JAVOB FORMATI — faqat JSON:
{
  "sarlavha": "...",
  "kalitSavol": "<bugungi mavzuning savoli> — <o'zbekcha tarjimasi>",
  "maqsad": "Dars oxirida o'quvchi nima QILA OLADI — aniq, bir gap",
  "bosqichlar": [
    { "sarlavha": "...", "tushuntirish": "...", "qoida": "...",
      "taqqoslash": { "savol": "...", "ustunlar": [{ "bosh": "...", "satrlar": ["..."], "ikonka": "erkak" }] },
      "ayrilish": { "soz": "...", "tarmoqlar": [{ "soz": "...", "izoh": "...", "ikonka": "erkak" }] },
      "tenglama": { "qatorlar": [{ "nom": "...", "bloklar": [{ "matn": "...", "tur": "urgu" }] }] },
      "nishonlar": [{ "kim": "...", "izoh": "...", "togri": "...", "notogri": "...", "ikonka": "boshliq" }],
      "xato": { "notogri": "...", "togri": "...", "izoh": "..." },
      "xatolar": [{ "notogri": "...", "togri": "..." }],
      "misollar": [{ "ru": "<bugungi mavzudagi ruscha gap>", "uz": "<tarjimasi>", "ikonka": "quruvchi" }],
      "vazifa": { "savol": "...", "javob": "...", "izoh": "..." } }
  ],
  "savollar": ["...", "...", "...", "...", "..."],
  "nazorat": { "savol": "...", "variantlar": ["...","...","...","..."], "togriIndex": 0, "izoh": "..." },
  "xulosa": "..."
}`;

  const vazifaBlok = vazifalar.length
    ? `\nKUNNING VAZIFALARI (dars aynan shularga tayyorlashi kerak):\n${vazifalar
        .map((v, i) => {
          const tur =
            v.tur === 'test' ? 'TEST' : v.tur === 'gap' ? 'GAP TUZISH' : 'MOSLASHTIRISH';
          const variantlar = v.variantlar?.length
            ? `\n   variantlar: ${v.variantlar.join(' | ')}`
            : '';
          const javob = v.javob ? `\n   to'g'ri javob: ${v.javob}` : '';
          return `${i + 1}. [${tur}] ${v.savol}${variantlar}${javob}`;
        })
        .join('\n')}\n`
    : '';

  /*
   * KUN TURI — har 7-kun takrorlash (kunlik rejaning o'z tartibi).
   * Model uchun muhim: takrorlash kunida yangi qoida ochilmaydi, avval
   * o'rganilgani mustahkamlanadi.
   */
  const kunTuri = p.kun && p.kun % 7 === 0 ? 'takrorlash' : 'yangi mavzu';

  const user = `Kun: ${p.kun ?? '—'}
Mavzu: ${p.mavzu}
Kun turi: ${kunTuri}
${p.nazariya ? `\nKUNNING NAZARIYA MATNI (shu materialga tayan, undan chetga chiqma):\n"""${p.nazariya.slice(0, 2500)}"""\n` : ''}${vazifaBlok}
Shu mavzu va vazifalar bo'yicha doskada o'tiladigan to'liq dars tayyorla.`;

  /** Bitta bosqich obyektini xavfsiz shaklga keltiradi. */
  const bosqichOqi = (b: unknown): DoskaBosqich | null => {
    if (!b || typeof b !== 'object') return null;
    const r = b as Record<string, unknown>;
    const tushuntirish = str(r.tushuntirish, 900);
    if (!tushuntirish) return null;

    // Vazifa tahlili — savol va javob ikkalasi ham bo'lsagina ko'rsatiladi.
    const v = r.vazifa && typeof r.vazifa === 'object' ? (r.vazifa as Record<string, unknown>) : null;
    const vSavol = v ? str(v.savol, 400) : '';
    const vJavob = v ? str(v.javob, 300) : '';
    const vIzoh = v ? str(v.izoh, 500) : '';

    /*
     * BIR BOSQICHDA BITTA MAKET.
     *
     * Model ba'zan taqqoslash va ayrilishni birga qaytaradi — doskada esa
     * ular bir xil juftlikni ikki marta chizadi (1-kunda aynan shu tartibsizlik
     * chiqqan edi). Shuning uchun ustunlik tartibi qat'iy: ayrilish -> tenglama
     * -> nishonlar -> taqqoslash; birinchi topilgani qoladi, qolgani tashlanadi.
     */
    const ayrilish = toAyrilish(r.ayrilish);
    const tenglama = ayrilish ? null : toTenglama(r.tenglama);
    const nishonlar = ayrilish || tenglama ? undefined : toNishonlar(r.nishonlar);
    const taqqoslash = ayrilish || tenglama || nishonlar ? null : toTaqqoslash(r.taqqoslash);

    // Bitta xato yetarli bo'lsa ro'yxat ortiqcha — ikkalasi birga chizilmaydi.
    const xato = toXato(r.xato);
    const xatolar = xato ? undefined : toXatolar(r.xatolar);

    return {
      sarlavha: str(r.sarlavha, 120) || 'Bosqich',
      tushuntirish,
      qoida: str(r.qoida, 300),
      taqqoslash,
      ayrilish,
      tenglama,
      nishonlar,
      xato,
      xatolar,
      misollar: toMisollar(r.misollar).map((m) => ({
        ...m,
        ikonka: m.ikonka ?? ikonkaTop(m.ru, m.uz),
      })),
      // Javob SHART emas: moslashtirish vazifasida yagona "to'g'ri javob"
      // bo'lmaydi, tahlil izohda beriladi. Faqat savol ham, javob ham, izoh
      // ham bo'lmasa vazifa tahlili hisoblanmaydi.
      vazifa:
        vSavol && (vJavob || vIzoh)
          ? { savol: vSavol, javob: vJavob, izoh: vIzoh }
          : null,
    };
  };

  // Bosqich soni vazifalar soniga bog'liq, shuning uchun joy ham shunga qarab
  // ajratiladi. Qat'iy 2200 token 4-5 bosqichga yetmay, model matn o'rtasida
  // kesilardi va oxirgi vazifalar tahlilsiz qolardi.
  const maxTokens = Math.min(9500, 3200 + 720 * (vazifalar.length + 1));

  const raw = await askJson<Record<string, unknown>>({
    system,
    user,
    temperature: 0.5,
    maxTokens,
  });

  const bosqichlar: DoskaBosqich[] = (Array.isArray(raw.bosqichlar) ? raw.bosqichlar : [])
    .map(bosqichOqi)
    .filter((b): b is DoskaBosqich => b !== null)
    /*
     * Dars endi SLAYDLAR ketma-ketligi (8-12 ta), shuning uchun chegara ham
     * kengaydi: kirish, farq, misollar, mashq, vaziyatlar, har vazifaga
     * bittadan va yakun. Ortig'i kesiladi — model ba'zan cho'zib yuboradi.
     */
    .slice(0, Math.max(12, vazifalar.length + 3));

  if (bosqichlar.length === 0) {
    const err = new Error("Ustoz darsni tayyorlay olmadi, qaytadan urinib ko'ring");
    (err as { status?: number }).status = 502;
    throw err;
  }

  // ---------------------------------------------------------------------------
  // VAZIFA QAMROVI — kod bilan kafolatlanadi.
  //
  // Promptda "har bir vazifa tahlil qilinsin" deb yozilgan bo'lsa ham, model
  // ba'zan 4 ta vazifadan bittasinigina oladi. O'quvchi esa doskadan chiqib
  // aynan o'sha tashlab ketilgan mashqni ishlaydi — ya'ni tushuntirilmagan
  // topshiriqqa duch keladi. Shuning uchun qamrov tekshiriladi va yetishmagani
  // uchun bitta qo'shimcha so'rov yuboriladi.
  // ---------------------------------------------------------------------------
  const kalit = (s: string) =>
    s
      .toLowerCase()
      .replace(/[«»"'`.,!?:;()\-—–]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const qoplangan = (vazifa: DoskaVazifa): boolean =>
    bosqichlar.some((b) => {
      if (!b.vazifa) return false;
      const a = kalit(b.vazifa.savol);
      const c = kalit(vazifa.savol);
      if (!a || !c) return false;
      if (a.includes(c) || c.includes(a)) return true;
      // Model savolni qayta yozgan bo'lishi mumkin — so'zlar ustma-ustligiga qaraymiz.
      const aSet = new Set(a.split(' ').filter((w) => w.length > 2));
      const cWords = c.split(' ').filter((w) => w.length > 2);
      if (!cWords.length) return false;
      const umumiy = cWords.filter((w) => aSet.has(w)).length;
      return umumiy / cWords.length >= 0.6;
    });

  const qolgan = vazifalar.filter((v) => !qoplangan(v));

  if (qolgan.length > 0) {
    try {
      const qoshimcha = await askJson<Record<string, unknown>>({
        system,
        user: `KUN MAVZUSI: "${p.mavzu}"

Quyidagi vazifalar dars davomida TAHLIL QILINMAY QOLDI. Aynan shu ${qolgan.length} ta
vazifa uchun bittadan bosqich yoz — boshqa hech narsa qo'shma.

${qolgan
  .map((v, i) => {
    const tur = v.tur === 'test' ? 'TEST' : v.tur === 'gap' ? 'GAP TUZISH' : 'MOSLASHTIRISH';
    const variantlar = v.variantlar?.length ? `\n   variantlar: ${v.variantlar.join(' | ')}` : '';
    const javob = v.javob ? `\n   to'g'ri javob: ${v.javob}` : '';
    return `${i + 1}. [${tur}] ${v.savol}${variantlar}${javob}`;
  })
  .join('\n')}

MOSLASHTIRISH vazifasida "javob" ga to'g'ri juftliklarni to'liq yozib chiq,
"izoh" da esa nega shunday mos kelishini tushuntir — bo'sh qoldirma.

Faqat shu JSON'ni qaytar:
{ "bosqichlar": [ { "sarlavha": "...", "tushuntirish": "...", "qoida": "...",
  "misollar": [{ "ru": "...", "uz": "..." }],
  "vazifa": { "savol": "...", "javob": "...", "izoh": "..." } } ] }`,
        temperature: 0.4,
        maxTokens: Math.min(4000, 600 + 720 * qolgan.length),
      });

      const qoshimchaBosqichlar = (Array.isArray(qoshimcha.bosqichlar) ? qoshimcha.bosqichlar : [])
        .map(bosqichOqi)
        .filter((b): b is DoskaBosqich => b !== null && b.vazifa !== null)
        .slice(0, qolgan.length);

      bosqichlar.push(...qoshimchaBosqichlar);
    } catch (err) {
      // Qo'shimcha so'rov ixtiyoriy: u ishlamasa ham dars o'tiladi, shunchaki
      // ba'zi vazifalar tahlilsiz qoladi.
      console.error('[doska] vazifa qamrovini to\'ldirib bo\'lmadi:', (err as Error).message);
    }
  }

  const nazorat = toSavol(raw.nazorat);

  // Og'zaki savollar: ko'rsatmada kamida beshta so'ralgan.
  const savollar = Array.isArray(raw.savollar)
    ? raw.savollar.map((q) => str(q, 250)).filter(Boolean).slice(0, 5)
    : [];

  return {
    // Sarlavha modeldan OLINMAYDI: u ba'zan ruscha nomni lotinga o'girib
    // yuboradi ("кем? чем?" -> "kem? chem?"). Mavzu nomi bizda aniq bor.
    sarlavha: p.mavzu,
    kalitSavol: str(raw.kalitSavol, 120),
    maqsad: str(raw.maqsad, 300),
    bosqichlar,
    savollar,
    nazorat: nazorat ? { ...nazorat } : null,
    xulosa: str(raw.xulosa, 500),
  };
}

/* ------------------------------------------------------------------ *
 *  2. Dars davomidagi savol
 * ------------------------------------------------------------------ */

/**
 * Savolda rus tiliga oid belgi bormi.
 *
 * Kirill harflari yoki grammatik atamalar — o'quvchi rus tili haqida
 * so'rayotganining ishonchli alomati.
 */
function ruscha_belgisi(savol: string): boolean {
  if (/[а-яё]/i.test(savol)) return true;
  const atamalar = [
    'rus til', 'russk', 'grammatika', 'kelishik', 'fe\'l', 'fel ', 'zamon',
    'olmosh', 'predlog', 'qo\'shimcha', 'so\'z', 'gap tuz', 'harf', 'talaffuz',
    'tarjima', 'rod', 'jins', 'ko\'plik', 'birlik', 'sifat', 'son ',
  ];
  const past = savol.toLowerCase();
  return atamalar.some((a) => past.includes(a));
}

export async function answerQuestion(p: {
  savol: string;
  mavzu: string;
  bosqich?: string;
}): Promise<DoskaJavob> {
  const system = `Sen FalaRus rus tili ustozisan. O'quvchi dars o'rtasida qo'l ko'tarib savol berdi.

${TIL_QOIDASI}

${MAVZU_QOIDASI}

QOIDALAR:
- Qisqa javob ber: 40-80 so'z. Darsni cho'zma.
- Kerak bo'lsa 1-2 ta ruscha misol qo'sh (tarjimasi bilan).

JAVOB FORMATI — faqat JSON:
{ "turi": "mavzu" | "rus_boshqa" | "begona",
  "javob": "...",
  "misollar": [{ "ru": "...", "uz": "..." }] }

"turi" ni to'g'ri belgila: "mavzu" — savol bugungi mavzuga oid;
"rus_boshqa" — rus tiliga oid, lekin boshqa mavzu; "begona" — rus tiliga
umuman aloqasiz.`;

  const user = `DARS MAVZUSI: "${p.mavzu}"${p.bosqich ? `\nHOZIRGI BOSQICH: "${p.bosqich}"` : ''}

O'QUVCHINING SAVOLI:
"""${p.savol.slice(0, 500)}"""

TURINI ANIQLASH (diqqat, bu joyda ko'p adashiladi):
- "mavzu"      — savol AYNAN "${p.mavzu}" haqida.
- "rus_boshqa" — savol RUS TILI yoki uning grammatikasi haqida, lekin
                 "${p.mavzu}" ga kirmaydi. Masalan fe'l zamonlari,
                 kelishiklar, sonlar, predloglar — agar ular bugungi mavzu
                 bo'lmasa, bu "rus_boshqa". Bu BEGONA EMAS.
- "begona"     — savolning rus tiliga umuman aloqasi yo'q: ob-havo, sport,
                 siyosat, matematika, shaxsiy savollar, dastur haqidagi
                 savollar.`;

  const raw = await askJson<Record<string, unknown>>({
    system,
    user,
    temperature: 0.4,
    maxTokens: 700,
  });

  // Begona savolga javobni MODELGA qoldirmaymiz.
  //
  // Promptda taqiqlangan bo'lsa ham, model ba'zan "qisqacha" deb ob-havo yoki
  // matematika haqida gapirib ketadi. Model savolni o'zi "begona" deb
  // belgilagan ekan, javob matni shu yerda almashtiriladi — chetga chiqish
  // mumkin bo'lmagan holga keladi va ortiqcha token ham sarflanmaydi.
  let turi = str(raw.turi, 20).toLowerCase();

  // NOTO'G'RI RAD ETISHGA QARSHI HIMOYA.
  //
  // Model ba'zan haqiqiy rus tili savolini ("fe'llarning o'tgan zamoni
  // qanday yasaladi?") "begona" deb belgilab, o'quvchini rad etib qo'yadi.
  // Bu eng yomon xato: o'quvchi o'rinli savol bergan. Savolda rus tiliga
  // yoki grammatikaga oid belgi bo'lsa, tasnif yumshatiladi.
  if (turi === 'begona' && ruscha_belgisi(p.savol)) turi = 'rus_boshqa';

  // Rus tiliga oid, lekin boshqa mavzudagi savol — javob QISQARTIRILADI.
  //
  // Promptda "cho'zma" deyilgan bo'lsa ham, model ba'zan butun bir mavzuni
  // yoyib tashlaydi (masalan oltita kelishikni sanab chiqadi). Bu o'quvchini
  // bugungi materialdan chalg'itadi, shuning uchun ikki gapdan ortig'i
  // kesiladi va mavzuga qaytarish jumlasi qo'shiladi.
  if (turi === 'rus_boshqa') {
    const toliq = str(raw.javob, 900);
    const gaplar = toliq.match(/[^.!?]+[.!?]+/g) ?? [toliq];
    const qisqa = gaplar.slice(0, 2).join(' ').trim() || toliq.slice(0, 220);
    return {
      javob: `${qisqa} Buni keyingi darslarda batafsil ko'ramiz — hozir `
        + `mavzumizga qaytamiz.`,
      misollar: [],
    };
  }

  if (turi === 'begona') {
    /*
     * Rad etish CHEKLOV sifatida yozilmaydi.
     *
     * Ilgari bu yerda "Bu savol rus tili darsiga tegishli emas" deb yozilardi
     * — o'quvchi buni tanbeh deb qabul qiladi va ustoz o'z qoidalarini o'qib
     * berayotgandek eshitiladi. Endi shunchaki mavzuga taklif qilinadi.
     */
    return {
      javob: `Keling, bugungi mavzuga qaytamiz: "${p.mavzu}". `
        + `Shu mavzu bo'yicha savolingiz bo'lsa, bemalol so'rang.`,
      misollar: [],
    };
  }

  const javob = str(raw.javob, 900);
  if (!javob) {
    const err = new Error("Ustoz javob bermadi, qaytadan urinib ko'ring");
    (err as { status?: number }).status = 502;
    throw err;
  }
  return { javob, misollar: toMisollar(raw.misollar, 3) };
}

/* ------------------------------------------------------------------ *
 *  3. Og'zaki javobni baholash (doskadagi suhbat)
 * ------------------------------------------------------------------ */

export async function evaluateAnswer(p: {
  savol: string;
  javob: string;
  mavzu: string;
}): Promise<DoskaBaho> {
  const system = `Sen FalaRus rus tili ustozisan. O'quvchi savolingga OG'ZAKI javob berdi.
Javob matni nutqdan yozib olingan, shuning uchun kichik imlo va tinish xatolariga
e'tibor berma — MAZMUN muhim.

${TIL_QOIDASI}

BAHOLASH:
- "togri"  — mazmunan to'g'ri (kichik nuqsonlar bo'lsa ham).
- "qisman" — qisman to'g'ri yoki yetarli emas.
- "xato"   — noto'g'ri yoki mavzuga aloqasiz.

QOIDALAR:
- "izoh" — ustozning OG'ZAKI javobi: 25-50 so'z, iliq va rag'batlantiruvchi.
  To'g'ri bo'lsa maqta va bir jumla qo'shimcha ma'lumot ber; xato bo'lsa
  yumshoq to'g'rila va to'g'risini ayt.
- "namuna" — savolning to'liq, namunali javobi (bir-ikki gap).

JAVOB FORMATI — faqat JSON:
{ "baho": "togri", "izoh": "...", "namuna": "..." }`;

  const user = `MAVZU: "${p.mavzu}"
USTOZNING SAVOLI: "${p.savol}"

O'QUVCHINING OG'ZAKI JAVOBI:
"""${p.javob.slice(0, 600)}"""`;

  const raw = await askJson<Record<string, unknown>>({
    system,
    user,
    temperature: 0.3,
    maxTokens: 600,
  });

  const b = String(raw.baho ?? '').trim();
  return {
    baho: b === 'togri' || b === 'qisman' || b === 'xato' ? b : 'qisman',
    izoh: str(raw.izoh, 700) || 'Javobingiz qabul qilindi.',
    namuna: str(raw.namuna, 400),
  };
}

/* ------------------------------------------------------------------ *
 *  4. Qo'shimcha grammatika mashqi
 * ------------------------------------------------------------------ */

export async function buildExercise(p: {
  mavzu: string;
  nazariya?: string;
  soni?: number;
}): Promise<DoskaMashq> {
  const soni = Math.min(Math.max(Number(p.soni) || 5, 3), 8);
  // Sifatsiz savollar (javobi savolning o'zida ko'rinib turgani) suzib
  // tashlanadi, shuning uchun zaxira bilan so'raymiz — aks holda o'quvchiga
  // so'ralgandan kam savol yetib borardi.
  const soraladi = soni + 3;

  const system = `Sen FalaRus rus tili ustozisan. Mavzu bo'yicha mashq tuzasan.

${TIL_QOIDASI}

${MAVZU_QOIDASI}

QOIDALAR:
- Barcha savollar AYNAN shu mavzuni tekshirsin. Boshqa mavzudagi savol qo'shma.
- ${soraladi} ta ko'p tanlovli savol. Har birida AYNAN 4 ta variant.
- "savol" HAR DOIM ikki qismdan iborat: avval o'zbekcha TOPSHIRIQ, keyin ruscha
  material. Masalan: "Bo'sh joyga mos so'zni tanlang: ___ студент." yoki
  "Bu savolga to'g'ri javobni tanlang: Ты студент?"
  Yolg'iz ruscha gapni savol qilib qo'yma — o'quvchi nima qilishini bilmaydi.
- Faqat BITTA variant to'g'ri bo'lsin, qolgan uchtasi ishonarli, lekin aniq
  noto'g'ri bo'lsin. To'g'ri javob savolga mantiqan mos kelishi SHART.
- Bo'shliqli savolda to'g'ri javob gapning QOLGAN QISMIDA takrorlanmasin:
  "____ ты" NOTO'G'RI (javob savolda ko'rinib turibdi). To'g'ri namuna:
  "____ студент." — javob "я". Bo'shliqsiz gap to'liq va mazmunli bo'lsin.
- Har savolda "izoh" — nega shu variant to'g'ri ekani (o'zbekcha, 1-2 gap).
- Savollar bir xil bo'lmasin: turli shakl va holatlarni qamrasin.

JAVOB FORMATI — faqat JSON:
{ "sarlavha": "...", "savollar": [
  { "savol": "...", "variantlar": ["...","...","...","..."], "togriIndex": 0, "izoh": "..." } ] }`;

  const user = `MAVZU: "${p.mavzu}"
${p.nazariya ? `\nNAZARIYA:\n"""${p.nazariya.slice(0, 1800)}"""` : ''}

Shu mavzu bo'yicha ${soraladi} ta mashq savoli tuz.`;

  const raw = await askJson<Record<string, unknown>>({
    system,
    user,
    temperature: 0.6,
    maxTokens: 1800 + 260 * soraladi,
  });

  const barchasi = Array.isArray(raw.savollar)
    ? raw.savollar.map(toSavol).filter((s): s is DoskaMashqSavol => s !== null).slice(0, soraladi)
    : [];

  // Model ba'zan javobni savolning o'ziga qo'shib yuboradi ("____ ты", javob
  // "ты") — bunday savol o'quvchini tekshirmaydi. Promptda taqiqlangan, ammo
  // kafolat sifatida shu yerda ham suziladi. Hammasi tushib qolsa, bor
  // savollar qoldiriladi: mashq umuman ochilmagandan ko'ra yaxshiroq.
  const sof = barchasi.filter((q) => {
    const togri = q.variantlar[q.togriIndex];
    if (!togri) return false;
    const gap = q.savol.toLowerCase();
    const javob = togri.toLowerCase().trim();
    // Faqat qisqa, bir so'zli javoblarda tekshiramiz: uzun javob (to'liq gap)
    // savol matnida uchrashi tabiiy emas, qisqasi esa tasodifan mos kelishi mumkin.
    if (javob.split(/\s+/).length > 2) return true;
    return !new RegExp(`(^|[^\\p{L}])${javob.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\p{L}]|$)`, 'u').test(gap);
  });

  const savollar = (sof.length ? sof : barchasi).slice(0, soni);

  if (savollar.length === 0) {
    const err = new Error("Mashq tayyorlanmadi, qaytadan urinib ko'ring");
    (err as { status?: number }).status = 502;
    throw err;
  }

  return { sarlavha: str(raw.sarlavha, 160) || p.mavzu, savollar };
}
