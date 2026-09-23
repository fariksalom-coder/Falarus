/**
 * tts.service.ts — so'zni ovoz bilan o'qib berish (matn -> nutq).
 *
 * FAQAT QISQA MATN uchun: lug'at kartochkasidagi so'z yoki doskadagi bir bo'lak.
 * Uzun matnlarni ovozlashtirish oldingi loyihada qimmatga tushgan va sifat
 * muammosi bergan, shuning uchun bu yerda uzunlik qat'iy cheklangan.
 *
 * XARAJATNI USHLAB TURUVCHI ASOSIY MEXANIZM — DISKDAGI KESH:
 * har so'z bir marta generatsiya qilinadi va `uploads/tts-cache/` ga yoziladi.
 * Ikkinchi marta so'ralganda API'ga umuman borilmaydi (0 xarajat, ~1ms javob).
 * `uploads/` deploy paytida rsync'dan chiqarilgan — kesh yangilanishlardan omon
 * qoladi va serverga ko'chirilmaydi.
 *
 * IKKI OVOZ MANBASI:
 *  - Gemini native audio — doskadagi ustoz ovozi. Tirik, jonli intonatsiya
 *    beradi va ohangni matn bilan boshqarish mumkin.
 *  - OpenAI — lug'at kartochkalari va Gemini ishlamay qolgandagi zaxira.
 */
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { createHash } from 'crypto';
import { WebSocket } from 'ws';

/*
 * SO'Z OVOZI — `gpt-4o-mini-tts` + `alloy`.
 *
 * NEGA ALMASHTIRILDI: eski `tts-1` + `nova` yakka ruscha so'zni ishonchsiz
 * o'qirdi. Kontekstsiz bitta so'z modelga juda kam ma'lumot beradi va u
 * so'zni O'YLAB TOPARDI. 2026-09-01 da o'lchandi (bazadan 24 ta tasodifiy
 * so'z, ovoz Whisper bilan qaytadan matnga aylantirildi):
 *
 *     tts-1 / nova / 0.7            -> 12/24 to'g'ri
 *     gpt-4o-mini-tts / nova        -> 19/24 to'g'ri
 *
 * Eski ovozdagi xatolar shunchaki urg'u emas, BOSHQA SO'Z edi:
 * «работе» -> «Вау», «строитель» -> «Стрейчель», «зовут» -> «ЗАВОД»,
 * «приятно» -> «Приятного аппетита!». O'quvchi noto'g'ri talaffuzni
 * yodlab qolardi — bu esa talaffuz yo'qligidan ham yomon.
 *
 * `gpt-4o-mini-tts` ning asosiy afzalligi — `instructions` maydoni: modelga
 * matn QAYSI TILDA ekanini va uni o'ylab topmaslik kerakligini aytish
 * mumkin (pastda `RU_KORSATMA`).
 */
const MODEL = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';
/*
 * OVOZ — `nova`, ya'ni yosh qiz ovozi. O'quvchilarga tanish (eski `tts-1`
 * da ham shu ovoz edi) va o'lchovda ham eng aniq chiqdi. 16 ta so'zda
 * qiz ovozlari solishtirildi:
 *
 *     nova 13/16 · coral 12/16 · alloy 11/16 · sage 10/16 · shimmer 9/16
 *
 * (nova'ning uchta "xatosi" — Whisper'ning o'zi: «тридцать» ni «30» deb,
 * «соседей» ni «Соседи» deb yozgan.)
 */
const VOICE = process.env.OPENAI_TTS_VOICE || 'nova';

/**
 * Yakka so'z uchun ko'rsatma.
 *
 * Ikki narsa aytiladi:
 *  1. matn RUSCHA (aks holda model lotin/ingliz tovushlariga o'tib ketadi);
 *  2. AYNAN yozilganini o'qi — tarjima qilma, gapni davom ettirma
 *     («приятно» dan «Приятного аппетита!» aynan shundan chiqqan).
 *
 * "SLOWLY" DEYILMAYDI. Avval aytilgan edi va natija ikki tomondan yomon
 * bo'ldi: ovoz cho'zilib g'ayritabiiy eshitildi, ustiga aniqlik ham
 * tushdi (nova: sekin ko'rsatma bilan 5/8, tabiiy ko'rsatma bilan 13/16).
 * Tezlikni ilovaning `speed` parametri boshqaradi — ohang emas.
 */
const RU_KORSATMA =
  'You are a native Russian speaker. Read the given Russian word or phrase ' +
  'clearly and naturally, with correct Russian stress, exactly as written. ' +
  'Do not translate it, do not add any other words, and do not complete the ' +
  'phrase — read only what is written.';

/**
 * `gpt-4o-mini-tts` UCHUN ENG PAST TEZLIK.
 *
 * Bu model `tts-1` dan tabiiy holda ancha bosiq gapiradi: bir xil so'z
 * `tts-1` da 1.0 tezlikda 0.8 soniya, bu modelda 2.1 soniya. Ilovadagi
 * eski qiymatlar (0.7-0.8) `tts-1` ga qarab tanlangan edi va bu modelda
 * so'zni cho'zib, "hunuk" qilib yuboradi.
 *
 * Shuning uchun quyi chegara: chaqiruvchi qanchalik past so'ramasin,
 * 0.9 dan sekin o'qilmaydi. Yuqori chegara o'zgarmaydi — kimdir tezroq
 * so'rasa, o'shanday bo'ladi.
 */
const SOZ_ENG_PAST_TEZLIK = 0.9;

/**
 * Ko'rsatma matni o'zgarsa shu raqam ham oshirilsin: u kesh kalitiga kiradi,
 * aks holda eski ovoz yangi ko'rsatma o'rniga qaytaverardi.
 */
const SOZ_KORSATMA_VERSIYA = 'ru2';

/** Kirill harfi bormi — ko'rsatma faqat ruscha matnga qo'yiladi. */
function kirillmi(text: string): boolean {
  return /[А-Яа-яЁё]/.test(text);
}
/** 1.0 dan past — sekinroq va aniqroq (o'quvchi talaffuzni ilg'ab olsin). */
const SPEED = Number(process.env.OPENAI_TTS_SPEED || 0.85);
const MAX_CHARS = 200;
const TIMEOUT_MS = 20_000;
/**
 * SPEECHIFY UCHUN QISQA CHEGARA.
 *
 * 190 belgilik bo'lak sog'lom holatda 1-3 soniyada qaytadi. 20 soniya kutish
 * esa qimmatga tushardi: biz uzilib ketamiz, LEKIN Speechify tomonida so'rov
 * ishlab turaveradi va tarifdagi yagona ulanish o'rni band qoladi — keyingi
 * bo'lak darhol `concurrency_limit_reached` oladi. Ya'ni bitta kechikish
 * zanjirni buzib, butun darsni sekinlashtirardi.
 */
