import { isOperatorFrozen } from '../operator/freeze.js';
/**
 * ustozLive.service.ts — doskadagi JONLI ovozli savol-javob (Gemini Live API).
 *
 * NIMA UCHUN ALOHIDA YO'L: oddiy savol-javobda o'quvchi tugmani bosib yozadi,
 * yozuv serverga ketadi, matnga aylanadi, baholanadi va javob ovozga
 * o'giriladi — har aylanish bir necha soniya. Live API'da esa mikrofon va ovoz
 * uzluksiz oqadi: ustoz gapirayotganda o'quvchi uni bo'lib savol bera oladi va
 * javob darhol keladi. Suhbat tirik odam bilan gaplashayotgandek chiqadi.
 *
 * ARXITEKTURA: brauzer -> BIZNING WebSocket -> Gemini WebSocket.
 * O'rtada turishimiz shart, chunki API kaliti hech qachon brauzerga
 * chiqmasligi kerak. Shu yerda cheklovlar ham qo'yiladi.
 *
 * XARAJAT NAZORATI: Live sessiya ovozni ikki tomonga uzatadi va keshlab
 * bo'lmaydi — ya'ni har sekundi pul. Chegara SESSIYA VAQTIDA:
 *  - bitta o'quvchida bir vaqtda bitta sessiya;
 *  - sessiya 3 daqiqa — shundan keyin o'zi yopiladi;
 *  - jim qolgan sessiya o'zi yopiladi;
 *  - serverda bir vaqtda ochiq sessiyalar soni cheklangan.
 *
 * SAVOL SONI CHEKLANMAYDI (2026-08-21). Ilgari jonli suhbat foydalanuvchi
 * kvotasidan hisoblanardi (20 ta so'rov, so'ng 5 soat tanaffus) va o'quvchi
 * "chegara tugadi" degan ekranga urilardi. Endi chegara faqat VAQT: 3 daqiqa
 * ichida o'quvchi mavzu bo'yicha xohlagancha gaplashadi. Kvotani qaytarish
 * kerak bo'lsa — `USTOZ_LIVE_KVOTA=1`.
 */
import type { Server } from 'http';
import jwt from 'jsonwebtoken';
import { WebSocketServer, WebSocket } from 'ws';
import { buildLiveLessonInstruction as tizimKorsatmasi, LiveQuestionProgress } from './liveLessonPrompt.js';
import { pool } from '../lib/db.js';
import { findUsedPraise } from './liveLessonPraise.js';
import { loadPraiseProfile, saveUsedPraise } from './liveLessonPraise.service.js';
import { kvotaOl, kvotaXabari } from './ustozKvota.service.js';

const YOL = '/api/ustoz/live';

/**
 * Tez javob beradigan Live model — suhbatda kechikish eng muhim ko'rsatkich.
 *
 * 2026-09-15: Google `gemini-3.1-flash-live-preview` ni eskirtdi va
 * `gemini-3.8-live` ni tavsiya qildi. Eski preview sekinlashib, "erta
 * versiya"dek gapira boshlagan — default shu yangi stabil model.
 */
const MODEL = process.env.GEMINI_LIVE_MODEL || 'gemini-3.8-live';
/** Yosh, jonli ovoz — o'quvchilar tengdoshi bilan gaplashayotgandek his qilsin. */
const VOICE = process.env.GEMINI_LIVE_VOICE || 'Leda';

/**
 * SUHBAT UZUNLIGI — 3 daqiqa.
 *
 * Chegara FAQAT vaqt: savol soni cheklanmaydi, o'quvchi shu uch daqiqa
 * ichida qanchasiga ulgursa shuncha savolga javob beradi. Ilgari besh
 * daqiqa edi va suhbat cho'zilib ketardi.
 *
 * Bu ayni paytda o'quvchiga ko'rsatiladigan vaqt ham: `ready` xabarida
 * qolgan soniyalar yuboriladi va doskada teskari hisob yuradi.
 */
/*
 * SUHBAT UZUNLIGI — 5 DAQIQA.
 *
 * Butun vaqt AYNAN BUGUNGI kun materialiga ketadi: eski kunlardan savol
 * ham, javob berilmagan kunga qaytarish ham yo'q.
 */
const MAX_SESSIYA_MS = Number(process.env.USTOZ_LIVE_MAX_MS || 5 * 60 * 1000);
/**
 * Yakundan shuncha oldin ustozga "xulosa qil" deyiladi.
 *
 * Aks holda suhbat gap o'rtasida kesilardi: model vaqtni bilmaydi, tizim esa
 * shunchaki ulanishni yopadi. Bu ogohlantirish o'quvchiga ham eshitiladi —
 * ustoz o'zi maqtab, xulosa qilib xayrlashadi.
 */
