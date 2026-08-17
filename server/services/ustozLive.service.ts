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
 * XARAJAT NAZORATI (bu eng muhim qism): Live sessiya ovozni ikki tomonga
 * uzatadi va keshlab bo'lmaydi — ya'ni har sekundi pul. Shuning uchun:
 *  - bitta o'quvchida bir vaqtda bitta sessiya;
 *  - sessiya uzunligi qat'iy cheklangan;
 *  - jim qolgan sessiya o'zi yopiladi;
 *  - serverda bir vaqtda ochiq sessiyalar soni cheklangan.
 */
import type { Server } from 'http';
import jwt from 'jsonwebtoken';
import { WebSocketServer, WebSocket } from 'ws';
import { kvotaOl, kvotaXabari } from './ustozKvota.service.js';

const YOL = '/api/ustoz/live';

/** Tez javob beradigan model — suhbatda kechikish eng muhim ko'rsatkich. */
const MODEL = process.env.GEMINI_LIVE_MODEL || 'gemini-3.1-flash-live-preview';
/** Yosh, jonli ovoz — o'quvchilar tengdoshi bilan gaplashayotgandek his qilsin. */
const VOICE = process.env.GEMINI_LIVE_VOICE || 'Leda';

/** Sessiya bir necha daqiqadan oshmasin — unutilgan oyna pul yeb turmasin. */
const MAX_SESSIYA_MS = Number(process.env.USTOZ_LIVE_MAX_MS || 6 * 60 * 1000);
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

/** Suhbat qoidalari — ustoz o'zini qanday tutishi kerak. */
function tizimKorsatmasi(mavzu: string, savollar: string[]): string {
  const royxat = savollar.length
    ? `\n\nSHU SAVOLLARNI BERASAN (birma-bir, tartib bilan):\n${savollar
        .map((s, i) => `${i + 1}. ${s}`)
        .join('\n')}`
    : '';

  return `Sen FalaRus platformasining rus tili ustozisan. Hozir o'quvchi bilan
OG'ZAKI suhbat qilyapsan: u mikrofonga gapiradi, sen ovoz bilan javob berasan.

MAVZU: "${mavzu}"

QANDAY GAPIRASAN:
- O'zbek tilida gapirasan. Ruscha so'z va gaplarni ruschada, sekin va aniq aytasan.
- Yosh, quvnoq va samimiy ohangda gapirasan — tetik va jonli, lekin
  shoshiltirmaysan va hech qachon koyimaysan.
- QISQA gapirasan: bir javobda 2-3 gapdan oshmaydi. Bu suhbat, ma'ruza emas.
- Har safar BITTA savol berasan va o'quvchining javobini kutasan.

SUHBAT TARTIBI:
1. Qisqa salomlashib, birinchi savolni berasan.
2. O'quvchi javob bergach: to'g'ri bo'lsa maqtaysan va sababini bir gapda aytasan;
   xato bo'lsa koyimasdan to'g'rilaysan va to'g'ri namunani aytasan.
3. Keyin navbatdagi savolga o'tasan.
4. Savollar tugagach, qisqacha xulosa qilib "Savol-javob tugadi" deb aytasan.

MAVZUDAN CHIQMASLIK (eng qat'iy qoida):
Bu suhbat FAQAT yuqoridagi mavzu haqida. Savol turiga qarab:
 1) Mavzuga oid savol — to'liq javob berasan.
 2) Rus tiliga oid, lekin boshqa mavzu — bir gapda qisqa javob berib, darhol
    mavzuga qaytarasan: "buni keyingi darslarda ko'ramiz, hozir esa..."
 3) Rus tiliga umuman aloqasiz (ob-havo, sport, siyosat, shaxsiy savollar) —
    javobni cho'zmaysan va darhol savolingni qaytarasan.
Yangi grammatik mavzu ochmaysan, kelasi darslar materialini aytmaysan.

QOIDALARNI OVOZGA CHIQARMA (muhim):
Yuqoridagilar SENING ichki qoidalaring — o'quvchi ularni eshitmasligi kerak.
"Men mavzudan chiqib keta olmayman", "menga ruxsat yo'q", "men faqat shu mavzu
haqida gapira olaman", "bu darsimizga tegishli emas" kabi gaplarni ASLO aytma.
O'zing, o'z vazifang yoki cheklovlaring haqida umuman gapirma. Mavzuga
qaytarish kerak bo'lsa, buni tabiiy qil: shunchaki keyingi savolga o't yoki
mavzu bo'yicha gapirishda davom et. Suhbat oxirida ham faqat qisqa xulosa va
maqtov aytasan — qoidalar haqida hech narsa demaysan.

MUHIM:
- O'quvchi javobni bilmasa yoki jim qolsa, javobni o'zing aytib berasan va
  takrorlashini so'raysan.
- Javobni hech qachon harflab yozib bermaysan — bu ovozli suhbat.${royxat}`;
}