const SPEECHIFY_TIMEOUT_MS = Number(process.env.SPEECHIFY_TIMEOUT_MS || 8_000);
/**
 * Live ovozni REAL VAQT tezligida oqizadi: ovoz necha soniya jaranglasa,
 * kelishi ham shuncha vaqt oladi. 190 belgilik bo'lak ~9 soniya ovoz beradi,
 * ya'ni so'rov ~10-12 soniyada tugaydi (prodda o'lchandi: 10.1s).
 *
 * SHUNING UCHUN CHEGARA 8 SONIYA BO'LMASLIGI KERAK. 8 soniyada har bir
 * sog'lom so'rov ham uzilardi — loglarda 40 marta ketma-ket "vaqt tugadi"
 * chiqib, o'zbekcha tushuntirish OpenAI zaxirasiga tushardi. OpenAI esa
 * lotin yozuvidagi o'zbekchani inglizcha tovushlar bilan o'qiydi: o'quvchi
 * aynan shuni "robot ovoz, tushunib bo'lmaydi" deb eshitgan.
 *
 * 30 soniya sog'lom sessiya uchun keng zaxira. Nosozlikda uzoq kutilmaydi:
 * uch marta ketma-ket xatodan keyin manba 10 daqiqaga uxlatiladi (pastda).
 */
const LIVE_TIMEOUT_MS = Number(process.env.TTS_LIVE_TIMEOUT_MS || 30_000);

/**
 * OPENAI OVOZ PROFILLARI.
 *
 * `sozlar` — lug'at kartochkalari va o'qish matnidagi yakka so'zlar.
 * DIQQAT: kesh kaliti model, ovoz va ko'rsatma versiyasidan tuziladi. Bu
 * qiymatlarni o'zgartirish keshlangan minglab so'zni bekor qiladi va ular
 * qaytadan (pul evaziga) generatsiya qilinadi — shuning uchun faqat sifat
 * o'lchab isbotlanganda o'zgartiring.
 *
 * `ustoz` — doskadagi dars ovozi: `tts-1-hd` + `nova`, ya'ni yosh qiz ovozi.
 * `tts-1` ning HD varianti sifatliroq (narxi ikki barobar, lekin kesh tufayli
 * har matn bir marta generatsiya qilinadi). `instructions` maydoni bu modelda
 * ishlamaydi — ohang ovozning o'zidan va tezlikdan chiqadi, shuning uchun
 * yuborilmaydi ham.
 */
const OHANGLAR = {
  sozlar: { model: MODEL, voice: VOICE, instructions: RU_KORSATMA },
  ustoz: {
    model: process.env.OPENAI_TTS_USTOZ_MODEL || 'tts-1-hd',
    voice: process.env.OPENAI_TTS_USTOZ_VOICE || 'nova',
    instructions: '',
  },
} as const;

export type TtsOhang = keyof typeof OHANGLAR;

/**
 * DOSKA OVOZI — Gemini LIVE API orqali.
 *
 * Nima uchun Live, TTS modeli emas: doskadagi jonli savol-javob ham Live
 * orqali ishlaydi va o'sha yerda ovoz `GEMINI_LIVE_VOICE` bilan belgilanadi.
 * Agar tushuntirish boshqa vosita bilan o'qilsa, o'quvchi bitta darsda ikki
 * xil ovoz eshitardi. Bundan tashqari `gemini-2.5-flash-preview-tts` ning
 * bepul chegarasi kuniga atigi 10 ta so'rov — bitta darsga ham yetmaydi,
 * Live'niki esa sessiya bo'yicha hisoblanadi va yetarli.
 *
 * Live matnni o'ylab javob bermasligi uchun unga qat'iy ko'rsatma beriladi:
 * u shunchaki matnni aynan o'qiydi.
 *
 * Ovozni almashtirish: `.env` da `GEMINI_LIVE_VOICE=...` (jonli suhbat bilan
 * BIR XIL bo'lishi uchun ikkalasi shu bitta o'zgaruvchidan oladi).
 * Yosh va jonli: Leda, Aoede, Zephyr, Laomedeia. Boshqacha: Achernar, Sulafat.
 */
const LIVE_TTS = {
  model: process.env.GEMINI_LIVE_MODEL || 'gemini-3.8-live',
  voice: process.env.GEMINI_LIVE_VOICE || 'Leda',
  korsatma:
    "Sen ovoz chiqaruvchi vositasan (text-to-speech). Foydalanuvchi bergan " +
    "matnni AYNAN o'sha holicha ovoz bilan o'qib berasan. Hech narsa " +
    "qo'shmaysan, hech narsani tushirib qoldirmaysan, savolga javob " +
    "bermaysan, izoh bermaysan. Faqat matnni o'qiysan.\n" +
    /*
     * OHANG — foydalanuvchi «hayajon bilan gapirmayapti» dedi (2026-08-30).
     * Ilgari ko'rsatma «tetik va tiniq, lekin shoshmasdan» edi — model buni
     * mo''tadil, deyarli tekis o'qish deb tushunardi. Endi jonlilik ATAYLAB
     * so'raladi, lekin «shoshmasdan» saqlanadi: o'quvchi migrant, rus tilini
     * endi o'rganyapti — tez gapirilsa ilgamaydi.
     */
    "OHANG (muhim): sen dars berayotgan JONLI o'qituvchisan, diktor emas. " +
    "Ovozingda qiziqish va hayajon bo'lsin — o'quvchini ergashtirasan. " +
    "Yangi mavzuni yoki qoidani aytganda ovozingni bir oz ko'tar, muhim " +
    "so'zni ajratib ayt, gap oxirida ohangni tabiiy tushir. Bir maromda, " +
    "tekis o'qish TAQIQLANADI — u zerikarli va o'quvchi tinglashni to'xtatadi. " +
    "Shu bilan birga SHOSHMA: o'quvchi rus tilini endi o'rganyapti.\n" +
    "TALAFFUZ QOIDASI (eng muhimi): matn IKKI TILDA keladi. LOTIN yozuvidagi " +
    "qism — O'ZBEK tili, uni o'zbekcha talaffuz qil. KIRILL yozuvidagi qism — " +
    "RUS tili, uni ONA TILI DARAJASIDAGI to'g'ri rus talaffuzi bilan o'qi.\n" +
    /*
     * AYNAN SHU JOYDA XATO BO'LGAN (2026-08-14, foydalanuvchi eshitgan).
     *
     * O'zbekcha gap ichidagi bitta kirill so'z — «... ayol uchun Она» —
     * o'zbekcha, harfma-harf [ona] deb o'qilardi. Sof ruscha gapda esa
     * o'sha so'z to'g'ri, [aná] bo'lib chiqardi. Ya'ni model qisqa kirill
     * so'zni atrofdagi o'zbekchaga "yopishtirib" yuborgan. Umumiy qoida
     * («reduksiya qil») buni to'xtata olmadi — xatoning O'ZINI nomlash va
     * MISOL berish kerak bo'ldi.
     */
    "DIQQAT: kirill so'z o'zbekcha gap ICHIDA kelsa ham baribir RUSCHA " +
    "o'qiladi. Urg'usiz «о» — «а» bo'lib jaranglaydi:\n" +
    "  Она → [анá]  (ASLO o'zbekcha [ona] emas!)\n" +
    "  Они → [анИ],  Оно → [анó],  Москва → [масквá]\n" +
    "  Urg'uli «о» esa saqlanadi: Он → [он], дом → [дом].\n" +
    "«U (ayol) — Она» degan gapda «U (ayol)» o'zbekcha, «Она» esa ruscha " +
    "[анá] bo'lib o'qiladi.\n" +
    "Yana: yumshoq belgini yumshat, so'z oxiridagi jarangli undoshni " +
    "jarangsizlantir («падеж» -> «падеш»). Kirill so'zlarni ASLO harfma-harf " +
    "lotincha o'qima: «винительный падеж» -> «vinitelniy padej» NOTO'G'RI. " +
    "Til almashganda ovoz va ohang o'zgarmaydi.",
} as const;