/*
 * YAKUNLASH OGOHLANTIRISHI — oxirdan 12 soniya oldin.
 *
 * 20 soniya ko'p edi: ustoz xulosani erta boshlab, o'quvchi "vaqt hali
 * bor edi-ku" deb qolardi. 12 soniya bir-ikki gapli xulosaga yetadi va
 * suhbat oxirigacha tirik qoladi.
 */
const YAKUN_OGOH_MS = 12 * 1000;

/**
 * ERTA XAYRLASHISH NAQSHI.
 *
 * Model ro'yxatdagi savollar tugagach "savollarimiz tugadi", "suhbatimiz
 * yakunlandi", "xayr" deb qo'yadi — keyin esa o'zi suhbatni davom
 * ettiraveradi. O'quvchi uchun bu chalkash: tugadi deyildi, lekin
 * tugamadi.
 *
 * Promptdagi taqiq yetarli bo'lmadi (uch marta kuchaytirildi). Shuning
 * uchun tekshiruv KODGA olindi: matn oqimida shu naqsh uchrasa va vaqt
 * hali tugamagan bo'lsa, modelga yashirin tuzatish yuboriladi.
 */
const ERTA_XAYR =
  /(savollar(imiz)?\s+(tugadi|yakunlandi|tamom))|(suhbat(imiz)?\s+(tugadi|yakunlandi|tamom))|(shu\s+bilan\s+yakunla)|(\bxayr\b[,.!]?\s|ko['’]rishguncha|yaxshi\s+qoling|до\s+свидания|всего\s+доброго)/iu;

/** Bir suhbatda nechta marta tuzatish yuboriladi (cheksiz aylanma bo'lmasin). */
const MAX_TUZATISH = 4;
/**
 * Jonli suhbat foydalanuvchi kvotasidan hisoblanadimi.
 *
 * Sukut bo'yicha YO'Q: chegara sessiya vaqtida (3 daqiqa), savol sonida emas.
 * `USTOZ_LIVE_KVOTA=1` qo'yilsa eski xatti-harakat qaytadi.
 */
const KVOTA_HISOBLANADI = process.env.USTOZ_LIVE_KVOTA === '1';
/** Shuncha vaqt hech kim gapirmasa, sessiya o'zi yopiladi. */
const MAX_JIM_MS = 90 * 1000;
/** Serverda bir vaqtda ochiq bo'lishi mumkin bo'lgan sessiyalar. */
const MAX_UMUMIY = Number(process.env.USTOZ_LIVE_MAX_SESSIONS || 12);

const UPSTREAM =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

/** Ochiq sessiyalar: userId -> soni. Bir o'quvchida bittadan ortiq bo'lmasin. */
const ochiqSessiyalar = new Map<number, number>();
let umumiySessiya = 0;

export function isUstozLiveConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

type Boshlash = { mavzu?: unknown; savollar?: unknown; kun?: unknown };

/** Suhbat savoli — qaysi kun materialidan olingani bilan. */
type JonliSavol = { savol: string; manbaKun: number; manbaMavzu: string };

/**
 * O'QUVCHI JAVOB BERA OLMAGANDA CHAQIRILADIGAN FUNKSIYA.
 *
 * Model suhbatni o'zi olib boradi, shuning uchun savolga javob berilmagani
 * ham FAQAT unga ma'lum. Serverda transkriptni qayta baholash mo'rt bo'lardi:
 * "bilmadim" ni ham, mavzudan chetga chiqqan javobni ham bir xil aniqlash
 * kerak. Model esa buni suhbatning o'zida ko'rib turadi — shuning uchun
 * qaror unga qoldirilgan va u shu funksiyani chaqiradi.
 */
const BAHOLASH_FUNKSIYASI = {
  name: 'javob_baholandi',
  description:
    "Faqat savol YAKUNLANGANDA chaqir: o'quvchi to'g'ri javob/takror qildi (togri:true) YOKI aniq «o'tkazamiz» dedi (togri:false). Xato, bilmayman, bo'lak mashqi yoki kutish — hali yakun emas, chaqirma. Ikki marta xato bo'ldi deb o'tkazma.",
  parameters: {
    type: 'OBJECT',
    properties: {
      savol_raqami: {
        type: 'NUMBER',
        description: "Savolning tartib raqami (1 dan boshlab); ro'yxat tugagandan keyingi yangi savol uchun 0.",
      },
      togri: {
        type: 'BOOLEAN',
        description:
          "true — mustaqil to'g'ri yoki to'liq namunani to'g'ri takrorladi. false — FAQAT o'quvchi aniq o'tkazishni so'raganda. Xato urinishlar uchun false bilan o'tkazma.",
      },
      izoh: {
        type: 'STRING',
        description: 'Qisqa izoh: nima to\'g\'ri yoki nima yetmadi.',
      },
      savol: {
        type: 'STRING',
        description:
          "Ro'yxatdan TASHQARI savol bergan bo'lsang — savolning matni. Ro'yxatdagi savol uchun bo'sh qoldir.",
      },
      manba_kun: {
        type: 'NUMBER',
        description:
          "Ro'yxatdan TASHQARI savol bergan bo'lsang — savol qaysi kun materialidan olingani.",
      },
    },
    required: ['savol_raqami', 'togri'],
  },
} as const;

/* ------------------------------------------------------------------ *
 *  Suhbat tarixi — `kun_suhbat_urinish` / `kun_suhbat_savol`
 * ------------------------------------------------------------------ */

/**
 * Suhbat urinishini ochadi va savollarni yozib qo'yadi.
 *
 * Tarix nima uchun kerak: qaysi kun qayta-qayta yiqitayotgani faqat shu
 * yozuvdan ko'rinadi. Usiz "o'quvchi 10-kunga qaytarildi" degan hodisa
 * ekranda paydo bo'lib, izsiz yo'qolardi.
 *
 * Baza yozuvi suhbatni TO'XTATMAYDI: xatolik bo'lsa jimgina o'tib ketiladi.
 */
async function urinishOch(
  userId: number,
  kun: number,
  savollar: JonliSavol[],
): Promise<number | null> {
  if (!pool || !kun || savollar.length === 0) return null;
  try {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO kun_suhbat_urinish (user_id, day_number, savol_soni)
            VALUES ($1, $2, $3) RETURNING id`,
      [userId, kun, savollar.length],
    );
    const id = Number(rows[0]?.id);
    if (!Number.isFinite(id)) return null;

    for (let i = 0; i < savollar.length; i += 1) {
      const s = savollar[i];
      // `manba_kun` da CHECK bor (1..182) — noto'g'ri qiymat butun
      // yozuvni yiqitmasin uchun joriy kunga tushiriladi.
      const manba = s.manbaKun >= 1 && s.manbaKun <= 182 ? s.manbaKun : kun;
      await pool.query(
        `INSERT INTO kun_suhbat_savol (urinish_id, tartib, savol, manba_kun, manba_mavzu)
              VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (urinish_id, tartib) DO NOTHING`,
        [id, i + 1, s.savol, manba, s.manbaMavzu.slice(0, 200)],
      );
    }
    return id;
  } catch (err) {
    console.error('[ustozLive] urinish yozilmadi:', (err as Error).message);
    return null;
  }
}

/**
 * RO'YXATDAN TASHQARI savolni tarixga qo'shadi.
 *
 * Uch daqiqa ichida tayyor savollar tugab, ustoz o'zi yangi savol berishi
 * mumkin. Ular ham xuddi shunday hisobga olinadi: aks holda o'quvchi
 * qo'shimcha savolga javob bera olmaganda tarixda iz qolmasdi.
 */
async function qoshimchaSavolYoz(
  urinishId: number | null,
  savol: string,
  manbaKun: number,
  manbaMavzu: string,
  togri: boolean,
  izoh: string,
): Promise<number | null> {
  if (!pool || !urinishId || !savol) return null;
  try {
    const { rows } = await pool.query<{ tartib: number }>(
      `INSERT INTO kun_suhbat_savol
              (urinish_id, tartib, savol, manba_kun, manba_mavzu, togri, izoh, javob_vaqti)
       SELECT $1, COALESCE(MAX(tartib), 0) + 1, $2, $3, $4, $5, $6, now()
         FROM kun_suhbat_savol WHERE urinish_id = $1
       RETURNING tartib`,
      [urinishId, savol.slice(0, 500), manbaKun, manbaMavzu.slice(0, 200), togri, izoh.slice(0, 500) || null],
    );
    await pool.query(
      'UPDATE kun_suhbat_urinish SET savol_soni = savol_soni + 1 WHERE id = $1',
      [urinishId],
    );
    return rows[0]?.tartib ?? null;
  } catch (err) {
    console.error('[ustozLive] qo\'shimcha savol yozilmadi:', (err as Error).message);
    return null;
  }
}

/** Bitta savolning natijasini yozadi. */
async function javobYoz(
  urinishId: number | null,
  tartib: number,
  togri: boolean,
  izoh: string,
): Promise<void> {
  if (!pool || !urinishId || !Number.isInteger(tartib) || tartib < 1) return;
  try {
    await pool.query(
      `UPDATE kun_suhbat_savol
          SET togri = $3, izoh = $4, javob_vaqti = now()
        WHERE urinish_id = $1 AND tartib = $2`,
      [urinishId, tartib, togri, izoh.slice(0, 500) || null],
    );
  } catch (err) {
    console.error('[ustozLive] javob yozilmadi:', (err as Error).message);
  }
}

/**
 * Urinishni yopadi.
 *
 * `otdi` — HAMMA savolga to'g'ri javob berilgandagina rost. Ataylab qat'iy:
 * o'quvchi suhbatni yarmida tashlab ketsa, javob berilmagan savollar
 * "to'g'ri" bo'lib hisoblanib qolmasin.
 */
async function urinishYop(urinishId: number | null): Promise<void> {
  if (!pool || !urinishId) return;
  try {
    await pool.query(
      `UPDATE kun_suhbat_urinish u
          SET finished_at = now(),
              togri_soni = (
                SELECT count(*) FROM kun_suhbat_savol s
                 WHERE s.urinish_id = u.id AND s.togri IS TRUE
              ),
              otdi = (
                SELECT count(*) FROM kun_suhbat_savol s
                 WHERE s.urinish_id = u.id AND s.togri IS TRUE
              ) = u.savol_soni
        WHERE u.id = $1 AND u.finished_at IS NULL`,
      [urinishId],
    );
  } catch (err) {
    console.error('[ustozLive] urinish yopilmadi:', (err as Error).message);
  }
}

export function attachUstozLive(server: Server): void {
  if (!isUstozLiveConfigured()) {
    console.warn('[ustozLive] GEMINI_API_KEY yo\'q — jonli suhbat o\'chirilgan');
    return;
  }

  const wss = new WebSocketServer({
    server, path: YOL, maxPayload: 2 * 1024 * 1024,
    // Check before the handshake completes: do not delay connection listeners
    // and lose the client's initial audio-session message.
    verifyClient: (info, done) => {
      try {
        const token = new URL(info.req.url ?? '', 'http://localhost').searchParams.get('token') ?? '';
        const payload = jwt.verify(token, String(process.env.JWT_SECRET)) as { id?: number };
        if (!payload.id) return done(false, 401, 'Unauthorized');
        void isOperatorFrozen(Number(payload.id)).then(
          frozen => done(!frozen, frozen ? 403 : undefined, frozen ? 'Debt frozen' : undefined),
          () => done(false, 503, 'Account check unavailable'),
        );
      } catch { done(false, 401, 'Unauthorized'); }
    },
  });

  wss.on('connection', (klient: WebSocket, req) => {
    // --- Autentifikatsiya -----------------------------------------------
    // Brauzer WebSocket'da sarlavha qo'sha olmaydi, shuning uchun token
    // manzilda keladi. U qisqa muddatli JWT — oddiy kirish tokeni.
    let userId: number;
    try {
      const url = new URL(req.url ?? '', 'http://localhost');
      const token = url.searchParams.get('token') ?? '';
      const payload = jwt.verify(token, String(process.env.JWT_SECRET)) as { id?: number };
      if (!payload?.id) throw new Error('id yo\'q');
      userId = Number(payload.id);
    } catch {
      klient.close(4401, 'Avtorizatsiya kerak');
      return;
    }

    // --- Cheklovlar ------------------------------------------------------
    if (umumiySessiya >= MAX_UMUMIY) {
      klient.close(4429, 'Hozir band, birozdan keyin urinib ko\'ring');
      return;
    }
    if ((ochiqSessiyalar.get(userId) ?? 0) >= 1) {
      klient.close(4429, 'Suhbat allaqachon ochiq');
      return;
    }

    ochiqSessiyalar.set(userId, 1);
    umumiySessiya += 1;


    let yuqori: WebSocket | null = null;
    let tugadi = false;
    /**
     * Ochilgan suhbat urinishi — savol natijalari shunga yoziladi.
     *
     * IDning O'ZI emas, PROMISE saqlanadi. INSERT bir necha o'n millisekund
     * oladi; shu orada model birinchi savolni baholab ulgurishi yoki
     * sessiya yopilib ketishi mumkin. Ilgari bunday holatda yozuv jimgina
     * yo'qolar, `finished_at` esa abadiy `NULL` bo'lib qolardi.
     */
    let urinishKutish: Promise<number | null> = Promise.resolve(null);
    /** Erta xayrlashish uchun yuborilgan tuzatishlar soni. */
    let tuzatishSoni = 0;
    let questionProgress = new LiveQuestionProgress(0);
    /*
     * USTOZ GAPINING OXIRGI QISMI.
     *
     * Matn BO'LAKLAB keladi: "Savollarimiz " va "tugadi" ikki xabarda
     * kelishi mumkin va har birini alohida tekshirish naqshni topa
     * olmasdi. Shuning uchun oxirgi bir necha yuz belgi to'planadi va
     * tekshiruv shunga qo'yiladi. Navbat tugagach tozalanadi.
     */
    let ustozMatni = '';
    let praiseTranscript = '';
    let starting = false;
    const usedPhrases = new Set<string>();
    let praiseWrites: Promise<void> = Promise.resolve();
    const recordPraise = () => {
      const fresh = findUsedPraise(praiseTranscript).filter(phrase => !usedPhrases.has(phrase));
      for (const phrase of fresh) usedPhrases.add(phrase);
      if (fresh.length) {
        praiseWrites = praiseWrites.then(() => saveUsedPraise(userId, fresh)).catch(error => {
          console.error('[ustozLive] Praise history save failed:', error);
        });
      }
    };
    /** Shu suhbatda ochilgan kunlar: kun -> mavzu. Qaytarish faqat shularga. */
    const ruxsatKunlar = new Map<number, string>();
    /*
     * KUNGA QAYTARISH MEXANIZMI OLIB TASHLANDI.
     *
     * Ilgari savolga javob bera olmagan o'quvchi "falon kunga qaytamiz"
     * ekraniga uloqtirilardi. Bu ikki tomondan noto'g'ri edi: suhbat
     * o'rtasida uzilardi va o'quvchi bir savol tufayli butun kunni
     * qaytadan o'qishga yuborilardi. Endi javob natijasi faqat tarixga
     * yoziladi (`javobYoz`), suhbat esa vaqt tugaguncha davom etadi.
     */
    let sonChaqiruv = Date.now();
    /** Sessiya shu paytda ochildi — qolgan vaqt shundan hisoblanadi. */
    const boshlanish = Date.now();
    /** O'quvchiga ko'rsatiladigan qolgan vaqt (soniya). */
    const qolganSoniya = () =>
      Math.max(0, Math.round((MAX_SESSIYA_MS - (Date.now() - boshlanish)) / 1000));

    const yubor = (obj: unknown) => {
      if (klient.readyState === WebSocket.OPEN) klient.send(JSON.stringify(obj));
    };

    const tugat = (sabab: string) => {
      if (tugadi) return;
      tugadi = true;
      clearTimeout(umrTaymer);
      clearTimeout(yakunTaymer);
      clearInterval(jimlikTaymer);
      recordPraise();
      // Keep the per-user lock until the next lesson can read the saved history.
      void praiseWrites.finally(() => ochiqSessiyalar.delete(userId));
      umumiySessiya = Math.max(0, umumiySessiya - 1);
      /*
       * Tarix yozuvi yopiladi — sessiya qanday tugashidan qat'i nazar.
       * INSERT hali tugamagan bo'lsa KUTAMIZ: aks holda erta yopilgan
       * sessiyaning qatori `finished_at` siz osilib qolardi.
       */
      void urinishKutish.then((id) => urinishYop(id));
      try { yuqori?.close(); } catch { /* allaqachon yopiq */ }
      try {
        yubor({ type: 'end', sabab, used_phrases: [...usedPhrases] });
        klient.close();
      } catch { /* allaqachon yopiq */ }
    };

    const umrTaymer = setTimeout(() => tugat('vaqt tugadi'), MAX_SESSIYA_MS);

    /*
     * YAKUNDAN OLDIN OGOHLANTIRISH.
     *
     * Model vaqtni bilmaydi — tizim shunchaki ulanishni yopadi va suhbat gap
     * o'rtasida kesilardi. Shuning uchun yakundan yarim daqiqa oldin ustozga
     * yashirin xabar yuboriladi: u o'zi xulosa qilib, o'quvchini maqtab
     * xayrlashadi. Bu xabar o'quvchiga KO'RINMAYDI (u `clientContent`, ya'ni
     * mikrofon yozuvi emas).
     */
    const yakunTaymer = setTimeout(() => {
      if (tugadi || yuqori?.readyState !== WebSocket.OPEN) return;
      yuqori.send(JSON.stringify({
        clientContent: {
          turns: [{
            role: 'user',
            parts: [{
              text: 'Vaqt tugayapti. Endi suhbatni yakunla: bir-ikki gapda '
                + 'qisqacha xulosa qil; faqat haqiqiy natija yoki urinishni qayd et. '
                + 'Bank 6 dan ishlatilmagan bitta ibora bilan xayrlash. '
                + 'Yangi savol berma. Bu xabarni ovozga chiqarma.',
            }],
          }],
          turnComplete: true,
        },
      }));
    }, Math.max(0, MAX_SESSIYA_MS - YAKUN_OGOH_MS));
    const jimlikTaymer = setInterval(() => {
      if (Date.now() - sonChaqiruv > MAX_JIM_MS) tugat('jimlik');
    }, 15_000);

    /*
     * KVOTA — sukut bo'yicha O'CHIQ.
     *
     * Suhbatning chegarasi endi VAQT: 3 daqiqa. Savol soni sanalmaydi, ya'ni
     * o'quvchi shu vaqt ichida xohlagancha savol berib, xohlagancha gapira
     * oladi. Eski xatti-harakat `USTOZ_LIVE_KVOTA=1` bilan qaytariladi.
     */
    if (KVOTA_HISOBLANADI) void kvotaOl(userId).then((kvota) => {
      if (!kvota.ruxsat) {
        /*
         * `kod` — xatoning SABABI, matndan alohida.
         *
         * Klient kvota tugashini texnik nosozlikdan ajrata olishi kerak:
         * nosozlikda zaxira rejimga o'tish o'rinli, kvotada esa yo'q —
         * zaxira rejim ham AI ga pul turadi, ya'ni cheklovni boshqa
         * eshikdan aylanib o'tish bo'lardi. Matnni tekshirish mo'rt:
         * so'zlashuv o'zgarsa klient buzilardi.
         */
        yubor({ type: 'error', kod: 'kvota', xato: kvotaXabari(kvota.kutish) });
        tugat('kvota tugadi');
      }
    });

    // --- Gemini bilan ulanish -------------------------------------------
    const boshla = async (cfg: Boshlash) => {
      const praiseProfile = await loadPraiseProfile(userId);
      if (tugadi) return;
      const mavzu = String(cfg.mavzu ?? '').trim().slice(0, 200) || 'Rus tili';

      /*
       * Savollar endi O'Z KUNI bilan keladi. Eski ko'rinish (oddiy satrlar
       * ro'yxati) ham qabul qilinadi: brauzerda ochiq turgan eski to'plam
       * yangi server bilan gaplashganda suhbat buzilmasin.
       */
      const savollar: JonliSavol[] = Array.isArray(cfg.savollar)
        ? cfg.savollar
            .map((xom) => {
              if (typeof xom === 'string') {
                return { savol: xom.slice(0, 250), manbaKun: 0, manbaMavzu: '' };
              }
              if (!xom || typeof xom !== 'object') return null;
              const r = xom as Record<string, unknown>;
              const savol = String(r.savol ?? '').slice(0, 250);
              if (!savol) return null;
              return {
                savol,
                manbaKun: Number(r.manbaKun) || 0,
                manbaMavzu: String(r.manbaMavzu ?? '').slice(0, 200),
              };
            })
            .filter((s): s is JonliSavol => s !== null && Boolean(s.savol))
            .slice(0, 6)
        : [];

      const kun = Number(cfg.kun) || 0;

      /*
       * Shu suhbatda OCHILGAN kunlar: joriy kun + savollar kelgan eski
       * kunlar. Qaytarish faqat shulardan biriga bo'lishi mumkin.
       */
      ruxsatKunlar.clear();
      if (kun >= 1 && kun <= 182) ruxsatKunlar.set(kun, mavzu);
      for (const s of savollar) {
        if (s.manbaKun >= 1 && s.manbaKun <= 182) {
          ruxsatKunlar.set(s.manbaKun, s.manbaMavzu || mavzu);
        }
      }

      questionProgress = new LiveQuestionProgress(savollar.length);
      urinishKutish = urinishOch(userId, kun, savollar);
      void urinishKutish;

      yuqori = new WebSocket(`${UPSTREAM}?key=${process.env.GEMINI_API_KEY}`);

      yuqori.on('open', () => {
        yuqori?.send(JSON.stringify({
          setup: {
            model: `models/${MODEL}`,
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
            },
            systemInstruction: { parts: [{ text: tizimKorsatmasi(mavzu, savollar, praiseProfile) }] },
            // Javob berilmagan savolni model shu funksiya orqali bildiradi.
            tools: [{ functionDeclarations: [BAHOLASH_FUNKSIYASI] }],
            // Ikkala tomonning matni ham kerak: doskada yozuv ko'rinib turadi,
            // o'quvchi o'z gapini qanday eshitilganini bilsin.
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
        }));
      });

      yuqori.on('message', (xom) => {
        if (tugadi) return;
        let msg: Record<string, any>;
        try {
          msg = JSON.parse(xom.toString());
        } catch {
          return;
        }

        if (msg.setupComplete) {
          // Qolgan vaqt o'quvchiga ko'rsatiladi — suhbat qachon tugashini
          // bilib tursin, kutilmaganda kesilmasin.
          yubor({ type: 'ready', qolgan: qolganSoniya() });
          // Ustoz suhbatni o'zi boshlaydi — o'quvchi nima deyishni o'ylab
          // qolmasin.
          yuqori?.send(JSON.stringify({
            clientContent: {
              turns: [{ role: 'user', parts: [{ text: 'Suhbatni boshla.' }] }],
              turnComplete: true,
            },
          }));
          return;
        }

        /*
         * Yakunlangan savolni bir marta baholab, navbatdagi raqamni qaytaramiz.
         * Takrorlangan tool chaqiruvi tarixdagi natijani almashtirmasligi kerak.
         */
        if (msg.toolCall?.functionCalls?.length) {
          const javoblar: unknown[] = [];
          for (const fc of msg.toolCall.functionCalls) {
            if (fc?.name === BAHOLASH_FUNKSIYASI.name) {
              const raqam = Number(fc.args?.savol_raqami);
              const togri = fc.args?.togri === true;
              const izoh = String(fc.args?.izoh ?? '');
              const progress = questionProgress.record(raqam, String(fc.args?.savol ?? ''));
              javoblar.push({ id: fc.id, name: fc.name, response: {
                natija: progress.reason,
                keyingi_savol: progress.nextQuestion,
                korsatma: progress.accepted || progress.reason === 'duplicate'
                  ? "Yakunlangan savolni qaytarma. Keyingi hali berilmagan savolga o't. Bu o'quvchi javobi emas."
                  : "Hozirgi savolda QOL. Keyingi savolga o'tma. Xato/bilmayman bo'lsa to'liq namunani darhol o'zing aytib ketma — avval o'quvchini kut; so'ng gapni 2–3 so'zli bo'laklarga bo'lib takrorlat. Har bo'lakdan keyin TO'XTA. Bu o'quvchi javobi emas.",
              } });
              if (!progress.accepted) continue;
              const royxatdagi = savollar[raqam - 1];

              if (royxatdagi) {
                void urinishKutish.then((id) => javobYoz(id, raqam, togri, izoh));
              } else {
                /*
                 * RO'YXATDAN TASHQARI SAVOL.
                 *
                 * Uch daqiqa ichida tayyor savollar tugab, ustoz o'zi yangi
                 * savol beradi. Unga ham javob bera olmasa qaytarish xuddi
                 * shunday ishlashi kerak — aks holda "faqat birinchi oltita
                 * savol muhim" degan bo'lardi.
                 *
                 * Model aytgan kun QABUL QILINMAYDI: u faqat shu suhbatda
                 * ochilgan kunlardan biri bo'lishi mumkin. Aks holda o'quvchi
                 * umuman o'tmagan kunga uloqtirilardi.
                 */
                const aytilganKun = Number(fc.args?.manba_kun);
                const manbaKun = ruxsatKunlar.has(aytilganKun) ? aytilganKun : 0;
                const savolMatni = String(fc.args?.savol ?? '').trim();

                if (savolMatni && manbaKun > 0) {
                  void urinishKutish.then((id) =>
                    qoshimchaSavolYoz(
                      id,
                      savolMatni,
                      manbaKun,
                      ruxsatKunlar.get(manbaKun) ?? '',
                      togri,
                      izoh,
                    ),
                  );
                }
              }
            } else {
              javoblar.push({ id: fc?.id, name: fc?.name, response: { natija: 'unknown_function' } });
            }
          }
          yuqori?.send(JSON.stringify({ toolResponse: { functionResponses: javoblar } }));
          // Audio/text may share this message with the tool call; process both.
        }

        const sc = msg.serverContent;
        if (!sc) return;

        if (sc.interrupted) {
          recordPraise();
          praiseTranscript = '';
          yubor({ type: 'interrupted' });
        }
        if (sc.inputTranscription?.text) {
          yubor({ type: 'text', kim: 'oquvchi', matn: sc.inputTranscription.text });
        }
        if (sc.outputTranscription?.text) {
          const matn = sc.outputTranscription.text;
          praiseTranscript += matn;
          yubor({ type: 'text', kim: 'ustoz', matn });
          /*
           * Bo'laklar BO'SHLIQSIZ ulanadi. Oraga bo'shliq qo'shsak, ikkiga
           * bo'lingan so'z ("ko" + "’rishguncha") uzilib qolar va naqsh
           * topilmasdi — transkript bo'laklari o'z bo'shlig'i bilan keladi.
           */
          ustozMatni = (ustozMatni + matn).slice(-400);
          /*
           * ERTA XAYRLASHISHNI TO'XTATAMIZ.
           *
           * Vaqt hali tugamagan bo'lsa (yakunlash signali yuborilmagan),
           * ustoz xayrlashsa — bu xato. Unga yashirin xabar yuboramiz:
           * xayrlashma, keyingi savolga o't. Xabar ovozga chiqmaydi.
           */
          const yakunSignaliBerildi = Date.now() - boshlanish >= MAX_SESSIYA_MS - YAKUN_OGOH_MS;
          if (
            !yakunSignaliBerildi &&
            tuzatishSoni < MAX_TUZATISH &&
            ERTA_XAYR.test(ustozMatni) &&
            yuqori?.readyState === WebSocket.OPEN
          ) {
            tuzatishSoni += 1;
            ustozMatni = '';
            const qolgan = Math.max(1, Math.round(qolganSoniya() / 60));
            yuqori.send(JSON.stringify({
              clientContent: {
                turns: [{
                  role: 'user',
                  parts: [{
                    text: `Vaqt hali TUGAMADI — yana ${qolgan} daqiqacha bor. `
                      + 'Xayrlashma. Agar takror/bo\'lak mashqida bo\'lsang — o\'quvchini kut, '
                      + 'xato bo\'lsa keyingi savolga o\'tma, gapni bo\'laklab davom et; '
                      + 'aks holda hali berilmagan keyingi savol bilan davom et. Bu xabarni '
                      + 'ovozga chiqarma va u haqda gapirma.',
                  }],
                }],
                turnComplete: true,
              },
            }));
          }
        }
        for (const p of sc.modelTurn?.parts ?? []) {
          if (p.inlineData?.data) yubor({ type: 'audio', data: p.inlineData.data });
        }
        if (sc.turnComplete) {
          recordPraise();
          praiseTranscript = '';
          ustozMatni = '';
          yubor({ type: 'turnComplete' });
        }
      });

      yuqori.on('error', (e: Error) => {
        console.error('[ustozLive] Gemini xatosi:', e.message);
        yubor({ type: 'error', xato: 'Jonli suhbatni ulab bo\'lmadi' });
        tugat('xato');
      });
      yuqori.on('close', () => tugat('gemini yopdi'));
    };

    // --- Brauzerdan keladigan xabarlar ------------------------------------
    klient.on('message', (xom) => {
      sonChaqiruv = Date.now();
      let msg: Record<string, any>;
      try {
        msg = JSON.parse(xom.toString());
      } catch {
        return;
      }

      if (msg.type === 'start') {
        if (yuqori || starting || tugadi) return;
        starting = true;
        void boshla(msg as Boshlash).catch(error => {
          console.error('[ustozLive] Lesson setup failed:', error);
          yubor({ type: 'error', xato: "Jonli suhbatni ulab bo'lmadi" });
          tugat('xato');
        });
        return;
      }

      if (msg.type === 'audio' && typeof msg.data === 'string') {
        if (yuqori?.readyState !== WebSocket.OPEN) return;
        yuqori.send(JSON.stringify({
          realtimeInput: { audio: { data: msg.data, mimeType: 'audio/pcm;rate=16000' } },
        }));
        return;
      }

      if (msg.type === 'end') tugat('o\'quvchi yopdi');
    });

    klient.on('close', () => tugat('ulanish uzildi'));
    klient.on('error', () => tugat('klient xatosi'));
  });

  console.log(`[ustozLive] jonli suhbat tayyor: ${YOL} (${MODEL})`);
}