type Boshlash = { mavzu?: unknown; savollar?: unknown };

export function attachUstozLive(server: Server): void {
  if (!isUstozLiveConfigured()) {
    console.warn('[ustozLive] GEMINI_API_KEY yo\'q — jonli suhbat o\'chirilgan');
    return;
  }

  const wss = new WebSocketServer({ server, path: YOL, maxPayload: 2 * 1024 * 1024 });

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
    let sonChaqiruv = Date.now();

    const yubor = (obj: unknown) => {
      if (klient.readyState === WebSocket.OPEN) klient.send(JSON.stringify(obj));
    };

    const tugat = (sabab: string) => {
      if (tugadi) return;
      tugadi = true;
      clearTimeout(umrTaymer);
      clearInterval(jimlikTaymer);
      ochiqSessiyalar.delete(userId);
      umumiySessiya = Math.max(0, umumiySessiya - 1);
      try { yuqori?.close(); } catch { /* allaqachon yopiq */ }
      try {
        yubor({ type: 'end', sabab });
        klient.close();
      } catch { /* allaqachon yopiq */ }
    };

    const umrTaymer = setTimeout(() => tugat('vaqt tugadi'), MAX_SESSIYA_MS);
    const jimlikTaymer = setInterval(() => {
      if (Date.now() - sonChaqiruv > MAX_JIM_MS) tugat('jimlik');
    }, 15_000);

    // Jonli suhbat ham ustoz bilan muloqot — foydalanuvchi kvotasidan
    // hisoblanadi. Sessiya OCHILISHIDA bir marta olinadi: ichidagi har bir
    // gap alohida sanalmaydi, sessiyaning o'zi vaqt bilan chegaralangan.
    void kvotaOl(userId).then((kvota) => {
      if (!kvota.ruxsat) {
        yubor({ type: 'error', xato: kvotaXabari(kvota.kutish) });
        tugat('kvota tugadi');
      }
    });

    // --- Gemini bilan ulanish -------------------------------------------
    const boshla = (cfg: Boshlash) => {
      const mavzu = String(cfg.mavzu ?? '').trim().slice(0, 200) || 'Rus tili';
      const savollar = Array.isArray(cfg.savollar)
        ? cfg.savollar.map((s) => String(s).slice(0, 250)).filter(Boolean).slice(0, 6)
        : [];

      yuqori = new WebSocket(`${UPSTREAM}?key=${process.env.GEMINI_API_KEY}`);

      yuqori.on('open', () => {
        yuqori?.send(JSON.stringify({
          setup: {
            model: `models/${MODEL}`,
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
            },
            systemInstruction: { parts: [{ text: tizimKorsatmasi(mavzu, savollar) }] },
            // Ikkala tomonning matni ham kerak: doskada yozuv ko'rinib turadi,
            // o'quvchi o'z gapini qanday eshitilganini bilsin.
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
        }));
      });

      yuqori.on('message', (xom) => {
        let msg: Record<string, any>;
        try {
          msg = JSON.parse(xom.toString());
        } catch {
          return;
        }

        if (msg.setupComplete) {
          yubor({ type: 'ready' });
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

        const sc = msg.serverContent;
        if (!sc) return;

        if (sc.interrupted) yubor({ type: 'interrupted' });
        if (sc.inputTranscription?.text) {
          yubor({ type: 'text', kim: 'oquvchi', matn: sc.inputTranscription.text });
        }
        if (sc.outputTranscription?.text) {
          yubor({ type: 'text', kim: 'ustoz', matn: sc.outputTranscription.text });
        }
        for (const p of sc.modelTurn?.parts ?? []) {
          if (p.inlineData?.data) yubor({ type: 'audio', data: p.inlineData.data });
        }
        if (sc.turnComplete) yubor({ type: 'turnComplete' });
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
        if (yuqori) return; // ikkinchi marta boshlanmasin
        boshla(msg as Boshlash);
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