/**
 * GEMINI'NING ODDIY TTS MODELI — Live'ning ZAXIRASI (o'zbekcha uchun).
 *
 * Nima uchun kerak: o'zbekcha tushuntirishni Live'dan boshqa hech kim
 * to'g'ri o'qimaydi — OpenAI lotin yozuvini inglizcha talaffuz qiladi va
 * gapning yarmini yutib yuboradi, Speechify esa o'zbek tilini bilmaydi va
 * ruscha talaffuz bilan o'qiydi (ikkalasi ham o'lchangan va rad etilgan).
 * Shuning uchun zaxira ham GEMINI bo'lishi kerak, faqat boshqa yo'l bilan:
 * bu model oddiy HTTPS so'rovi, WebSocket sessiyasi yo'q — Live sessiyasi
 * ochilmay qolgan paytda ham ishlayveradi.
 *
 * Ovoz Live bilan BIR XIL (`GEMINI_LIVE_VOICE`), ya'ni zaxiraga o'tilganda
 * o'quvchi ovoz o'zgarganini sezmaydi.
 */
const GEMINI_TTS = {
  model: process.env.GEMINI_TTS_MODEL || 'gemini-3.1-flash-tts-preview',
  voice: process.env.GEMINI_LIVE_VOICE || 'Leda',
};

/**
 * SOF RUSCHA BO'LAK UCHUN ALOHIDA KO'RSATMA (2026-08-14).
 *
 * Muammo: yuqoridagi ko'rsatma «matn IKKI TILDA keladi» deb boshlanadi va
 * modelni har so'zda yozuvni tekshirishga majbur qiladi. Sof ruscha bo'lakda
 * (misollar aynan shunday) bu ortiqcha ikkilanish tug'dirdi — foydalanuvchi
 * «Она» ni [aná] emas, [oná] deb o'qiganini eshitgan, ya'ni model harfma-harf,
 * o'zbekcha o'qigan.
 *
 * Yechim: bo'lak kirillda bo'lsa modelga IKKI TIL haqida umuman aytilmaydi —
 * unga «bu rus tili» deyiladi va reduksiya QOIDA emas, MISOL bilan beriladi.
 * Til modellari qoidadan ko'ra namunaga ancha yaxshi ergashadi.
 */
const RUS_KORSATMA =
  "Sen ovoz chiqaruvchi vositasan (text-to-speech). Matnni AYNAN o'sha holicha " +
  "o'qib berasan: hech narsa qo'shmaysan, tushirmaysan, izohlamaysan.\n" +
  'MATN RUS TILIDA. Uni ONA TILI darajasida, Moskva talaffuzi bilan o\'qi.\n' +
  'ENG MUHIMI — URG\'USIZ «О» «А» BO\'LIB JARANGLAYDI. Namunalar:\n' +
  '  она → [анá]   (ASLO [онá] emas)\n' +
  '  они → [анИ]\n' +
  '  оно → [анó]\n' +
  '  хорошо → [харашó]\n' +
  '  молоко → [малакó]\n' +
  '  Москва → [масквá]\n' +
  'Urg\'uli «о» esa «о» bo\'lib qoladi: он → [он], дом → [дом].\n' +
  'Shuningdek: urg\'usiz «е»/«я» ni [i] ga yaqinlashtir (тебя → [тибя]), ' +
  'so\'z oxiridagi jarangli undoshni jarangsizlantir (друг → [друк], ' +
  'падеж → [падеш]), yumshoq belgini yumshat.\n' +
  'Ohang: yosh, quvnoq va samimiy o\'qituvchi — tetik va tiniq, shoshmasdan.';

/**
 * Live ko'rsatmasi versiyasi — kesh kalitiga kiradi.
 *
 * Ko'rsatma o'zgarganda talaffuz ham o'zgaradi, lekin kesh kaliti faqat model,
 * ovoz va matndan tuzilardi: eski, noto'g'ri talaffuzli yozuvlar diskda qolib,
 * tuzatish umuman eshitilmasdi. Ko'rsatma tahrirlansa shu raqamni oshiring.
 *
 * 3 — ruscha bo'lakka alohida ko'rsatma qo'shildi (yuqoriga qarang).
 * 4 — ARALASH bo'lakdagi kirill so'z o'zbekcha o'qilib ketishi tuzatildi.
 */
const LIVE_KORSATMA_VERSIYA = 4;

const LIVE_UPSTREAM =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

/**
 * SPEECHIFY — ruscha matn uchun.
 *
 * O'lchov natijasi (matnni o'qitib, keyin qayta matnga o'girib solishtirdik):
 *   ruscha gap  — Speechify 100%, Gemini ruscha so'zlarni lotincha o'qiydi;
 *   o'zbekcha   — Speechify ruscha talaffuz bilan o'qiydi (o'zbek tili
 *                 ro'yxatida yo'q), Gemini esa ancha yaqin.
 * Shuning uchun tanlov MATNGA qarab qilinadi: kirill ustun bo'lsa Speechify,
 * aks holda Gemini. Rus tili kursida o'quvchi ruscha namunani to'g'ri
 * talaffuzda eshitishi eng muhimi.
 */
const SPEECHIFY = {
  voice: process.env.SPEECHIFY_VOICE || 'agrippina',
  model: process.env.SPEECHIFY_MODEL || 'simba-multilingual',
};

/**
 * DOSKADA BITTA OVOZ (2026-08-14, foydalanuvchi talabi).
 *
 * Yuqoridagi tanlov TALAFFUZ bo'yicha to'g'ri edi, lekin QULOQQA yomon
 * eshitilardi: ustoz o'zbekcha tushuntirib turib, ruscha misolga yetganda
 * ovoz butunlay boshqa odamga almashardi — o'quvchi buni "boshqa AI gapiryapti"
 * deb bildirgan. Endi doskaning hamma matni bitta ovozda (`Leda`) o'qiladi:
 * Live'ning ko'rsatmasida rus talaffuzi qoidasi batafsil yozilgan (urg'u,
 * «о» reduksiyasi, so'z oxiridagi jarangsizlanish).
 *
 * QAYTARISH: `.env` da `TTS_RUSCHA_SPEECHIFY=1` + `pm2 restart app` — ruscha
 * misollar yana Speechify (`agrippina`) bilan o'qiladi, ya'ni eski, ikki
 * ovozli tartib to'liq tiklanadi. Kod o'chirilmagan, faqat shu bayroqqa
 * bog'langan; Speechify keshi ham diskda turibdi, shuning uchun qaytarish
 * darhol va pulsiz ishlaydi.
 *
 * O'LCHANDI (2026-08-14, prodda): ruscha misollar Live ovozida yozdirilib,
 * qaytadan matnga o'girilgan — «Ты мой друг», «Он инженер», «Она врач, а он
 * учитель», «Кто это? — Это моя сестра» va «винительный падеж» hammasi 100%
 * to'g'ri chiqdi. Ya'ni memory'dagi eski nosozlik (Gemini kirillni lotincha
 * o'qishi: «винительный падеж» -> «vinitelniy padej») endi takrorlanmadi —
 * sabab Live ko'rsatmasidagi batafsil rus talaffuzi qoidasi.
 */
const RUSCHA_SPEECHIFY = process.env.TTS_RUSCHA_SPEECHIFY === '1';

type Manba = 'speechify' | 'live' | 'gtts' | 'openai';

/**
 * Manba ishlamay qolsa vaqtincha chetlab o'tiladi — har so'rovda qayta urinib,
 * darsni kutdirib qo'ymaslik uchun. Kunlik kvota tugagan bo'lsa ham foydali.
 *
 * Nima uchun MUDDATLI: kvota ertasi kuni tiklanadi, tarmoq uzilishi esa bir
 * daqiqada. Agar manba butunlay o'chirilsa, u PM2 qayta ishga tushmaguncha
 * o'chiq qolardi va doska yaxshi ovozga o'z-o'zidan qaytmasdi.
 */
const tinPaytu: Record<Manba, number> = { speechify: 0, live: 0, gtts: 0, openai: 0 };
const tinDavomi: Record<Manba, number> = { speechify: 0, live: 0, gtts: 0, openai: 0 };

/**
 * KETMA-KET XATOLAR — butunlay nosoz manbani uzoqqa uxlatish uchun.
 *
 * Qisqa tin tarmoq uzilishi uchun to'g'ri, lekin manba UMUMAN ishlamay
 * qolganda (kalit eskirgan, kvota tugagan, model nomi noto'g'ri) har ikki
 * daqiqada qaytadan urinish har safar bir bo'lakni kutdirib qo'yadi. Uchta
 * ketma-ket xatodan keyin manba 10 daqiqaga chetlab o'tiladi — dars esa
 * ishlaydigan manbada uzilishsiz davom etadi.
 */
const ketmaKetXato: Record<Manba, number> = { speechify: 0, live: 0, gtts: 0, openai: 0 };
const KETMA_KET_CHEGARA = 3;
const UZOQ_TIN_MS = 10 * 60_000;

const manbaTin = (m: Manba, hozir: number) => hozir - tinPaytu[m] < tinDavomi[m];

/**
 * Xato turiga qarab tin muddatini tanlaydi.
 *
 * Bu ajratish MUHIM: daqiqalik limit (RPM) bir necha soniyada bo'shaydi, ya'ni
 * uzoq tin qo'yilsa bitta gavjum daqiqa tufayli yaxshi ovoz o'nlab daqiqaga
 * o'chib qolardi. Kunlik kvota yoki ruxsat xatosi esa tez orada tuzalmaydi,
 * u yerda tez-tez urinish behuda so'rov.
 */
function tinMuddati(xato: string): number {
  /*
   * BIR VAQTDAGI ULANISH LIMITI — eng qisqa tin.
   *
   * Speechify tarifi bir vaqtda bitta so'rovga ruxsat beradi. Ikki so'rov
   * to'qnashsa xato darhol qaytadi va o'rin o'sha zahoti bo'shaydi, ya'ni bu
   * "kvota tugadi" emas. Ilgari bu holat umumiy 2 daqiqalik tinga tushardi:
   * bitta to'qnashuv tufayli ruscha talaffuzning eng yaxshi manbasi ikki
   * daqiqaga o'chib, ovoz sekin zaxira yo'llarga o'tib ketardi.
   */
  /*
   * BIR VAQTDAGI ULANISH LIMITI.
   *
   * Bu "kvota tugadi" emas: o'rin bo'shashi bilan manba yana ishlaydi. Lekin
   * darhol qayta urinish ham noto'g'ri — o'rinni odatda BIZNING oldingi,
   * vaqti tugab uzilgan so'rovimiz band qilib turadi va u serverda hali
   * ishlayapti. 30 soniya — o'sha so'rov tugashiga yetadigan eng qisqa muddat.
   */
  if (/concurren/i.test(xato)) return 30_000;
  if (/PerMinute|RequestsPerMinute/i.test(xato)) return 45_000;
  if (/PerDay|quota|RESOURCE_EXHAUSTED/i.test(xato)) return 30 * 60_000;
  if (/403|PERMISSION_DENIED|denied access/i.test(xato)) return 30 * 60_000;
  return 2 * 60_000;
}

const CACHE_DIR = process.env.TTS_CACHE_DIR || path.resolve(process.cwd(), 'uploads', 'tts-cache');

function liveBor(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function speechifyBor(): boolean {
  return Boolean(process.env.SPEECHIFY_API_KEY?.trim());
}

/**
 * HAR MANBA UCHUN NAVBAT: bir vaqtda bitta so'rov.
 *
 * Dars ovozi bo'laklab o'qiladi va keyingi bo'lak oldindan yuklanadi —
 * ya'ni ikkita so'rov birga ketadi. Speechify tarifi esa bitta bir vaqtdagi
 * so'rovga ruxsat beradi (`concurrency_limit_reached`), Gemini ham tez-tez
 * 429 qaytaradi. O'shanda kod zaxira manbaga o'tib ketardi va DARS
 * O'RTASIDA OVOZ O'ZGARARDI. Navbat shu sababni yo'q qiladi.
 */
type NavbatVazifasi = {
  ish: () => Promise<unknown>;
  hal: (qiymat: unknown) => void;
  rad: (xato: unknown) => void;
  /** Fon vazifasi (darsni oldindan qizdirish) — o'quvchini kutdirmasligi kerak. */
  fon: boolean;
};

const navbat: Record<Manba, NavbatVazifasi[]> = { speechify: [], live: [], gtts: [], openai: [] };
const yuribdi: Record<Manba, boolean> = { speechify: false, live: false, gtts: false, openai: false };

/**
 * AYNI PAYTDA generatsiya qilinayotgan matnlar.
 *
 * Server darsni tayyorlagach ovozni oldindan qizdiradi; o'quvchi esa bir
 * necha yuz millisekunddan keyin o'sha matnni so'raydi. Kesh hali yozilmagan
 * bo'lsa, ikkinchi so'rov XUDDI SHU ishni qaytadan qilardi — ikki barobar
 * kutish va ikki barobar to'lov. Endi ikkinchisi birinchisining natijasini
 * kutadi.
 */
const ishlar = new Map<string, Promise<{ audio: Buffer; mime: string }>>();

/**
 * Navbatga qo'yadi. O'QUVCHINING so'rovi FON vazifalaridan OLDINGA o'tadi.
 *
 * Nima uchun: dars ochilganda server uning barcha bo'laklarini fonda
 * tayyorlaydi (15-20 ta so'rov). Oddiy FIFO bo'lsa, o'quvchi bosgan bo'lak
 * shu 20 tanning ortida turib qolardi — ya'ni qizdirish muammoni yechish
 * o'rniga kuchaytirardi. Endi u faqat AYNI PAYTDA ketayotgan bitta so'rovni
 * kutadi (~3-8 soniya), qolgan fon ishlari esa orqaga suriladi.
 */
function navbatda<T>(manba: Manba, ish: () => Promise<T>, fon = false): Promise<T> {
  return new Promise<T>((hal, rad) => {
    const vazifa: NavbatVazifasi = {
      ish: ish as () => Promise<unknown>,
      hal: hal as (q: unknown) => void,
      rad,
      fon,
    };
    if (fon) {
      navbat[manba].push(vazifa);
    } else {
      const birinchiFon = navbat[manba].findIndex((v) => v.fon);
      if (birinchiFon === -1) navbat[manba].push(vazifa);
      else navbat[manba].splice(birinchiFon, 0, vazifa);
    }
    void navbatniYurgiz(manba);
  });
}

async function navbatniYurgiz(manba: Manba): Promise<void> {
  if (yuribdi[manba]) return;
  yuribdi[manba] = true;
  try {
    for (;;) {
      const vazifa = navbat[manba].shift();
      if (!vazifa) break;
      try {
        vazifa.hal(await vazifa.ish());
      } catch (err) {
        vazifa.rad(err);
      }
    }
  } finally {
    yuribdi[manba] = false;
  }
}

/**
 * Matn asosan ruschami (kirill harflari ustunmi).
 *
 * Doskadagi ruscha misollar to'liq kirillda bo'ladi, o'zbekcha tushuntirish
 * esa lotinda — ba'zan ichida bir-ikki ruscha so'z bilan. Yarmidan ko'pi
 * kirill bo'lsagina ruscha deb hisoblanadi.
 */
function ruschami(text: string): boolean {
  const kirill = (text.match(/[а-яё]/gi) ?? []).length;
  const lotin = (text.match(/[a-z]/gi) ?? []).length;
  return kirill > 0 && kirill >= lotin;
}

export function isTtsConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim()) || liveBor() || speechifyBor();
}

/**
 * Kesh kaliti. Manba va ovoz kalitga kiradi: ovoz almashtirilsa eski yozuvlar
 * o'z-o'zidan chetlab o'tiladi, qo'lda tozalash kerak emas.
 *
 * `sozlar` uchun ko'rsatma VERSIYASI ham kalitga kiradi: ko'rsatma matni
 * talaffuzni o'zgartiradi, ya'ni u boshqa ovoz demakdir. Versiyasiz eski
 * yozuvlar yangi ko'rsatma o'rniga qaytaverardi.
 */
function cacheKalit(text: string, speed: number, ohang: TtsOhang, manba: Manba): string {
  if (manba === 'openai' && ohang === 'sozlar') {
    const { model, voice } = OHANGLAR.sozlar;
    return createHash('sha256')
      .update(`${model}|${voice}|${SOZ_KORSATMA_VERSIYA}|${speed}|${text}`)
      .digest('hex');
  }
  if (manba === 'openai') {
    const { model, voice } = OHANGLAR[ohang];
    return createHash('sha256').update(`${model}|${voice}|${speed}|${text}`).digest('hex');
  }
  if (manba === 'speechify') {
    return createHash('sha256')
      .update(`speechify|${SPEECHIFY.model}|${SPEECHIFY.voice}|${text}`)
      .digest('hex');
  }
  if (manba === 'gtts') {
    return createHash('sha256')
      .update(`gtts|${GEMINI_TTS.model}|${GEMINI_TTS.voice}|${LIVE_KORSATMA_VERSIYA}|${text}`)
      .digest('hex');
  }
  return createHash('sha256')
    .update(`live|${LIVE_TTS.model}|${LIVE_TTS.voice}|${LIVE_KORSATMA_VERSIYA}|${text}`)
    .digest('hex');
}

const cacheYoli = (kalit: string, ext: string) => path.join(CACHE_DIR, `${kalit}.${ext}`);

/** Keshdan o'qiydi: avval mp3, keyin wav (ffmpeg bo'lmagan holat). */
async function keshdanOqi(kalit: string): Promise<{ audio: Buffer; mime: string } | null> {
  for (const [ext, mime] of [['mp3', 'audio/mpeg'], ['wav', 'audio/wav']] as const) {
    try {
      const audio = await fs.promises.readFile(cacheYoli(kalit, ext));
      if (audio.length > 0) return { audio, mime };
    } catch {
      /* keyingi kengaytmani sinaymiz */
    }
  }
  return null;
}

/** Keshga yozish — vaqtinchalik faylga, keyin nom berish: bir vaqtda kelgan
 *  ikki so'rov yarim yozilgan faylni o'qib qolmasin. */
async function keshgaYoz(kalit: string, ext: string, audio: Buffer): Promise<void> {
  try {
    await fs.promises.mkdir(CACHE_DIR, { recursive: true });
    const yol = cacheYoli(kalit, ext);
    const tmp = `${yol}.${process.pid}.tmp`;
    await fs.promises.writeFile(tmp, audio);
    await fs.promises.rename(tmp, yol);
  } catch (err) {
    console.error('[tts] keshga yozib bo\'lmadi:', (err as Error).message);
  }
}

/**
 * Xom PCM ga WAV sarlavhasini qo'shadi.
 *
 * Gemini ovozni `audio/L16;codec=pcm;rate=24000` ko'rinishida, ya'ni sarlavhasiz
 * qaytaradi — brauzer bunday oqimni o'zi chala olmaydi. 44 baytlik standart
 * sarlavha qo'shilsa, oddiy WAV bo'lib qoladi.
 */
function pcmdanWav(pcm: Buffer, rate: number): Buffer {
  const kanallar = 1;
  const bit = 16;
  const baytTezligi = (rate * kanallar * bit) / 8;
  const sarlavha = Buffer.alloc(44);
  sarlavha.write('RIFF', 0);
  sarlavha.writeUInt32LE(36 + pcm.length, 4);
  sarlavha.write('WAVE', 8);
  sarlavha.write('fmt ', 12);
  sarlavha.writeUInt32LE(16, 16);
  sarlavha.writeUInt16LE(1, 20); // PCM
  sarlavha.writeUInt16LE(kanallar, 22);
  sarlavha.writeUInt32LE(rate, 24);
  sarlavha.writeUInt32LE(baytTezligi, 28);
  sarlavha.writeUInt16LE((kanallar * bit) / 8, 32);
  sarlavha.writeUInt16LE(bit, 34);
  sarlavha.write('data', 36);
  sarlavha.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([sarlavha, pcm]);
}

/** ffmpeg topilmasa qayta-qayta urinmaslik uchun. */
let ffmpegYoq = false;

/**
 * WAV -> MP3. Nima uchun kerak: 24 kHz WAV sekundiga ~48 KB, ya'ni bitta
 * bo'lak yarim megabaytdan oshadi. Telefon internetida bu seziladi, MP3 esa
 * taxminan yetti barobar yengil. ffmpeg bo'lmasa WAV shundayligicha ketadi —
 * ovoz baribir eshitiladi, faqat og'irroq.
 */
function wavdanMp3(wav: Buffer): Promise<Buffer | null> {
  if (ffmpegYoq) return Promise.resolve(null);
  return new Promise((resolve) => {
    // `-ar 44100` MUHIM: 24 kHz da MP3 eskirgan MPEG-2 rejimiga tushadi va
    // nutq g'ijim, "hunik" eshitiladi. 44.1 kHz ga chiqarilsa oddiy MPEG-1
    // ishlaydi va ovoz tiniq bo'ladi. 96 kbit — nutq uchun yetarli.
    const p = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error',
      '-i', 'pipe:0', '-f', 'mp3', '-ar', '44100', '-b:a', '96k', '-ac', '1', 'pipe:1']);
    const boLaklar: Buffer[] = [];
    p.stdout.on('data', (d: Buffer) => boLaklar.push(d));
    p.on('error', () => { ffmpegYoq = true; resolve(null); });
    p.on('close', (code) => {
      const out = Buffer.concat(boLaklar);
      resolve(code === 0 && out.length > 0 ? out : null);
    });
    p.stdin.on('error', () => { /* ffmpeg erta yopilsa — quyida null qaytadi */ });
    p.stdin.end(wav);
  });
}

type Natija = { audio: Buffer; mime: string; ext: string };

/**
 * Gemini Live orqali nutq.
 *
 * Live oqim bo'lib ishlaydi: sessiya ochiladi, matn yuboriladi va ovoz
 * bo'lak-bo'lak qaytadi. Biz hammasini yig'ib, bitta MP3 qilamiz va keshga
 * yozamiz — shundan keyin o'sha matn qayta so'ralganda API'ga umuman
 * borilmaydi.
 */
async function liveNutq(text: string): Promise<Natija> {
  const bolaklar: Buffer[] = [];
  // Sof ruscha bo'lakka — ruscha ko'rsatma; aralash matnga — umumiysi.
  const korsatma = ruschami(text) ? RUS_KORSATMA : LIVE_TTS.korsatma;

  await new Promise<void>((resolve, reject) => {
    const ws = new WebSocket(`${LIVE_UPSTREAM}?key=${process.env.GEMINI_API_KEY}`);
    let bitdi = false;

    const yakun = (xato?: Error) => {
      if (bitdi) return;
      bitdi = true;
      clearTimeout(taymer);
      try { ws.close(); } catch { /* allaqachon yopiq */ }
      if (xato) reject(xato); else resolve();
    };

    const taymer = setTimeout(() => yakun(new Error('Live TTS: vaqt tugadi')), LIVE_TIMEOUT_MS);

    ws.on('open', () => {
      ws.send(JSON.stringify({
        setup: {
          model: `models/${LIVE_TTS.model}`,
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: LIVE_TTS.voice } } },
          },
          systemInstruction: { parts: [{ text: korsatma }] },
        },
      }));
    });

    ws.on('message', (xom: Buffer) => {
      let msg: Record<string, any>;
      try {
        msg = JSON.parse(xom.toString());
      } catch {
        return;
      }

      if (msg.setupComplete) {
        ws.send(JSON.stringify({
          clientContent: { turns: [{ role: 'user', parts: [{ text }] }], turnComplete: true },
        }));
        return;
      }

      const sc = msg.serverContent;
      if (!sc) return;
      for (const qism of sc.modelTurn?.parts ?? []) {
        if (qism.inlineData?.data) bolaklar.push(Buffer.from(qism.inlineData.data, 'base64'));
      }
      if (sc.turnComplete) yakun();
    });

    ws.on('error', (e: Error) => yakun(new Error(`Live TTS: ${e.message}`)));
    ws.on('close', (kod: number) => {
      // Ovoz kelgan bo'lsa yopilish normal; kelmagan bo'lsa xato.
      if (bolaklar.length) yakun();
      else yakun(new Error(`Live TTS: sessiya yopildi (${kod})`));
    });
  });

  const pcm = Buffer.concat(bolaklar);
  if (!pcm.length) throw new Error('Live TTS ovoz qaytarmadi');
  return pcmniTayyorla(pcm);
}

/** Gemini xom PCM qaytaradi: sarlavha qo'yamiz va iloji bo'lsa MP3 ga siqamiz. */
async function pcmniTayyorla(pcm: Buffer): Promise<Natija> {
  const wav = pcmdanWav(pcm, 24_000);
  const mp3 = await wavdanMp3(wav);
  return mp3
    ? { audio: mp3, mime: 'audio/mpeg', ext: 'mp3' }
    : { audio: wav, mime: 'audio/wav', ext: 'wav' };
}

/**
 * Gemini TTS modeli orqali nutq — Live sessiyasi ochilmaganda ishlatiladi.
 *
 * Live'dan farqi: oddiy so'rov-javob, ovoz oqim bo'lib emas, bir bo'lakda
 * keladi. Ko'rsatma (`systemInstruction`) berilmaydi — bu model matnni
 * o'ylamasdan, boricha o'qiydi.
 */
async function geminiTtsNutq(text: string): Promise<Natija> {
  /*
   * Bu modelda `systemInstruction` yo'q — uslub matnning O'ZIDA beriladi
   * («shunday o'qi: ...» ko'rinishida) va ko'rsatma ovozga chiqmaydi.
   * Ruscha bo'lakda talaffuz ko'rsatmasi shu yo'l bilan qo'shiladi, aks
   * holda Live yiqilgan paytda «Она» yana [oná] bo'lib qolardi.
   */
  const kirish = ruschami(text)
    ? 'Quyidagi rus tilidagi matnni ona tili darajasida o\'qi. Urg\'usiz «о» ' +
      '«а» bo\'lib jaranglaydi: она → [анá], хорошо → [харашó]. Matn:\n' + text
    : text;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LIVE_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS.model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: kirish }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: GEMINI_TTS.voice } },
            },
          },
        }),
      },
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new Error(
      `Gemini TTS (${res.status}): ${(await res.text().catch(() => '')).slice(0, 200)}`,
    );
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string } }> } }>;
  };
  const b64 = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData
    ?.data;
  if (!b64) throw new Error('Gemini TTS ovoz qaytarmadi');
  return pcmniTayyorla(Buffer.from(b64, 'base64'));
}

/** Speechify orqali nutq — ruscha matn uchun eng aniq talaffuz. */
async function speechifyNutq(text: string): Promise<Natija> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SPEECHIFY_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch('https://api.sws.speechify.com/v1/audio/speech', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.SPEECHIFY_API_KEY!}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
        voice_id: SPEECHIFY.voice,
        model: SPEECHIFY.model,
        audio_format: 'mp3',
      }),
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new Error(`Speechify (${res.status}): ${(await res.text().catch(() => '')).slice(0, 200)}`);
  }

  const data = (await res.json()) as { audio_data?: string };
  if (!data.audio_data) throw new Error('Speechify ovoz qaytarmadi');
  return { audio: Buffer.from(data.audio_data, 'base64'), mime: 'audio/mpeg', ext: 'mp3' };
}

/** OpenAI orqali nutq (lug'at ovozi va zaxira yo'l). */
async function openaiNutq(text: string, speed: number, ohang: TtsOhang): Promise<Natija> {
  if (!process.env.OPENAI_API_KEY?.trim()) throw new Error('OPENAI_API_KEY yo\'q');
  const { model, voice, instructions } = OHANGLAR[ohang];
  /*
   * Ko'rsatma IKKI shart bajarilgandagina yuboriladi:
   *  - modeli qo'llab-quvvatlasin (`tts-1`/`tts-1-hd` bu maydonni bilmaydi);
   *  - matn kirillda bo'lsin — lotin yozuvidagi matnga "ruscha o'qi" deyish
   *    uni buzardi.
   */
  const korsatma = instructions && model.startsWith('gpt-4o') && kirillmi(text) ? instructions : '';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        voice,
        input: text,
        speed,
        response_format: 'mp3',
        ...(korsatma ? { instructions: korsatma } : {}),
      }),
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new Error(`OpenAI TTS (${res.status}): ${(await res.text().catch(() => '')).slice(0, 200)}`);
  }
  return { audio: Buffer.from(await res.arrayBuffer()), mime: 'audio/mpeg', ext: 'mp3' };
}

export type SpeakResult = { audio: Buffer; cached: boolean; mime: string };

/**
 * Matnni ovozga aylantiradi. Keshda bo'lsa — diskdan, aks holda API'dan.
 * Kesh yozib bo'lmasa ham javob qaytadi (kesh — tezlik, majburiyat emas).
 */
export async function speak(
  rawText: string,
  opts: { speed?: number; ohang?: TtsOhang; fon?: boolean } = {},
): Promise<SpeakResult> {
  const text = String(rawText ?? '').trim().replace(/\s+/g, ' ');
  if (!text) throw new Error('Matn bo\'sh');
  if (text.length > MAX_CHARS) throw new Error(`Matn juda uzun (maksimum ${MAX_CHARS} belgi)`);
  if (!isTtsConfigured()) {
    const err = new Error('TTS sozlanmagan: na OPENAI_API_KEY, na GEMINI_API_KEY yo\'q');
    (err as { code?: string }).code = 'TTS_NOT_CONFIGURED';
    throw err;
  }

  const ohang: TtsOhang = opts.ohang === 'ustoz' ? 'ustoz' : 'sozlar';
  /*
   * Quyi chegara `sozlar` uchun modelga qarab ko'tariladi (izohga qarang).
   * Kesh kalitiga AYNAN shu yakuniy qiymat kiradi, shuning uchun tuzatish
   * kalit hisoblanishidan oldin turishi shart.
   */
  const engPast =
    ohang === 'sozlar' && OHANGLAR.sozlar.model.startsWith('gpt-4o')
      ? SOZ_ENG_PAST_TEZLIK
      : 0.5;
  const speed = Math.min(1.2, Math.max(engPast, opts.speed ?? SPEED));

  /*
   * MANBALAR TARTIBI.
   *
   * Doskada BITTA MANBA: Gemini Live (`Leda`), zaxirasi `gtts` — o'sha ovoz,
   * boshqa yo'l bilan. Ruscha misol ham, o'zbekcha tushuntirish ham shu
   * ovozda o'qiladi (`RUSCHA_SPEECHIFY` izohiga qarang: ilgari ruscha matn
   * Speechify'ga ketardi va dars o'rtasida ovoz almashib qolardi).
   * Lug'atda faqat OpenAI: uning keshi to'la va ovozi o'quvchilarga tanish.
   *
   * O'ZBEKCHA DOSKA MATNI OPENAI'GA HAM, SPEECHIFY'GA HAM BERILMAYDI.
   * OpenAI lotin yozuvini inglizcha tovushlar bilan o'qiydi (o'lchovda
   * gapning yarmi umuman yo'qolgan: "Men — Я" eshitilmagan) — o'quvchi
   * aynan shuni "robot ovoz, tushunib bo'lmaydi" deb baholagan. Speechify
   * esa o'zbek tilini bilmaydi va ruscha talaffuz bilan o'qiydi; u zaxira
   * qilib qo'yilgan va SHU SABAB qaytarilgan.
   *
   * Shuning uchun o'zbekchaning zaxirasi ham Gemini: `gtts` — o'sha ovoz
   * (`Leda`), lekin oddiy HTTPS so'rovi orqali. Live sessiyasi ochilmasa
   * ham u ishlaydi. Ikkalasi ham yiqilsa manba qolmaydi va so'rov xato
   * bilan tugaydi: klient bunda JIM o'tadi (`speak.ts`, `zaxira: false`) —
   * dars o'rtasida tushunarsiz ovozdan ko'ra jimlik afzal.
   */
  const hozir = Date.now();
  const ruscha = ruschami(text) || process.env.SPEECHIFY_ALL === '1';
  const nomzodlar: Manba[] = [];
  if (ohang === 'ustoz') {
    // Bitta ovoz: ruscha misol ham o'zbekcha tushuntirish ham `Leda`da.
    // Speechify/OpenAI faqat `TTS_RUSCHA_SPEECHIFY=1` bilan qaytadi.
    if (ruscha && RUSCHA_SPEECHIFY && speechifyBor()) nomzodlar.push('speechify');
    if (liveBor()) nomzodlar.push('live', 'gtts');
    if (ruscha && RUSCHA_SPEECHIFY) nomzodlar.push('openai');
  } else {
    nomzodlar.push('openai');
  }

  /*
   * AVVAL KESH — UXLAYOTGAN MANBANIKI HAM.
   *
   * Ilgari uxlab qolgan manba ro'yxatdan butunlay chiqarilardi, ya'ni uning
   * DISKDAGI TAYYOR ovozi ham chetlab o'tilardi. Natijasi og'ir edi: Live
   * bir marta yiqilsa, 10 daqiqa davomida allaqachon Live ovozi bilan
   * yozilgan bo'laklar ham qaytadan, zaxira manbada generatsiya qilinardi —
   * ya'ni dars o'rtasida ovoz sababsiz o'zgarardi va pul ketardi.
   * Keshni o'qish arzon va xavfsiz: manba uxlayotgani generatsiyaga taalluqli.
   */
  for (const manba of nomzodlar) {
    const kesh = await keshdanOqi(cacheKalit(text, speed, ohang, manba));
    if (kesh) return { ...kesh, cached: true };
  }

  const manbalar = nomzodlar.filter((m) => !manbaTin(m, hozir));
  if (!manbalar.length) {
    throw new Error(`Ovoz manbalari vaqtincha ishlamayapti (${nomzodlar.join(', ')})`);
  }

  let oxirgiXato: Error | null = null;

  for (const manba of manbalar) {
    const kalit = cacheKalit(text, speed, ohang, manba);

    try {
      const oldingi = ishlar.get(kalit);
      if (oldingi) {
        const natija = await oldingi;
        return { audio: natija.audio, mime: natija.mime, cached: true };
      }

      const ish = navbatda(
        manba,
        () =>
          manba === 'speechify'
            ? speechifyNutq(text)
            : manba === 'live'
              ? liveNutq(text)
              : manba === 'gtts'
                ? geminiTtsNutq(text)
                : openaiNutq(text, speed, ohang),
        opts.fon === true,
      ).then(async (n) => {
        await keshgaYoz(kalit, n.ext, n.audio);
        return { audio: n.audio, mime: n.mime };
      });
      ishlar.set(kalit, ish);
      try {
        const natija = await ish;
        ketmaKetXato[manba] = 0;
        return { audio: natija.audio, mime: natija.mime, cached: false };
      } finally {
        ishlar.delete(kalit);
      }
    } catch (err) {
      oxirgiXato = err as Error;
      /*
       * Xatoni yozib qo'yamiz va keyingi manbaga o'tamiz — dars to'xtamasin.
       * Kvota tugagan bo'lsa qayta urinish foydasiz, shuning uchun manba
       * biroz vaqtga uxlatiladi.
       *
       * Tin OXIRGI manbaga ham qo'yiladi (ilgari qo'yilmasdi). Sabab: endi
       * zanjir oxirida OpenAI turmasligi mumkin, va butunlay nosoz manbaga
       * har so'rovda urinish har bo'lakni chegaraga qadar kutdirib qo'yardi.
       * Kesh baribir avval o'qiladi, ya'ni uxlash tayyor ovozlarga tegmaydi.
       */
      ketmaKetXato[manba] += 1;
      const uzoq = ketmaKetXato[manba] >= KETMA_KET_CHEGARA;
      const muddat = uzoq ? UZOQ_TIN_MS : tinMuddati(oxirgiXato.message);
      tinPaytu[manba] = Date.now();
      tinDavomi[manba] = muddat;
      console.error(
        `[tts] ${manba} ishlamadi (${ketmaKetXato[manba]}-marta ketma-ket), ` +
          `${Math.round(muddat / 1000)}s uxlatildi: ${oxirgiXato.message.slice(0, 160)}`,
      );
    }
  }

  throw oxirgiXato ?? new Error('Ovozni tayyorlab bo\'lmadi');
}
